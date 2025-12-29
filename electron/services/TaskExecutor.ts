import { shell } from 'electron'
import { spawn, exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import type { Task } from '../../src/types'

const execAsync = promisify(exec)
const fsAccess = promisify(fs.access)
const fsReaddir = promisify(fs.readdir)
const fsStat = promisify(fs.stat)

// Action types that MILO can take on a task
export type TaskActionType = 'claude_code' | 'claude_web' | 'research' | 'manual'

// Execution targets for the new modal-based flow
export type ExecutionTarget = 'claude_web' | 'claude_cli' | 'claude_desktop'

export interface TaskActionPlan {
    actionType: TaskActionType
    prompt: string
    projectPath?: string | null
    searchQueries?: string[]
    reasoning: string
}

export interface ExecutionResult {
    success: boolean
    actionType: TaskActionType
    message: string
    error?: string
}

// Common directories to search for projects
const PROJECT_DIRECTORIES = [
    '~/Development',
    '~/Projects',
    '~/Code',
    '~/dev',
    '~/repos',
    '~/work',
]

// Possible Claude CLI locations
const CLAUDE_CLI_PATHS = [
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
    '~/.local/bin/claude',
    '/usr/bin/claude',
]

/**
 * TaskExecutor handles the execution of tasks by launching the appropriate tools
 */
export class TaskExecutor {
    private claudeCliPath: string | null = null
    private discoveredProjects: string[] = []

    /**
     * Initialize the executor by detecting available tools
     */
    async initialize(): Promise<void> {
        await this.findClaudeCli()
        await this.discoverProjects()
        console.log('[TaskExecutor] Initialized')
        console.log('[TaskExecutor] Claude CLI:', this.claudeCliPath || 'not found')
        console.log('[TaskExecutor] Projects discovered:', this.discoveredProjects.length)
    }

    /**
     * Detect Claude CLI location
     */
    async findClaudeCli(): Promise<string | null> {
        // First, try the 'which' command
        try {
            const { stdout } = await execAsync('which claude')
            const cliPath = stdout.trim()
            if (cliPath) {
                this.claudeCliPath = cliPath
                return cliPath
            }
        } catch {
            // which command failed, try known paths
        }

        // Try known paths
        for (const possiblePath of CLAUDE_CLI_PATHS) {
            const expandedPath = possiblePath.replace('~', process.env.HOME || '')
            try {
                await fsAccess(expandedPath, fs.constants.X_OK)
                this.claudeCliPath = expandedPath
                return expandedPath
            } catch {
                // Path doesn't exist or isn't executable
            }
        }

        console.log('[TaskExecutor] Claude CLI not found')
        return null
    }

    /**
     * Discover project directories on the system
     */
    async discoverProjects(): Promise<string[]> {
        const projects: string[] = []

        for (const dir of PROJECT_DIRECTORIES) {
            const expandedDir = dir.replace('~', process.env.HOME || '')
            try {
                const entries = await fsReaddir(expandedDir)

                for (const entry of entries) {
                    const fullPath = path.join(expandedDir, entry)
                    try {
                        const stat = await fsStat(fullPath)
                        if (stat.isDirectory() && !entry.startsWith('.')) {
                            // Check if it looks like a project (has common project files)
                            const isProject = await this.isProjectDirectory(fullPath)
                            if (isProject) {
                                projects.push(fullPath)
                            }
                        }
                    } catch {
                        // Couldn't stat entry
                    }
                }
            } catch {
                // Directory doesn't exist or isn't readable
            }
        }

        this.discoveredProjects = projects
        return projects
    }

    /**
     * Check if a directory looks like a project
     */
    private async isProjectDirectory(dirPath: string): Promise<boolean> {
        const projectIndicators = [
            'package.json',
            'Cargo.toml',
            'pyproject.toml',
            'requirements.txt',
            'go.mod',
            '.git',
            'pom.xml',
            'build.gradle',
            'Gemfile',
            'composer.json',
        ]

        for (const indicator of projectIndicators) {
            try {
                await fsAccess(path.join(dirPath, indicator))
                return true
            } catch {
                // Indicator not found
            }
        }
        return false
    }

    /**
     * Get list of discovered projects
     */
    getProjects(): string[] {
        return this.discoveredProjects
    }

    /**
     * Check if Claude CLI is available
     */
    hasClaudeCli(): boolean {
        return this.claudeCliPath !== null
    }

    /**
     * Execute a task based on the action plan
     */
    async execute(plan: TaskActionPlan, task: Task): Promise<ExecutionResult> {
        console.log('[TaskExecutor] Executing task:', task.title)
        console.log('[TaskExecutor] Action type:', plan.actionType)

        switch (plan.actionType) {
            case 'claude_code':
                return await this.launchClaudeCode(plan.prompt, plan.projectPath || null)

            case 'claude_web':
                return await this.launchClaudeWeb(plan.prompt)

            case 'research':
                return await this.launchResearch(plan.searchQueries || [plan.prompt])

            case 'manual':
                return {
                    success: true,
                    actionType: 'manual',
                    message: 'Task marked as active. This task requires manual execution.',
                }

            default:
                return {
                    success: false,
                    actionType: plan.actionType,
                    message: 'Unknown action type',
                    error: `Action type '${plan.actionType}' is not supported`,
                }
        }
    }

    /**
     * Launch Claude Code CLI with the given prompt
     */
    private async launchClaudeCode(prompt: string, projectPath: string | null): Promise<ExecutionResult> {
        if (!this.claudeCliPath) {
            return {
                success: false,
                actionType: 'claude_code',
                message: 'Claude CLI not found',
                error: 'Please install Claude CLI (claude) to use this feature',
            }
        }

        const cwd = projectPath || process.env.HOME || '/'

        try {
            // Launch Claude Code in a new terminal window on macOS
            // We use osascript to open a new Terminal window with the claude command
            const escapedPrompt = prompt.replace(/"/g, '\\"').replace(/'/g, "'\\''")
            const escapedCwd = cwd.replace(/"/g, '\\"')

            const script = `
        tell application "Terminal"
          activate
          do script "cd \\"${escapedCwd}\\" && ${this.claudeCliPath} \\"${escapedPrompt}\\""
        end tell
      `

            await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`)

            return {
                success: true,
                actionType: 'claude_code',
                message: `Launched Claude Code in ${cwd}`,
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            console.error('[TaskExecutor] Failed to launch Claude Code:', errorMessage)

            return {
                success: false,
                actionType: 'claude_code',
                message: 'Failed to launch Claude Code',
                error: errorMessage,
            }
        }
    }

    /**
     * Launch Claude Web with the given prompt
     */
    private async launchClaudeWeb(prompt: string): Promise<ExecutionResult> {
        try {
            // Claude.ai doesn't support URL-based prompts directly,
            // so we copy the prompt to clipboard and open claude.ai for the user to paste

            // Copy prompt to clipboard using pbcopy on macOS
            const child = spawn('pbcopy', [], { stdio: 'pipe' })
            child.stdin?.write(prompt)
            child.stdin?.end()

            await new Promise<void>((resolve, reject) => {
                child.on('close', (code) => {
                    if (code === 0) resolve()
                    else reject(new Error(`pbcopy exited with code ${code}`))
                })
            })

            // Open Claude.ai
            await shell.openExternal('https://claude.ai/new')

            return {
                success: true,
                actionType: 'claude_web',
                message: 'Opened Claude.ai - prompt copied to clipboard (Cmd+V to paste)',
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            console.error('[TaskExecutor] Failed to launch Claude Web:', errorMessage)

            return {
                success: false,
                actionType: 'claude_web',
                message: 'Failed to open Claude.ai',
                error: errorMessage,
            }
        }
    }

    /**
     * Launch research with Perplexity for the given queries
     */
    private async launchResearch(queries: string[]): Promise<ExecutionResult> {
        try {
            // Use the first query for Perplexity search
            const query = queries[0] || 'research'
            const encodedQuery = encodeURIComponent(query)

            // Open Perplexity with the search query
            await shell.openExternal(`https://www.perplexity.ai/search?q=${encodedQuery}`)

            return {
                success: true,
                actionType: 'research',
                message: `Opened Perplexity search for: "${query}"`,
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            console.error('[TaskExecutor] Failed to launch research:', errorMessage)

            return {
                success: false,
                actionType: 'research',
                message: 'Failed to open Perplexity',
                error: errorMessage,
            }
        }
    }

    // ============================
    // New Modal-Based Execution Methods
    // ============================

    /**
     * Execute task with user-selected target
     * This is the new modal-based flow where user chooses the execution target
     */
    async executeWithTarget(
        target: ExecutionTarget,
        prompt: string,
        projectPath: string | null = null
    ): Promise<ExecutionResult> {
        console.log('[TaskExecutor] Executing with target:', target)
        console.log('[TaskExecutor] Project path:', projectPath)

        switch (target) {
            case 'claude_web':
                return await this.launchClaudeWeb(prompt)

            case 'claude_cli':
                return await this.launchClaudeCliInITerm(prompt, projectPath)

            case 'claude_desktop':
                return await this.launchClaudeDesktop(prompt)

            default:
                return {
                    success: false,
                    actionType: 'manual',
                    message: 'Unknown execution target',
                    error: `Target '${target}' is not supported`,
                }
        }
    }

    /**
     * Launch Claude CLI in iTerm2 (preferred terminal for macOS)
     */
    private async launchClaudeCliInITerm(
        prompt: string,
        projectPath: string | null
    ): Promise<ExecutionResult> {
        if (!this.claudeCliPath) {
            return {
                success: false,
                actionType: 'claude_code',
                message: 'Claude CLI not found',
                error: 'Please install Claude CLI (claude) to use this feature',
            }
        }

        const cwd = projectPath || process.env.HOME || '/'

        try {
            // Check if iTerm2 is installed
            const hasITerm = await this.checkAppExists('iTerm')

            if (hasITerm) {
                // Use iTerm2 (preferred)
                const escapedPrompt = prompt.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
                const escapedCwd = cwd.replace(/\\/g, '\\\\').replace(/"/g, '\\"')

                const script = `
                    tell application "iTerm"
                        activate
                        create window with default profile
                        tell current session of current window
                            write text "cd \\"${escapedCwd}\\" && ${this.claudeCliPath} \\"${escapedPrompt}\\""
                        end tell
                    end tell
                `

                await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`)
            } else {
                // Fallback to Terminal.app
                const escapedPrompt = prompt.replace(/"/g, '\\"').replace(/'/g, "'\\''")
                const escapedCwd = cwd.replace(/"/g, '\\"')

                const script = `
                    tell application "Terminal"
                        activate
                        do script "cd \\"${escapedCwd}\\" && ${this.claudeCliPath} \\"${escapedPrompt}\\""
                    end tell
                `

                await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`)
            }

            return {
                success: true,
                actionType: 'claude_code',
                message: `Launched Claude CLI in ${hasITerm ? 'iTerm2' : 'Terminal'} at ${cwd}`,
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            console.error('[TaskExecutor] Failed to launch Claude CLI:', errorMessage)

            return {
                success: false,
                actionType: 'claude_code',
                message: 'Failed to launch Claude CLI',
                error: errorMessage,
            }
        }
    }

    /**
     * Launch Claude Desktop app with prompt
     */
    private async launchClaudeDesktop(prompt: string): Promise<ExecutionResult> {
        try {
            // First, copy the prompt to clipboard
            const child = spawn('pbcopy', [], { stdio: 'pipe' })
            child.stdin?.write(prompt)
            child.stdin?.end()

            await new Promise<void>((resolve, reject) => {
                child.on('close', (code) => {
                    if (code === 0) resolve()
                    else reject(new Error(`pbcopy exited with code ${code}`))
                })
            })

            // Check if Claude Desktop is installed
            const hasClaudeDesktop = await this.checkAppExists('Claude')

            if (!hasClaudeDesktop) {
                return {
                    success: false,
                    actionType: 'claude_web',
                    message: 'Claude Desktop not found',
                    error: 'Claude Desktop app is not installed. Please install it from claude.ai/download',
                }
            }

            // Open Claude Desktop app
            await execAsync('open -a "Claude"')

            // Give the app time to activate, then paste
            await new Promise(resolve => setTimeout(resolve, 500))

            // Simulate Cmd+V to paste (user can also paste manually)
            // Note: This requires accessibility permissions, so we'll just notify the user
            const script = `
                tell application "Claude" to activate
                delay 0.3
                tell application "System Events"
                    keystroke "v" using command down
                end tell
            `

            try {
                await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`)
            } catch {
                // If paste fails (accessibility permissions), user can paste manually
                console.log('[TaskExecutor] Auto-paste failed, user can paste manually with Cmd+V')
            }

            return {
                success: true,
                actionType: 'claude_web',
                message: 'Opened Claude Desktop - prompt copied to clipboard (Cmd+V to paste if needed)',
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            console.error('[TaskExecutor] Failed to launch Claude Desktop:', errorMessage)

            return {
                success: false,
                actionType: 'claude_web',
                message: 'Failed to launch Claude Desktop',
                error: errorMessage,
            }
        }
    }

    /**
     * Check if an app exists on macOS
     */
    private async checkAppExists(appName: string): Promise<boolean> {
        try {
            await execAsync(`mdfind "kMDItemKind == 'Application'" | grep -i "${appName}.app"`)
            return true
        } catch {
            return false
        }
    }

    /**
     * Generate a smart prompt for a task with full context
     */
    async generateTaskPrompt(task: Task, projectPath?: string | null): Promise<string> {
        const parts: string[] = []

        // Task title and description
        parts.push(`## Task: ${task.title}`)

        if (task.description) {
            parts.push(`\n### Description\n${task.description}`)
        }

        if (task.rationale) {
            parts.push(`\n### Why This Matters\n${task.rationale}`)
        }

        // Context from related data
        if (task.priority) {
            const priorityLabel =
                task.priority >= 4 ? 'URGENT' :
                    task.priority >= 3 ? 'High' :
                        task.priority >= 2 ? 'Medium' : 'Low'
            parts.push(`\n### Priority: ${priorityLabel} (P${task.priority})`)
        }

        if (task.estimatedDays) {
            parts.push(`\n### Estimated Effort: ~${task.estimatedDays} day${task.estimatedDays > 1 ? 's' : ''}`)
        }

        // Project context if available
        if (projectPath) {
            parts.push(`\n### Working Directory\n\`${projectPath}\``)
        }

        // Expected output section
        parts.push(`\n### Expected Output`)
        parts.push(`Please complete this task and provide:`)
        parts.push(`1. A summary of what was accomplished`)
        parts.push(`2. Any files that were created or modified`)
        parts.push(`3. Next steps or follow-up items (if any)`)

        // Status indicator
        if (task.status === 'in_progress') {
            parts.push(`\n### Status: Already In Progress`)
            if (task.daysWorked) {
                parts.push(`You have already worked on this for ${task.daysWorked} day${task.daysWorked > 1 ? 's' : ''}.`)
            }
        }

        return parts.join('\n')
    }

    /**
     * Find the best project path for a task based on its category
     */
    async findProjectForTask(task: Task): Promise<string | null> {
        // If task has a category, try to match it to a discovered project
        // This is a simple heuristic - can be enhanced with more sophisticated matching
        if (!task.categoryId) {
            return null
        }

        // For now, just return the first discovered project that might match
        // In a real implementation, we'd match category names to project names
        const projects = this.getProjects()

        // Look for a project whose name contains keywords from the task
        const taskWords = task.title.toLowerCase().split(/\s+/)

        for (const project of projects) {
            const projectName = path.basename(project).toLowerCase()
            if (taskWords.some(word => projectName.includes(word))) {
                return project
            }
        }

        return projects[0] || null // Default to first project if no match
    }
}

// Singleton instance
export const taskExecutor = new TaskExecutor()
