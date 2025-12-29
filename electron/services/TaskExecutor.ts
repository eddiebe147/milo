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
}

// Singleton instance
export const taskExecutor = new TaskExecutor()
