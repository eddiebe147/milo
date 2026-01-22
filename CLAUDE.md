# MILO + Claude Code Integration

**Want to run MILO directly from Claude Code? Here's how.**

## Quick Start (One Command)

```bash
bash scripts/setup-claude.sh YOUR_ANTHROPIC_API_KEY
```

That's it! This will:
- Clone the repo (if needed)
- Install dependencies
- Configure your API key
- Launch MILO in dev mode
- Open it in your browser

---

## What Happens Under the Hood

### Step 1: Environment Setup
```bash
export ANTHROPIC_API_KEY=sk-ant-...
```
Your API key is used to configure Claude integrations in MILO.

### Step 2: Install Dependencies
```bash
npm install
```
Installs all required packages (React, Electron, SQLite, etc.)

### Step 3: Start Development Server
```bash
npm run dev:web
```
Launches MILO in web mode (http://localhost:5173)

**OR** for Desktop App:
```bash
npm run dev
```
Launches full Electron desktop app

---

## Using Claude Code to Automate This

You can ask Claude Code to:

### Option A: Run the Setup Script
```
/claude-code
Use the setup-claude.sh script to install and run MILO with my API key: sk-ant-...
```

### Option B: Manual Step-by-Step
```
/claude-code
1. Clone github.com/eddiebe147/milo
2. npm install
3. Set ANTHROPIC_API_KEY environment variable
4. npm run dev:web
```

### Option C: Build a DMG (Desktop App)
```
/claude-code
Build MILO for macOS: npm run build:mac
This creates a DMG you can distribute
```

---

## Environment Variables

### Required
- `ANTHROPIC_API_KEY` - Your Claude API key from claude.ai

### Optional
- `MILO_PORT` - Port for web dev server (default: 5173)
- `MILO_ENV` - Set to "development" or "production"

---

## Project Structure (for Claude Code context)

```
milo/
├── src/                    # React frontend
│   ├── components/        # UI components (Dashboard, Chat, etc.)
│   ├── stores/           # Zustand state management
│   └── pages/            # Page components
├── electron/             # Electron main process (Desktop app)
│   ├── main.ts          # Entry point
│   ├── services/        # IPC handlers, database, AI
│   └── repositories/    # Data layer
├── packages/
│   └── mcp-server/      # MCP integration for AI tools
└── scripts/
    └── setup-claude.sh  # This script!
```

---

## Common Claude Code Tasks

### "Set up MILO and make it work"
Claude Code will:
1. Clone repo
2. Install deps
3. Prompt for API key
4. Start dev server
5. Open browser

### "Build MILO for macOS"
Claude Code will:
1. Run `npm run build:mac`
2. Create DMG file
3. Output path to dist/

### "Run tests"
Claude Code will:
1. Run `npm test` (unit tests)
2. Run `npm run test:e2e` (E2E tests)
3. Show results

### "Debug the app"
Claude Code will:
1. Start dev server
2. Open DevTools
3. Help you trace issues

---

## Troubleshooting

### "API key not recognized"
```bash
export ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE
```
Make sure the key starts with `sk-ant-`

### "Port already in use"
```bash
MILO_PORT=5174 npm run dev:web
```

### "Dependencies won't install"
```bash
rm -rf node_modules package-lock.json
npm install
```

### "App crashes on startup"
Check if Claude API is accessible:
```bash
curl -I https://api.anthropic.com
```

---

## Next Steps

Once MILO is running, you can:

1. **Use the Morning Briefing** - AI picks your 3-5 signal tasks
2. **Start Tasks** - Launch Claude Code with task prompts automatically filled
3. **Track Focus** - Monitor your signal-to-noise ratio
4. **Review Progress** - Evening reflection and scoring

---

## For More Info

- **Main README**: See project overview and features
- **Demo Script**: Check DEMO_SCRIPT.md for demo instructions
- **MCP Integration**: See packages/mcp-server/ for AI tool integration
