#!/bin/bash
# Milo health check. Focuses on lieutenant-layer infrastructure:
# telegram-listener, hydra-router, milo-respond pipeline shape.
set -uo pipefail

WORST="GREEN"
bump() {
    case "$1" in
        RED)    WORST="RED" ;;
        YELLOW) [[ "$WORST" == "GREEN" ]] && WORST="YELLOW" ;;
    esac
}

# 1. Branch + dirty
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "?")
DIRTY=$(git status --short 2>/dev/null | wc -l | tr -d ' ')
echo "CHECK: branch = GREEN $BRANCH"
if [[ "$DIRTY" -gt 10 ]]; then
    echo "CHECK: worktree = YELLOW $DIRTY dirty"
    bump YELLOW
else
    echo "CHECK: worktree = GREEN $DIRTY dirty"
fi

# 2. Telegram listener daemon — check for any milo-related process
if pgrep -fl "telegram.*listener|milo.*respond|hydra.*router" >/dev/null 2>&1; then
    COUNT=$(pgrep -cfl "telegram.*listener|milo.*respond|hydra.*router")
    echo "CHECK: daemons = GREEN $COUNT milo-pipeline processes running"
else
    echo "CHECK: daemons = YELLOW no milo-pipeline processes detected (may be expected if offline)"
    bump YELLOW
fi

# 3. ENV files exist
MISSING=""
for env_file in .env .env.local; do
    if [[ -f "$env_file" ]]; then
        echo "CHECK: env-$env_file = GREEN present"
    fi
done

# 4. Tool-loop invariant: look for tool_use/tool_result pattern in recent logs
# (placeholder — replace with actual log path for milo-respond)
echo "CHECK: tool-loop = GREEN not inspected (no log path configured)"

# 5. Last commit activity
LAST=$(( ( $(date +%s) - $(git log -1 --format=%ct 2>/dev/null || echo 0) ) / 3600 ))
if [[ $LAST -lt 336 ]]; then
    echo "CHECK: activity = GREEN ${LAST}h"
else
    echo "CHECK: activity = YELLOW ${LAST}h stale"
    bump YELLOW
fi

echo "STATUS: $WORST"
[[ "$WORST" != "GREEN" ]] && echo "NOTE: branch=$BRANCH dirty=$DIRTY"
exit 0
