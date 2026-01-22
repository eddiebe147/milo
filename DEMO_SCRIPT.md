# MILO Demo Script - 3 Feature Showcase
**Total Demo Time: ~5-7 minutes**

---

## PRE-DEMO SETUP

### Before you start:
1. Open MILO app
2. Make sure you have 10+ tasks in the task list (mix of priorities)
3. Have at least 1-2 tasks marked as carryover/deferred from yesterday
4. Test the Claude API key is working (API key configured)
5. Position window so it's visible and large enough to see details

---

## FEATURE 1: MORNING BRIEFING (2-3 min)
**Story:** "MILO helps you cut through task chaos by using AI to pick your 3-5 signal tasks—the ones that actually move the needle."

### Step 1: Show the Problem (30 sec)
**What to say:**
> "Here's my task list. I've got 15 different things to do today. But here's the real question: which 3-5 actually matter?

**What to show:**
- Point to dashboard with task list visible
- Scroll through tasks to show the volume/variety
- Emphasize the noise: meetings, emails, admin work mixed with deep work

### Step 2: Trigger Morning Briefing (10 sec)
**What to say:**
> "Let me ask Claude to figure out my signal tasks. I'll open the command palette."

**What to do:**
- Press `Cmd+K` (Mac) or `Ctrl+K` (Linux/Windows)
- Command palette appears

**What to show:**
- Search box is open and ready

### Step 3: Search for Morning Briefing (10 sec)
**What to say:**
> "I'll search for morning briefing..."

**What to do:**
- Type: `morning briefing`
- See "Start Morning Briefing" command appear
- Click it (or press Enter)

**What to show:**
- Modal opens with "MORNING BRIEFING" header
- Today's date displayed
- "Generate Briefing" button visible

### Step 4: Generate Signal Tasks (20-30 sec)
**What to say:**
> "Now Claude analyzes all my tasks and picks the 3-5 that have the highest impact. Watch what it does..."

**What to do:**
- Click **"Generate Briefing"** button
- Wait for streaming response (shows "Analyzing...")
- Claude generates signal tasks

**What to show:**
- Loading indicator while Claude thinks
- Signal tasks appear with:
  - **#1, #2, #3...** (numbered priority)
  - Task title
  - Rationale (2-3 sentence explanation of why Claude picked it)
  - Green left border styling

**What to say while waiting:**
> "Claude is looking at all your tasks, your goals, and figuring out which ones move the needle vs. which are busywork. It's not just random—it's reasoning about impact."

### Step 5: Highlight the Output (15-20 sec)
**What to say:**
> "Notice what Claude picked. It didn't just take the first 5 tasks—it reasoned about which ones advance your actual goals. Here's why #1 is important [read rationale]. And #2 [read rationale]."

**What to show:**
- Point to each rationale
- Show that it's personalized reasoning, not generic advice
- Emphasize the numbered ranking (1 is most important)

### Step 6: Close Briefing (optional)
**What to say:**
> "If I like these, I click 'Apply Signal Tasks' and they become my locked priorities for today. If I want different ones, I can regenerate."

**What to do:**
- Click **"Apply Signal Tasks"** (or just close)
- Modal closes

---

## FEATURE 2: SIGNAL QUEUE (1.5-2 min)
**Story:** "After AI picks them, you see your priorities visually. You can reorder them or see which ones are carryover tasks."

### Step 1: Show Signal Queue (10 sec)
**What to say:**
> "Now look at your signal queue. These are your top 3-5 priorities, visually prioritized."

**What to show:**
- Look at the Signal Queue panel (should show the tasks you just applied from Morning Briefing)
- Should display as cards with task names, priority badges

### Step 2: Explain the Visual (15 sec)
**What to say:**
> "Each card shows the task title and its priority level. You can see which ones are carryover from yesterday—those are continuity tasks. At the top, you see which project they belong to."

**What to show:**
- Point to priority levels
- Show project filter dropdown
- Highlight any carryover/continuity tasks (if available)

### Step 3: Demo Drag-and-Drop (15-20 sec) - Optional
**What to say:**
> "If you want to change the order, you can drag and drop. Let me reorder the queue."

**What to do:**
- Click and drag task #2 to position #1
- Watch it reorder
- Drag back to original position

**What to show:**
- Visual feedback as you drag
- Tasks reorder smoothly
- New ordering is saved

**What to say:**
> "Your custom order is saved. You control what comes next."

---

## FEATURE 3: START TASK (1.5-2 min)
**Story:** "You pick a task, click Start, and MILO now knows exactly what you're working on. It tracks your focus in real-time."

### Step 1: Select a Task to Start (10 sec)
**What to say:**
> "Now let me show you what happens when you start a task. This is where the magic happens. I'm going to click 'Start' on the first signal task."

**What to show:**
- Point to top task in Signal Queue
- Show the "Start" button

### Step 2: Click Start Task (5-10 sec)
**What to say:**
> "I'll click the Start button..."

**What to do:**
- Click **"Start"** button on a task
- Task status changes to `in_progress` (visual indicator)
- Task appears highlighted/active

**What to show:**
- Task is now marked as active (green highlight or bold)
- "Active" or "In Progress" badge appears
- Button might change to "Active" or "Executing"

### Step 3: Explain What Happened (15 sec)
**What to say:**
> "What just happened: MILO marked this as my active task. Now, every app I open, every window I switch to, MILO tags that activity as belonging to this task. If I switch to Slack, it knows I'm on-mission because Slack is related to my work. If I switch to Twitter, it knows I drifted. This feeds into your daily focus score."

**What to show:**
- Point to the active task state
- Explain the tracking concept (don't need to see monitoring UI running)

### Step 4: Show the Benefit (15 sec)
**What to say:**
> "Why this matters: MILO now understands exactly what you're working on. When you get nudged later today—like 'You've been on Slack for 15 minutes, your mission is [task]'—it knows what you were supposed to be doing. This is how MILO helps you stay on signal."

**What to show:**
- Emphasize the task is locked in
- Highlight that activity tracking is now active for this task

---

## DEMO CLOSURE (30 sec)

**What to say:**
> "So here's the full loop: Morning Briefing picks your 3-5 signal tasks using AI. Signal Queue shows them visually and lets you prioritize. Start Task engages real-time tracking so MILO knows if you're drifting. And all of that feeds into your daily score—your metric for ruthless execution."

**Key Takeaway:**
> "MILO's job is simple: cut the noise, show you what matters, and remind you when you drift. No productivity theater. Just signal."

---

## DEMO CHECKLIST

- [ ] MILO is open and responsive
- [ ] API key is configured and working
- [ ] At least 10 tasks exist in the system
- [ ] Morning Briefing generates successfully (no API errors)
- [ ] Signal Queue displays the generated tasks
- [ ] Start Task button works and marks task as active
- [ ] Window is sized well for visibility
- [ ] You've rehearsed the talking points

---

## TROUBLESHOOTING

### Morning Briefing doesn't generate
- Check API key in Settings
- Make sure there are tasks in the system
- Try regenerate button

### Signal Queue is empty
- Apply signal tasks from briefing first
- Or manually create tasks and mark as priority

### Start Task button doesn't work
- Refresh the page
- Check browser console for errors
- Make sure task is valid

---

## TIMING NOTES

- **Talking (~4 min):** Explanation and storytelling
- **Interaction (~2-3 min):** Clicking, waiting for generation, dragging
- **Buffer:** 30 sec for unexpected delays

**Total: 6-7 minutes** (can compress to 4-5 if you skip drag-drop demo)
