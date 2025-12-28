# MILO Technical Design Document
## Mission Intelligence Life Operator

**Document Version:** 1.0
**Last Updated:** December 28, 2024
**Author:** Eddie Belaval / ID8Labs
**Status:** Draft

---

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Technology Stack](#technology-stack)
3. [Data Models](#data-models)
4. [Component Design](#component-design)
5. [API Design](#api-design)
6. [Integration Architecture](#integration-architecture)
7. [State Management](#state-management)
8. [Security Design](#security-design)
9. [Performance Considerations](#performance-considerations)
10. [Development Phases](#development-phases)
11. [Testing Strategy](#testing-strategy)

---

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ELECTRON SHELL                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    MAIN PROCESS                            │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐  │  │
│  │  │   Tray      │ │  Windows    │ │   IPC Handlers      │  │  │
│  │  │   Manager   │ │  Manager    │ │   (Bridge)          │  │  │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘  │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐  │  │
│  │  │  Activity   │ │  Scheduler  │ │   Native APIs       │  │  │
│  │  │  Monitor    │ │  (Cron)     │ │   (macOS)           │  │  │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                         [IPC Bridge]                             │
│                              │                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   RENDERER PROCESS                         │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │                 REACT APPLICATION                    │  │  │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────┐  │  │  │
│  │  │  │Dashboard│ │Morning  │ │Evening  │ │ Settings  │  │  │  │
│  │  │  │  View   │ │Briefing │ │ Review  │ │   View    │  │  │  │
│  │  │  └─────────┘ └─────────┘ └─────────┘ └───────────┘  │  │  │
│  │  │  ┌─────────────────────────────────────────────────┐│  │  │
│  │  │  │              Zustand State Stores               ││  │  │
│  │  │  │  Goals │ Tasks │ Activity │ Scores │ Settings   ││  │  │
│  │  │  └─────────────────────────────────────────────────┘│  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│    SQLite     │    │  Claude API   │    │ MCP Servers   │
│  (Local DB)   │    │  (AI Engine)  │    │ (Integrations)│
└───────────────┘    └───────────────┘    └───────────────┘
```

### 1.2 Process Architecture

#### Main Process Responsibilities
- Window management (Dashboard, Settings, Dialogs)
- System tray management
- Activity monitoring (macOS native APIs)
- Scheduled tasks (morning/evening triggers)
- Database operations (SQLite)
- MCP client connections
- IPC message handling

#### Renderer Process Responsibilities
- React UI rendering
- State management (Zustand)
- User interactions
- API communication via IPC
- Real-time UI updates

### 1.3 Directory Structure

```
milo/
├── package.json
├── electron.vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
│
├── electron/                      # Main Process
│   ├── main.ts                    # Electron entry point
│   ├── preload.ts                 # Context bridge
│   │
│   ├── windows/                   # Window management
│   │   ├── WindowManager.ts
│   │   ├── DashboardWindow.ts
│   │   └── DialogWindow.ts
│   │
│   ├── tray/                      # System tray
│   │   └── TrayManager.ts
│   │
│   ├── ipc/                       # IPC handlers
│   │   ├── index.ts
│   │   ├── goals.ipc.ts
│   │   ├── tasks.ipc.ts
│   │   ├── activity.ipc.ts
│   │   ├── scoring.ipc.ts
│   │   ├── ai.ipc.ts
│   │   └── mcp.ipc.ts
│   │
│   ├── services/                  # Main process services
│   │   ├── ActivityMonitor.ts
│   │   ├── StateDetector.ts
│   │   ├── Scheduler.ts
│   │   ├── NudgeManager.ts
│   │   └── ScoringEngine.ts
│   │
│   ├── database/                  # SQLite operations
│   │   ├── db.ts
│   │   ├── migrations/
│   │   └── repositories/
│   │       ├── GoalRepository.ts
│   │       ├── TaskRepository.ts
│   │       ├── ActivityRepository.ts
│   │       └── ScoreRepository.ts
│   │
│   ├── mcp/                       # MCP clients
│   │   ├── MCPManager.ts
│   │   ├── NotionClient.ts
│   │   ├── CalendarClient.ts
│   │   └── NotesClient.ts
│   │
│   └── ai/                        # Claude API
│       ├── ClaudeClient.ts
│       ├── prompts/
│       │   ├── morning.ts
│       │   ├── evening.ts
│       │   └── system.ts
│       └── parsers/
│           └── TaskParser.ts
│
├── src/                           # Renderer Process
│   ├── main.tsx                   # React entry
│   ├── App.tsx                    # Root component
│   │
│   ├── components/
│   │   ├── Dashboard/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── MissionPanel.tsx
│   │   │   ├── TaskList.tsx
│   │   │   ├── StateIndicator.tsx
│   │   │   ├── StatsPanel.tsx
│   │   │   └── QuickCapture.tsx
│   │   │
│   │   ├── Dialogs/
│   │   │   ├── MorningBriefing/
│   │   │   │   ├── MorningBriefing.tsx
│   │   │   │   ├── TaskCard.tsx
│   │   │   │   └── ConfirmMission.tsx
│   │   │   │
│   │   │   └── EveningReview/
│   │   │       ├── EveningReview.tsx
│   │   │       ├── CompletionChecklist.tsx
│   │   │       ├── ReflectionPrompts.tsx
│   │   │       └── ScoreDisplay.tsx
│   │   │
│   │   ├── Onboarding/
│   │   │   ├── OnboardingFlow.tsx
│   │   │   ├── BeaconSetup.tsx
│   │   │   ├── MilestoneSetup.tsx
│   │   │   └── ObjectiveSetup.tsx
│   │   │
│   │   ├── Goals/
│   │   │   ├── GoalHierarchy.tsx
│   │   │   ├── BeaconCard.tsx
│   │   │   ├── MilestoneCard.tsx
│   │   │   └── ObjectiveCard.tsx
│   │   │
│   │   ├── Stats/
│   │   │   ├── StatsView.tsx
│   │   │   ├── ScoreChart.tsx
│   │   │   ├── StreakDisplay.tsx
│   │   │   └── PatternInsights.tsx
│   │   │
│   │   ├── Settings/
│   │   │   ├── SettingsView.tsx
│   │   │   ├── ScheduleSettings.tsx
│   │   │   ├── AppCategories.tsx
│   │   │   └── IntegrationSettings.tsx
│   │   │
│   │   └── ui/                    # Pip-Boy components
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Input.tsx
│   │       ├── Dialog.tsx
│   │       ├── Progress.tsx
│   │       ├── Badge.tsx
│   │       ├── CRTOverlay.tsx
│   │       └── GlowText.tsx
│   │
│   ├── hooks/
│   │   ├── useGoals.ts
│   │   ├── useTasks.ts
│   │   ├── useActivity.ts
│   │   ├── useScore.ts
│   │   ├── useSettings.ts
│   │   └── useIPC.ts
│   │
│   ├── stores/
│   │   ├── goalStore.ts
│   │   ├── taskStore.ts
│   │   ├── activityStore.ts
│   │   ├── scoreStore.ts
│   │   └── settingsStore.ts
│   │
│   ├── lib/
│   │   ├── ipc.ts                 # IPC client helpers
│   │   ├── formatters.ts
│   │   └── constants.ts
│   │
│   └── styles/
│       ├── globals.css
│       ├── pipboy.css             # CRT effects
│       └── animations.css
│
├── resources/                     # Static assets
│   ├── icons/
│   │   ├── tray-green.png
│   │   ├── tray-amber.png
│   │   ├── tray-red.png
│   │   └── app-icon.icns
│   └── fonts/
│       └── ShareTechMono.ttf
│
├── prisma/                        # Or direct SQLite
│   └── schema.prisma
│
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

---

## 2. Technology Stack

### 2.1 Core Technologies

| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| **Runtime** | Electron | 28.x | Cross-platform desktop, native APIs |
| **UI Framework** | React | 18.x | Component model, ecosystem |
| **Language** | TypeScript | 5.x | Type safety, DX |
| **Bundler** | electron-vite | 2.x | Fast builds, ESM support |
| **Styling** | TailwindCSS | 3.x | Utility-first, custom theme |
| **State** | Zustand | 4.x | Simple, performant |
| **Database** | better-sqlite3 | 9.x | Fast, synchronous, embedded |
| **AI** | Claude API | - | Intelligence layer |
| **Integrations** | MCP SDK | 1.x | Notion, Calendar, Notes |

### 2.2 Development Dependencies

```json
{
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.0",
    "electron": "^28.0.0",
    "electron-builder": "^24.0.0",
    "electron-vite": "^2.0.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0",
    "playwright": "^1.40.0"
  }
}
```

### 2.3 Runtime Dependencies

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.14.0",
    "@modelcontextprotocol/sdk": "^1.0.0",
    "better-sqlite3": "^9.2.0",
    "date-fns": "^3.0.0",
    "electron-store": "^8.1.0",
    "lucide-react": "^0.300.0",
    "nanoid": "^5.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "recharts": "^2.10.0",
    "zustand": "^4.4.0",
    "zod": "^3.22.0",
    "active-win": "^8.1.0"
  }
}
```

---

## 3. Data Models

### 3.1 SQLite Schema

```sql
-- Goals Hierarchy
CREATE TABLE beacons (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    timeframe TEXT CHECK(timeframe IN ('1-year', '3-year', '5-year')),
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'archived')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE milestones (
    id TEXT PRIMARY KEY,
    beacon_id TEXT NOT NULL REFERENCES beacons(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    target_date DATE,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'archived')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE objectives (
    id TEXT PRIMARY KEY,
    milestone_id TEXT NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    week_of DATE NOT NULL,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tasks
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    objective_id TEXT REFERENCES objectives(id) ON DELETE SET NULL,
    source TEXT NOT NULL CHECK(source IN ('notion', 'calendar', 'notes', 'manual', 'analog')),
    source_id TEXT,
    priority TEXT DEFAULT 'maintenance' CHECK(priority IN ('signal', 'maintenance', 'noise')),
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'deferred', 'cancelled')),
    due_date DATE,
    is_signal_task BOOLEAN DEFAULT FALSE,
    signal_date DATE,  -- Date when marked as signal task
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_signal_date ON tasks(signal_date);
CREATE INDEX idx_tasks_status ON tasks(status);

-- Activity Tracking
CREATE TABLE activity_logs (
    id TEXT PRIMARY KEY,
    timestamp DATETIME NOT NULL,
    app_name TEXT NOT NULL,
    window_title TEXT,
    bundle_id TEXT,
    state TEXT NOT NULL CHECK(state IN ('green', 'amber', 'red')),
    task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
    duration_seconds INTEGER DEFAULT 5,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_timestamp ON activity_logs(timestamp);
CREATE INDEX idx_activity_state ON activity_logs(state);

-- App Categories (for state detection)
CREATE TABLE app_categories (
    id TEXT PRIMARY KEY,
    bundle_id TEXT UNIQUE NOT NULL,
    app_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('work', 'ambiguous', 'distractor')),
    custom BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Daily Scores
CREATE TABLE daily_scores (
    id TEXT PRIMARY KEY,
    date DATE UNIQUE NOT NULL,
    completion_score REAL NOT NULL,
    focus_score REAL NOT NULL,
    noise_score REAL NOT NULL,
    bonus_score REAL NOT NULL,
    total_score REAL NOT NULL,
    signal_tasks_completed INTEGER NOT NULL,
    signal_tasks_total INTEGER NOT NULL,
    green_minutes INTEGER NOT NULL,
    amber_minutes INTEGER NOT NULL,
    red_minutes INTEGER NOT NULL,
    streak INTEGER DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scores_date ON daily_scores(date);

-- Settings
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Nudge History
CREATE TABLE nudge_history (
    id TEXT PRIMARY KEY,
    timestamp DATETIME NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('drift', 'reminder', 'encouragement')),
    message TEXT NOT NULL,
    response TEXT CHECK(response IN ('acknowledged', 'snoozed', 'dismissed', 'ignored')),
    responded_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 TypeScript Interfaces

```typescript
// src/types/goals.ts
export interface Beacon {
  id: string;
  title: string;
  description?: string;
  timeframe: '1-year' | '3-year' | '5-year';
  status: 'active' | 'completed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  milestones?: Milestone[];
}

export interface Milestone {
  id: string;
  beaconId: string;
  title: string;
  description?: string;
  targetDate?: Date;
  status: 'active' | 'completed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  objectives?: Objective[];
}

export interface Objective {
  id: string;
  milestoneId: string;
  title: string;
  weekOf: Date;
  status: 'active' | 'completed';
  createdAt: Date;
  updatedAt: Date;
  tasks?: Task[];
}

// src/types/tasks.ts
export type TaskSource = 'notion' | 'calendar' | 'notes' | 'manual' | 'analog';
export type TaskPriority = 'signal' | 'maintenance' | 'noise';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'deferred' | 'cancelled';

export interface Task {
  id: string;
  title: string;
  description?: string;
  objectiveId?: string;
  source: TaskSource;
  sourceId?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: Date;
  isSignalTask: boolean;
  signalDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Computed/joined fields
  objective?: Objective;
  goalChain?: GoalChain;
}

export interface GoalChain {
  beacon: Pick<Beacon, 'id' | 'title'>;
  milestone: Pick<Milestone, 'id' | 'title'>;
  objective: Pick<Objective, 'id' | 'title'>;
}

// src/types/activity.ts
export type ActivityState = 'green' | 'amber' | 'red';
export type AppCategory = 'work' | 'ambiguous' | 'distractor';

export interface ActivityLog {
  id: string;
  timestamp: Date;
  appName: string;
  windowTitle?: string;
  bundleId?: string;
  state: ActivityState;
  taskId?: string;
  durationSeconds: number;
}

export interface AppCategoryConfig {
  id: string;
  bundleId: string;
  appName: string;
  category: AppCategory;
  custom: boolean;
}

export interface CurrentActivity {
  appName: string;
  windowTitle?: string;
  bundleId?: string;
  state: ActivityState;
  stateSince: Date;
  currentTask?: Task;
}

// src/types/scoring.ts
export interface DailyScore {
  id: string;
  date: Date;
  completionScore: number;  // 0-40
  focusScore: number;       // 0-30
  noiseScore: number;       // 0-20
  bonusScore: number;       // 0-10
  totalScore: number;       // 0-100
  signalTasksCompleted: number;
  signalTasksTotal: number;
  greenMinutes: number;
  amberMinutes: number;
  redMinutes: number;
  streak: number;
  notes?: string;
}

export interface ScoreBreakdown {
  completion: {
    score: number;
    completed: number;
    total: number;
    percentage: number;
  };
  focus: {
    score: number;
    greenMinutes: number;
    totalMinutes: number;
    percentage: number;
  };
  noise: {
    score: number;
    redMinutes: number;
    totalMinutes: number;
    percentage: number;
  };
  bonus: {
    score: number;
    details: string[];
  };
}

// src/types/settings.ts
export interface AppSettings {
  morningBriefingTime: string;  // HH:mm format
  eveningReviewTime: string;
  driftThresholdMinutes: number;
  workHoursStart: string;
  workHoursEnd: string;
  enableNudges: boolean;
  streakThreshold: number;  // Minimum score to maintain streak

  // Integrations
  notionConnected: boolean;
  notionDatabaseId?: string;
  calendarConnected: boolean;
  notesConnected: boolean;

  // UI preferences
  alwaysOnTop: boolean;
  showInMenuBar: boolean;
  dashboardOpacity: number;
}
```

---

## 4. Component Design

### 4.1 Main Process Components

#### 4.1.1 ActivityMonitor

```typescript
// electron/services/ActivityMonitor.ts
import { EventEmitter } from 'events';
import activeWin from 'active-win';

interface ActiveWindow {
  appName: string;
  windowTitle: string;
  bundleId: string;
}

/**
 * ActivityMonitor polls the active window every N seconds
 * and emits events when the active application changes.
 *
 * Uses the `active-win` npm package which provides a safe,
 * cross-platform way to get active window information without
 * shell injection vulnerabilities.
 */
export class ActivityMonitor extends EventEmitter {
  private pollInterval: NodeJS.Timer | null = null;
  private lastActivity: ActiveWindow | null = null;
  private isPaused: boolean = false;

  constructor(private pollIntervalMs: number = 5000) {
    super();
  }

  start(): void {
    if (this.pollInterval) return;

    this.pollInterval = setInterval(() => {
      if (!this.isPaused) {
        this.pollActiveWindow();
      }
    }, this.pollIntervalMs);

    // Initial poll
    this.pollActiveWindow();
  }

  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }

  private async pollActiveWindow(): Promise<void> {
    try {
      const window = await this.getActiveWindow();

      if (window && this.hasActivityChanged(window)) {
        this.lastActivity = window;
        this.emit('activity', window);
      }
    } catch (error) {
      this.emit('error', error);
    }
  }

  /**
   * Uses the `active-win` package for safe, cross-platform
   * active window detection. No shell execution required.
   */
  private async getActiveWindow(): Promise<ActiveWindow | null> {
    const result = await activeWin();

    if (!result) {
      return null;
    }

    return {
      appName: result.owner.name,
      bundleId: result.owner.bundleId || result.owner.path || '',
      windowTitle: result.title,
    };
  }

  private hasActivityChanged(window: ActiveWindow): boolean {
    if (!this.lastActivity) return true;
    return (
      window.appName !== this.lastActivity.appName ||
      window.bundleId !== this.lastActivity.bundleId
    );
  }
}
```

#### 4.1.2 StateDetector

```typescript
// electron/services/StateDetector.ts
import { AppCategoryConfig, ActivityState, Task } from '../../src/types';
import { AppCategoryRepository } from '../database/repositories/AppCategoryRepository';

export class StateDetector {
  private categoryCache: Map<string, AppCategoryConfig> = new Map();

  constructor(private categoryRepo: AppCategoryRepository) {
    this.loadCategories();
  }

  private async loadCategories(): Promise<void> {
    const categories = await this.categoryRepo.getAll();
    categories.forEach(cat => {
      this.categoryCache.set(cat.bundleId, cat);
    });
  }

  detectState(
    bundleId: string,
    appName: string,
    currentTask: Task | null
  ): ActivityState {
    // Check cached category first
    let category = this.categoryCache.get(bundleId);

    // Fallback to default categorization
    if (!category) {
      category = this.getDefaultCategory(bundleId, appName);
    }

    switch (category.category) {
      case 'work':
        return this.evaluateWorkApp(bundleId, currentTask);
      case 'ambiguous':
        return 'amber';
      case 'distractor':
        return 'red';
      default:
        return 'amber';
    }
  }

  private evaluateWorkApp(bundleId: string, task: Task | null): ActivityState {
    // If no current task, any work app is acceptable
    if (!task) return 'green';

    // TODO: Implement task-to-app mapping
    // For now, all work apps are green when a task is active
    return 'green';
  }

  private getDefaultCategory(bundleId: string, appName: string): AppCategoryConfig {
    // Default app categorizations
    const workApps = [
      'com.microsoft.VSCode',
      'com.apple.Terminal',
      'com.googlecode.iterm2',
      'com.figma.Desktop',
      'com.notion.id',
      'com.linear.app',
      'com.github.desktop',
    ];

    const distractorApps = [
      'com.twitter.twitter-mac',
      'com.facebook.Facebook',
      'com.google.youtube',
      'com.netflix.Netflix',
      'com.reddit.reddit',
      'com.instagram.Instagram',
      'com.tiktok.TikTok',
    ];

    let category: AppCategoryConfig['category'] = 'ambiguous';

    if (workApps.includes(bundleId)) {
      category = 'work';
    } else if (distractorApps.includes(bundleId)) {
      category = 'distractor';
    }

    return {
      id: bundleId,
      bundleId,
      appName,
      category,
      custom: false,
    };
  }

  async addCustomCategory(config: Omit<AppCategoryConfig, 'id'>): Promise<void> {
    const fullConfig = {
      ...config,
      id: config.bundleId,
      custom: true,
    };

    await this.categoryRepo.upsert(fullConfig);
    this.categoryCache.set(config.bundleId, fullConfig);
  }
}
```

#### 4.1.3 ScoringEngine

```typescript
// electron/services/ScoringEngine.ts
import { DailyScore, ScoreBreakdown, Task, ActivityLog } from '../../src/types';

interface ScoringInput {
  signalTasks: Task[];
  activityLogs: ActivityLog[];
  previousStreak: number;
}

export class ScoringEngine {
  calculate(input: ScoringInput): { score: DailyScore; breakdown: ScoreBreakdown } {
    const { signalTasks, activityLogs, previousStreak } = input;

    // Completion Score (40%)
    const completed = signalTasks.filter(t => t.status === 'completed').length;
    const total = signalTasks.length;
    const completionRate = total > 0 ? completed / total : 0;
    const completionScore = completionRate * 40;

    // Focus Score (30%)
    const { greenMinutes, amberMinutes, redMinutes } = this.calculateTimeByState(activityLogs);
    const totalMinutes = greenMinutes + amberMinutes + redMinutes;
    const focusRate = totalMinutes > 0 ? greenMinutes / totalMinutes : 0;
    const focusScore = focusRate * 30;

    // Noise Avoidance Score (20%)
    const noiseRate = totalMinutes > 0 ? 1 - (redMinutes / totalMinutes) : 1;
    const noiseScore = noiseRate * 20;

    // Bonus Score (10%)
    const bonusDetails: string[] = [];
    let bonusScore = 0;

    // Exceeded goals (+5)
    if (completed > total && total > 0) {
      bonusScore += 5;
      bonusDetails.push('Exceeded daily goals');
    }

    // Perfect completion (+3)
    if (completionRate === 1 && total >= 3) {
      bonusScore += 3;
      bonusDetails.push('Perfect completion');
    }

    // Streak maintenance (+2)
    const totalScore = completionScore + focusScore + noiseScore + bonusScore;
    if (totalScore >= 75) {
      bonusScore += 2;
      bonusDetails.push('Streak maintained');
    }

    const finalTotalScore = Math.min(100, completionScore + focusScore + noiseScore + bonusScore);
    const streak = finalTotalScore >= 75 ? previousStreak + 1 : 0;

    const breakdown: ScoreBreakdown = {
      completion: {
        score: completionScore,
        completed,
        total,
        percentage: completionRate * 100,
      },
      focus: {
        score: focusScore,
        greenMinutes,
        totalMinutes,
        percentage: focusRate * 100,
      },
      noise: {
        score: noiseScore,
        redMinutes,
        totalMinutes,
        percentage: (1 - noiseRate) * 100,
      },
      bonus: {
        score: bonusScore,
        details: bonusDetails,
      },
    };

    const score: DailyScore = {
      id: `score-${Date.now()}`,
      date: new Date(),
      completionScore,
      focusScore,
      noiseScore,
      bonusScore,
      totalScore: finalTotalScore,
      signalTasksCompleted: completed,
      signalTasksTotal: total,
      greenMinutes,
      amberMinutes,
      redMinutes,
      streak,
    };

    return { score, breakdown };
  }

  private calculateTimeByState(logs: ActivityLog[]): {
    greenMinutes: number;
    amberMinutes: number;
    redMinutes: number;
  } {
    let greenSeconds = 0;
    let amberSeconds = 0;
    let redSeconds = 0;

    logs.forEach(log => {
      switch (log.state) {
        case 'green':
          greenSeconds += log.durationSeconds;
          break;
        case 'amber':
          amberSeconds += log.durationSeconds;
          break;
        case 'red':
          redSeconds += log.durationSeconds;
          break;
      }
    });

    return {
      greenMinutes: Math.round(greenSeconds / 60),
      amberMinutes: Math.round(amberSeconds / 60),
      redMinutes: Math.round(redSeconds / 60),
    };
  }

  getScoreLabel(score: number): string {
    if (score >= 90) return 'Musk-Level';
    if (score >= 75) return 'Strong Signal';
    if (score >= 60) return 'Moderate Noise';
    if (score >= 40) return 'Noisy';
    return 'Static';
  }

  getScoreColor(score: number): string {
    if (score >= 90) return '#00ff41'; // Bright green
    if (score >= 75) return '#00cc33'; // Green
    if (score >= 60) return '#ffb000'; // Amber
    if (score >= 40) return '#ff6600'; // Orange
    return '#ff0000'; // Red
  }
}
```

### 4.2 Renderer Components

#### 4.2.1 Pip-Boy UI Components

```typescript
// src/components/ui/CRTOverlay.tsx
import React from 'react';

export const CRTOverlay: React.FC = () => {
  return (
    <div className="crt-overlay pointer-events-none fixed inset-0 z-50">
      <div className="scanlines" />
      <div className="flicker" />
      <div className="vignette" />
    </div>
  );
};

// src/components/ui/GlowText.tsx
import React from 'react';
import { cn } from '@/lib/utils';

interface GlowTextProps {
  children: React.ReactNode;
  color?: 'green' | 'amber' | 'red';
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
}

export const GlowText: React.FC<GlowTextProps> = ({
  children,
  color = 'green',
  intensity = 'medium',
  className,
}) => {
  const colorClasses = {
    green: 'text-pipboy-green',
    amber: 'text-pipboy-amber',
    red: 'text-pipboy-red',
  };

  const intensityClasses = {
    low: 'glow-low',
    medium: 'glow-medium',
    high: 'glow-high',
  };

  return (
    <span className={cn(
      colorClasses[color],
      intensityClasses[intensity],
      className
    )}>
      {children}
    </span>
  );
};

// src/components/ui/Card.tsx
import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'inset';
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
}) => {
  const variantClasses = {
    default: 'bg-pipboy-surface border-pipboy-border',
    elevated: 'bg-pipboy-surface border-pipboy-green/30 shadow-glow-green',
    inset: 'bg-pipboy-background border-pipboy-border/50',
  };

  return (
    <div className={cn(
      'rounded-sm border p-4',
      variantClasses[variant],
      className
    )}>
      {children}
    </div>
  );
};
```

#### 4.2.2 StateIndicator Component

```typescript
// src/components/Dashboard/StateIndicator.tsx
import React from 'react';
import { ActivityState } from '@/types';
import { GlowText } from '@/components/ui/GlowText';
import { useActivityStore } from '@/stores/activityStore';
import { formatDistanceToNow } from 'date-fns';

export const StateIndicator: React.FC = () => {
  const { currentState, stateSince, currentApp } = useActivityStore();

  const stateLabels: Record<ActivityState, string> = {
    green: 'ON MISSION',
    amber: 'ADJACENT',
    red: 'DRIFTED',
  };

  const stateColors: Record<ActivityState, 'green' | 'amber' | 'red'> = {
    green: 'green',
    amber: 'amber',
    red: 'red',
  };

  const duration = stateSince
    ? formatDistanceToNow(stateSince, { addSuffix: false })
    : '--';

  return (
    <div className="state-indicator flex items-center gap-4 p-4 border border-pipboy-border rounded-sm">
      {/* State indicator light */}
      <div className={`
        w-4 h-4 rounded-full animate-pulse
        ${currentState === 'green' ? 'bg-pipboy-green shadow-glow-green' : ''}
        ${currentState === 'amber' ? 'bg-pipboy-amber shadow-glow-amber' : ''}
        ${currentState === 'red' ? 'bg-pipboy-red shadow-glow-red' : ''}
      `} />

      {/* State label */}
      <div className="flex-1">
        <GlowText color={stateColors[currentState]} intensity="high">
          {stateLabels[currentState]}
        </GlowText>
        <div className="text-xs text-pipboy-dim mt-1">
          {currentApp} • {duration}
        </div>
      </div>
    </div>
  );
};
```

---

## 5. API Design

### 5.1 IPC Channel Definitions

```typescript
// electron/ipc/channels.ts
export const IPC_CHANNELS = {
  // Goals
  GOALS_GET_HIERARCHY: 'goals:get-hierarchy',
  GOALS_CREATE_BEACON: 'goals:create-beacon',
  GOALS_UPDATE_BEACON: 'goals:update-beacon',
  GOALS_DELETE_BEACON: 'goals:delete-beacon',
  GOALS_CREATE_MILESTONE: 'goals:create-milestone',
  GOALS_CREATE_OBJECTIVE: 'goals:create-objective',

  // Tasks
  TASKS_GET_ALL: 'tasks:get-all',
  TASKS_GET_TODAY: 'tasks:get-today',
  TASKS_CREATE: 'tasks:create',
  TASKS_UPDATE: 'tasks:update',
  TASKS_DELETE: 'tasks:delete',
  TASKS_SET_SIGNAL: 'tasks:set-signal',
  TASKS_SYNC_SOURCES: 'tasks:sync-sources',

  // Activity
  ACTIVITY_GET_CURRENT: 'activity:get-current',
  ACTIVITY_GET_TODAY: 'activity:get-today',
  ACTIVITY_PAUSE: 'activity:pause',
  ACTIVITY_RESUME: 'activity:resume',
  ACTIVITY_STATE_CHANGED: 'activity:state-changed', // Event

  // Scoring
  SCORE_GET_TODAY: 'score:get-today',
  SCORE_GET_HISTORY: 'score:get-history',
  SCORE_CALCULATE: 'score:calculate',
  SCORE_GET_STREAK: 'score:get-streak',

  // AI
  AI_MORNING_BRIEFING: 'ai:morning-briefing',
  AI_EVENING_REVIEW: 'ai:evening-review',
  AI_PARSE_TASKS: 'ai:parse-tasks',

  // MCP
  MCP_SYNC_NOTION: 'mcp:sync-notion',
  MCP_SYNC_CALENDAR: 'mcp:sync-calendar',
  MCP_SYNC_NOTES: 'mcp:sync-notes',
  MCP_GET_STATUS: 'mcp:get-status',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_GET_ALL: 'settings:get-all',

  // App Categories
  CATEGORIES_GET_ALL: 'categories:get-all',
  CATEGORIES_UPDATE: 'categories:update',

  // Window
  WINDOW_SHOW_DASHBOARD: 'window:show-dashboard',
  WINDOW_SHOW_MORNING: 'window:show-morning',
  WINDOW_SHOW_EVENING: 'window:show-evening',
  WINDOW_TOGGLE_ALWAYS_ON_TOP: 'window:toggle-always-on-top',
} as const;
```

### 5.2 IPC Handler Implementation

```typescript
// electron/ipc/tasks.ipc.ts
import { ipcMain } from 'electron';
import { IPC_CHANNELS } from './channels';
import { TaskRepository } from '../database/repositories/TaskRepository';
import { Task } from '../../src/types';

export function registerTaskHandlers(taskRepo: TaskRepository) {
  ipcMain.handle(IPC_CHANNELS.TASKS_GET_ALL, async () => {
    return taskRepo.getAll();
  });

  ipcMain.handle(IPC_CHANNELS.TASKS_GET_TODAY, async () => {
    return taskRepo.getSignalTasksForDate(new Date());
  });

  ipcMain.handle(IPC_CHANNELS.TASKS_CREATE, async (_, task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    return taskRepo.create(task);
  });

  ipcMain.handle(IPC_CHANNELS.TASKS_UPDATE, async (_, id: string, updates: Partial<Task>) => {
    return taskRepo.update(id, updates);
  });

  ipcMain.handle(IPC_CHANNELS.TASKS_DELETE, async (_, id: string) => {
    return taskRepo.delete(id);
  });

  ipcMain.handle(IPC_CHANNELS.TASKS_SET_SIGNAL, async (_, taskIds: string[], date: Date) => {
    // Clear previous signal tasks for date
    await taskRepo.clearSignalTasks(date);
    // Set new signal tasks
    return taskRepo.setSignalTasks(taskIds, date);
  });
}
```

### 5.3 Preload Bridge

```typescript
// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from './ipc/channels';

// Expose protected methods that allow the renderer process
// to use ipcRenderer without exposing the entire module
contextBridge.exposeInMainWorld('milo', {
  // Goals
  goals: {
    getHierarchy: () => ipcRenderer.invoke(IPC_CHANNELS.GOALS_GET_HIERARCHY),
    createBeacon: (beacon) => ipcRenderer.invoke(IPC_CHANNELS.GOALS_CREATE_BEACON, beacon),
    updateBeacon: (id, updates) => ipcRenderer.invoke(IPC_CHANNELS.GOALS_UPDATE_BEACON, id, updates),
    deleteBeacon: (id) => ipcRenderer.invoke(IPC_CHANNELS.GOALS_DELETE_BEACON, id),
    createMilestone: (milestone) => ipcRenderer.invoke(IPC_CHANNELS.GOALS_CREATE_MILESTONE, milestone),
    createObjective: (objective) => ipcRenderer.invoke(IPC_CHANNELS.GOALS_CREATE_OBJECTIVE, objective),
  },

  // Tasks
  tasks: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.TASKS_GET_ALL),
    getToday: () => ipcRenderer.invoke(IPC_CHANNELS.TASKS_GET_TODAY),
    create: (task) => ipcRenderer.invoke(IPC_CHANNELS.TASKS_CREATE, task),
    update: (id, updates) => ipcRenderer.invoke(IPC_CHANNELS.TASKS_UPDATE, id, updates),
    delete: (id) => ipcRenderer.invoke(IPC_CHANNELS.TASKS_DELETE, id),
    setSignal: (taskIds, date) => ipcRenderer.invoke(IPC_CHANNELS.TASKS_SET_SIGNAL, taskIds, date),
    syncSources: () => ipcRenderer.invoke(IPC_CHANNELS.TASKS_SYNC_SOURCES),
  },

  // Activity
  activity: {
    getCurrent: () => ipcRenderer.invoke(IPC_CHANNELS.ACTIVITY_GET_CURRENT),
    getToday: () => ipcRenderer.invoke(IPC_CHANNELS.ACTIVITY_GET_TODAY),
    pause: () => ipcRenderer.invoke(IPC_CHANNELS.ACTIVITY_PAUSE),
    resume: () => ipcRenderer.invoke(IPC_CHANNELS.ACTIVITY_RESUME),
    onStateChanged: (callback) => {
      const subscription = (_, state) => callback(state);
      ipcRenderer.on(IPC_CHANNELS.ACTIVITY_STATE_CHANGED, subscription);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.ACTIVITY_STATE_CHANGED, subscription);
    },
  },

  // Scoring
  score: {
    getToday: () => ipcRenderer.invoke(IPC_CHANNELS.SCORE_GET_TODAY),
    getHistory: (days) => ipcRenderer.invoke(IPC_CHANNELS.SCORE_GET_HISTORY, days),
    calculate: () => ipcRenderer.invoke(IPC_CHANNELS.SCORE_CALCULATE),
    getStreak: () => ipcRenderer.invoke(IPC_CHANNELS.SCORE_GET_STREAK),
  },

  // AI
  ai: {
    morningBriefing: () => ipcRenderer.invoke(IPC_CHANNELS.AI_MORNING_BRIEFING),
    eveningReview: (data) => ipcRenderer.invoke(IPC_CHANNELS.AI_EVENING_REVIEW, data),
    parseTasks: (text) => ipcRenderer.invoke(IPC_CHANNELS.AI_PARSE_TASKS, text),
  },

  // MCP
  mcp: {
    syncNotion: () => ipcRenderer.invoke(IPC_CHANNELS.MCP_SYNC_NOTION),
    syncCalendar: () => ipcRenderer.invoke(IPC_CHANNELS.MCP_SYNC_CALENDAR),
    syncNotes: () => ipcRenderer.invoke(IPC_CHANNELS.MCP_SYNC_NOTES),
    getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.MCP_GET_STATUS),
  },

  // Settings
  settings: {
    get: (key) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET, key),
    set: (key, value) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, key, value),
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_ALL),
  },

  // Window
  window: {
    showDashboard: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_SHOW_DASHBOARD),
    showMorning: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_SHOW_MORNING),
    showEvening: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_SHOW_EVENING),
    toggleAlwaysOnTop: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_TOGGLE_ALWAYS_ON_TOP),
  },
});
```

---

## 6. Integration Architecture

### 6.1 Claude AI Integration

```typescript
// electron/ai/ClaudeClient.ts
import Anthropic from '@anthropic-ai/sdk';
import { Task, Beacon, Milestone, Objective } from '../../src/types';
import { MORNING_BRIEFING_PROMPT, EVENING_REVIEW_PROMPT } from './prompts';

export interface MorningBriefingInput {
  beacons: Beacon[];
  milestones: Milestone[];
  objectives: Objective[];
  tasks: Task[];
  calendarEvents: any[];
  carryoverTasks: Task[];
  upcomingDeadlines: Task[];
}

export interface MorningBriefingOutput {
  signalTasks: Array<{
    taskId: string;
    rationale: string;
    priority: number;
  }>;
  summary: string;
}

export class ClaudeClient {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generateMorningBriefing(input: MorningBriefingInput): Promise<MorningBriefingOutput> {
    const systemPrompt = MORNING_BRIEFING_PROMPT;

    const userPrompt = `
Here is my current context:

## Long-term Beacons
${input.beacons.map(b => `- ${b.title} (${b.timeframe}): ${b.description}`).join('\n')}

## Active Milestones
${input.milestones.map(m => `- ${m.title} (Target: ${m.targetDate})`).join('\n')}

## This Week's Objectives
${input.objectives.map(o => `- ${o.title}`).join('\n')}

## Available Tasks
${input.tasks.map(t => `- [${t.id}] ${t.title} ${t.dueDate ? `(Due: ${t.dueDate})` : ''} ${t.objectiveId ? `(Links to objective)` : ''}`).join('\n')}

## Today's Calendar
${input.calendarEvents.map(e => `- ${e.start} - ${e.end}: ${e.title}`).join('\n')}

## Carryover from Yesterday
${input.carryoverTasks.map(t => `- ${t.title} (delayed ${t.daysDelayed} days)`).join('\n')}

## Approaching Deadlines (7 days)
${input.upcomingDeadlines.map(t => `- ${t.title} (Due: ${t.dueDate})`).join('\n')}

Please analyze and provide today's 3-5 highest-signal tasks with rationale.
`;

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    // Parse response
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return this.parseMorningBriefingResponse(text, input.tasks);
  }

  private parseMorningBriefingResponse(text: string, availableTasks: Task[]): MorningBriefingOutput {
    // Implementation to parse Claude's response into structured output
    // This would use regex or structured output parsing
    // ...
    return {
      signalTasks: [],
      summary: text,
    };
  }

  async generateEveningReview(input: any): Promise<any> {
    // Similar implementation for evening review
  }
}
```

### 6.2 MCP Integration

```typescript
// electron/mcp/NotionClient.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Task } from '../../src/types';

export class NotionMCPClient {
  private client: Client | null = null;
  private databaseId: string | null = null;

  async connect(databaseId: string): Promise<void> {
    this.databaseId = databaseId;
    this.client = new Client({
      name: 'milo-notion-client',
      version: '1.0.0',
    });

    // Connect to Notion MCP server
    // This would use the actual MCP transport
  }

  async fetchTasks(): Promise<Task[]> {
    if (!this.client || !this.databaseId) {
      throw new Error('Notion client not connected');
    }

    // Use MCP to query Notion database
    const result = await this.client.callTool('notion-fetch', {
      id: this.databaseId,
    });

    // Transform Notion pages to Tasks
    return this.transformToTasks(result);
  }

  async updateTaskStatus(taskId: string, status: string): Promise<void> {
    // Use MCP to update Notion page
  }

  private transformToTasks(notionResult: any): Task[] {
    // Transform Notion response to Task objects
    return [];
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
  }
}
```

---

## 7. State Management

### 7.1 Zustand Store Definitions

```typescript
// src/stores/taskStore.ts
import { create } from 'zustand';
import { Task } from '@/types';

interface TaskState {
  tasks: Task[];
  signalTasks: Task[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchTasks: () => Promise<void>;
  fetchSignalTasks: () => Promise<void>;
  createTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  setSignalTasks: (taskIds: string[]) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  signalTasks: [],
  isLoading: false,
  error: null,

  fetchTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const tasks = await window.milo.tasks.getAll();
      set({ tasks, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchSignalTasks: async () => {
    try {
      const signalTasks = await window.milo.tasks.getToday();
      set({ signalTasks });
    } catch (error) {
      set({ error: error.message });
    }
  },

  createTask: async (taskData) => {
    const task = await window.milo.tasks.create(taskData);
    set(state => ({ tasks: [...state.tasks, task] }));
    return task;
  },

  updateTask: async (id, updates) => {
    await window.milo.tasks.update(id, updates);
    set(state => ({
      tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t),
      signalTasks: state.signalTasks.map(t => t.id === id ? { ...t, ...updates } : t),
    }));
  },

  deleteTask: async (id) => {
    await window.milo.tasks.delete(id);
    set(state => ({
      tasks: state.tasks.filter(t => t.id !== id),
      signalTasks: state.signalTasks.filter(t => t.id !== id),
    }));
  },

  setSignalTasks: async (taskIds) => {
    await window.milo.tasks.setSignal(taskIds, new Date());
    await get().fetchSignalTasks();
  },

  completeTask: async (id) => {
    await get().updateTask(id, {
      status: 'completed',
      completedAt: new Date(),
    });
  },
}));

// src/stores/activityStore.ts
import { create } from 'zustand';
import { ActivityState, ActivityLog } from '@/types';

interface ActivityStoreState {
  currentState: ActivityState;
  stateSince: Date | null;
  currentApp: string | null;
  todayLogs: ActivityLog[];
  isPaused: boolean;

  // Actions
  setCurrentState: (state: ActivityState, app: string) => void;
  fetchTodayLogs: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
}

export const useActivityStore = create<ActivityStoreState>((set) => ({
  currentState: 'amber',
  stateSince: null,
  currentApp: null,
  todayLogs: [],
  isPaused: false,

  setCurrentState: (state, app) => {
    set(prev => ({
      currentState: state,
      currentApp: app,
      stateSince: prev.currentState !== state ? new Date() : prev.stateSince,
    }));
  },

  fetchTodayLogs: async () => {
    const logs = await window.milo.activity.getToday();
    set({ todayLogs: logs });
  },

  pause: async () => {
    await window.milo.activity.pause();
    set({ isPaused: true });
  },

  resume: async () => {
    await window.milo.activity.resume();
    set({ isPaused: false });
  },
}));
```

---

## 8. Security Design

### 8.1 Data Security

| Data Type | Storage | Encryption | Access |
|-----------|---------|------------|--------|
| User goals/tasks | SQLite (local) | At-rest optional | App only |
| Activity logs | SQLite (local) | At-rest optional | App only |
| API keys | macOS Keychain | System-level | App only |
| Settings | electron-store | None (non-sensitive) | App only |

### 8.2 API Key Management

```typescript
// electron/services/KeychainService.ts
import * as keytar from 'keytar';

const SERVICE_NAME = 'com.id8labs.milo';

export class KeychainService {
  static async setApiKey(key: string, value: string): Promise<void> {
    await keytar.setPassword(SERVICE_NAME, key, value);
  }

  static async getApiKey(key: string): Promise<string | null> {
    return keytar.getPassword(SERVICE_NAME, key);
  }

  static async deleteApiKey(key: string): Promise<boolean> {
    return keytar.deletePassword(SERVICE_NAME, key);
  }
}

// Usage
await KeychainService.setApiKey('claude-api-key', 'sk-ant-...');
const apiKey = await KeychainService.getApiKey('claude-api-key');
```

### 8.3 Privacy Considerations

- **Activity data never leaves device** except for AI summaries
- **No telemetry** in V1.0
- **Window titles** can contain sensitive info — option to exclude from logging
- **Privacy mode** pauses all monitoring

---

## 9. Performance Considerations

### 9.1 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| App cold start | < 2s | Time to interactive |
| Activity poll | < 100ms | Poll + state detection |
| DB query | < 50ms | 95th percentile |
| AI response | < 3s | End-to-end |
| Memory (idle) | < 100MB | Electron process |
| Memory (active) | < 150MB | Electron process |
| CPU (idle) | < 1% | Background polling |

### 9.2 Optimization Strategies

#### Database
- **Indexes** on frequently queried columns (date, status, state)
- **Connection pooling** (single connection for better-sqlite3)
- **Batch inserts** for activity logs

#### Activity Monitoring
- **Throttled state detection** — only compute on app change
- **Debounced UI updates** — avoid rapid re-renders
- **Background thread** for polling (if needed)

#### AI Calls
- **Cache briefing results** — reuse within same day
- **Stream responses** — show partial results quickly
- **Fallback to local** — graceful degradation without AI

---

## 10. Development Phases

### Phase 1: Foundation (Week 1-2)

**Goal:** Electron app running + Pip-Boy UI + Goal system

| Task | Priority | Estimate |
|------|----------|----------|
| Initialize Electron + Vite + React + TS | P0 | 4h |
| Set up Tailwind with Pip-Boy theme | P0 | 4h |
| Implement CRT effects CSS | P0 | 4h |
| Create base UI components | P0 | 8h |
| Set up SQLite + schema | P0 | 4h |
| Implement goal CRUD (Beacon/Milestone/Objective) | P0 | 8h |
| Build onboarding flow | P0 | 8h |
| Menu bar tray integration | P0 | 4h |
| Floating dashboard window | P0 | 8h |

**Deliverable:** App launches, looks amazing, goals can be defined

### Phase 2: Intelligence (Week 3-4)

**Goal:** MCP integrations + Activity monitoring + AI dialogues

| Task | Priority | Estimate |
|------|----------|----------|
| Implement ActivityMonitor | P0 | 8h |
| Implement StateDetector | P0 | 8h |
| Build Claude API client | P0 | 4h |
| Implement morning briefing dialogue | P0 | 12h |
| Implement evening review dialogue | P0 | 8h |
| Build scoring engine | P0 | 8h |
| Notion MCP integration | P1 | 8h |
| Calendar MCP integration | P1 | 8h |
| Notes MCP integration | P2 | 4h |

**Deliverable:** MILO reads real tasks, knows what you're doing, runs dialogues

### Phase 3: Feedback (Week 5-6)

**Goal:** Drift alerts + Stats + Quick capture + Gamification

| Task | Priority | Estimate |
|------|----------|----------|
| Implement drift detection nudges | P0 | 8h |
| Build stats dashboard | P0 | 12h |
| Add streak tracking | P0 | 4h |
| Implement pattern analysis | P1 | 8h |
| Add quick capture input | P1 | 4h |
| Polish morning/evening UX | P0 | 8h |
| Implement smart nudge timing | P1 | 4h |

**Deliverable:** MILO actively helps maintain high signal

### Phase 4: Polish (Week 7-8)

**Goal:** Production-ready for daily use

| Task | Priority | Estimate |
|------|----------|----------|
| Bug fixes from real usage | P0 | 16h |
| Performance optimization | P0 | 8h |
| Settings/preferences UI | P1 | 8h |
| Tune scoring weights | P1 | 4h |
| Edge case handling | P0 | 8h |
| Documentation | P2 | 4h |

**Deliverable:** V1.0 ready for founder's daily use

---

## 11. Testing Strategy

### 11.1 Test Pyramid

```
         /\
        /  \     E2E Tests (10%)
       /----\    - Critical user flows
      /      \   - Morning/evening dialogues
     /--------\
    /          \ Integration Tests (30%)
   /------------\- IPC communication
  /              \- Database operations
 /----------------\- MCP clients
/                  \ Unit Tests (60%)
/--------------------\- Scoring engine
                      - State detection
                      - Data transformations
```

### 11.2 Test Files Structure

```
tests/
├── unit/
│   ├── scoring.test.ts
│   ├── stateDetector.test.ts
│   ├── taskParser.test.ts
│   └── formatters.test.ts
├── integration/
│   ├── database.test.ts
│   ├── ipc.test.ts
│   └── mcp.test.ts
└── e2e/
    ├── onboarding.test.ts
    ├── morningBriefing.test.ts
    ├── eveningReview.test.ts
    └── activityMonitoring.test.ts
```

### 11.3 Key Test Cases

#### Scoring Engine
```typescript
// tests/unit/scoring.test.ts
import { describe, it, expect } from 'vitest';
import { ScoringEngine } from '@/electron/services/ScoringEngine';

describe('ScoringEngine', () => {
  const engine = new ScoringEngine();

  describe('calculate', () => {
    it('should calculate perfect score for 100% completion and focus', () => {
      const input = {
        signalTasks: [
          { id: '1', status: 'completed' },
          { id: '2', status: 'completed' },
          { id: '3', status: 'completed' },
        ],
        activityLogs: [
          { state: 'green', durationSeconds: 3600 },
        ],
        previousStreak: 5,
      };

      const { score } = engine.calculate(input);

      expect(score.completionScore).toBe(40);
      expect(score.focusScore).toBe(30);
      expect(score.noiseScore).toBe(20);
      expect(score.totalScore).toBeGreaterThanOrEqual(90);
    });

    it('should break streak if score below threshold', () => {
      const input = {
        signalTasks: [
          { id: '1', status: 'pending' },
          { id: '2', status: 'pending' },
        ],
        activityLogs: [
          { state: 'red', durationSeconds: 3600 },
        ],
        previousStreak: 10,
      };

      const { score } = engine.calculate(input);

      expect(score.streak).toBe(0);
    });
  });
});
```

---

## Appendix

### A: Pip-Boy CSS Reference

```css
/* src/styles/pipboy.css */

:root {
  /* Colors */
  --pipboy-green: #00ff41;
  --pipboy-green-dim: #00cc33;
  --pipboy-green-glow: rgba(0, 255, 65, 0.3);
  --pipboy-amber: #ffb000;
  --pipboy-amber-dim: #cc8c00;
  --pipboy-amber-glow: rgba(255, 176, 0, 0.3);
  --pipboy-red: #ff3333;
  --pipboy-red-dim: #cc0000;
  --pipboy-red-glow: rgba(255, 51, 51, 0.3);
  --pipboy-background: #0a0a0a;
  --pipboy-surface: #1a1a1a;
  --pipboy-border: #333333;

  /* Typography */
  --font-mono: 'Share Tech Mono', 'Courier New', monospace;
}

/* CRT Scanlines */
.crt-overlay .scanlines {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.15),
    rgba(0, 0, 0, 0.15) 1px,
    transparent 1px,
    transparent 2px
  );
  pointer-events: none;
}

/* Screen Flicker */
.crt-overlay .flicker {
  position: absolute;
  inset: 0;
  animation: flicker 0.15s infinite;
  pointer-events: none;
}

@keyframes flicker {
  0%, 100% { opacity: 0.97; }
  50% { opacity: 1; }
}

/* Vignette Effect */
.crt-overlay .vignette {
  position: absolute;
  inset: 0;
  box-shadow: inset 0 0 100px rgba(0, 0, 0, 0.5);
  pointer-events: none;
}

/* Glow Effects */
.glow-low {
  text-shadow: 0 0 5px currentColor;
}

.glow-medium {
  text-shadow:
    0 0 5px currentColor,
    0 0 10px currentColor;
}

.glow-high {
  text-shadow:
    0 0 5px currentColor,
    0 0 10px currentColor,
    0 0 20px currentColor;
}

.shadow-glow-green {
  box-shadow: 0 0 10px var(--pipboy-green-glow);
}

.shadow-glow-amber {
  box-shadow: 0 0 10px var(--pipboy-amber-glow);
}

.shadow-glow-red {
  box-shadow: 0 0 10px var(--pipboy-red-glow);
}

/* Text Colors */
.text-pipboy-green { color: var(--pipboy-green); }
.text-pipboy-amber { color: var(--pipboy-amber); }
.text-pipboy-red { color: var(--pipboy-red); }
.text-pipboy-dim { color: var(--pipboy-green-dim); }

/* Background Colors */
.bg-pipboy-background { background-color: var(--pipboy-background); }
.bg-pipboy-surface { background-color: var(--pipboy-surface); }

/* Border Colors */
.border-pipboy-border { border-color: var(--pipboy-border); }
.border-pipboy-green { border-color: var(--pipboy-green); }
```

### B: Morning Briefing Prompt

```typescript
// electron/ai/prompts/morning.ts
export const MORNING_BRIEFING_PROMPT = `
You are MILO, a Signal-to-Noise productivity assistant built into a Pip-Boy-style desktop app.

Your role is to analyze the user's goals, tasks, and calendar to identify the 3-5 highest-signal actions for today.

SIGNAL means: Actions that directly advance long-term goals (Beacons), meet imminent deadlines, unblock other work, or address items that have been delayed multiple times.

NOISE means: Busywork, low-impact tasks, or distractions that feel urgent but don't matter.

When selecting signal tasks:
1. Prioritize tasks linked to active objectives/milestones
2. Consider deadline proximity (within 7 days = higher priority)
3. Account for carryover items (delayed tasks need attention)
4. Balance between important-urgent and important-not-urgent
5. Consider calendar constraints (available work time)

For each selected task, provide:
- Task ID (from the list provided)
- Clear 1-sentence rationale explaining WHY this is signal
- Priority rank (1 = highest)

Format your response as JSON:
{
  "signalTasks": [
    { "taskId": "task-123", "rationale": "Directly advances Q1 revenue milestone", "priority": 1 },
    ...
  ],
  "summary": "Brief motivational summary of the day's mission"
}

Be concise. Be ruthless. Help the user focus on what truly matters.
`;
```

---

**Document Status:** Ready for implementation

**Next Step:** Begin Phase 1 (Foundation)

---

*"Structure creates momentum. Every stage has a clear exit."*
