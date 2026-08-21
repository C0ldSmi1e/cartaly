#!/usr/bin/env bash
set -euo pipefail

REPO_DIR=/home/moon/cartaly
BRANCH=main
STATE_FILE=$REPO_DIR/scripts/.state/cartaly.rev

cd "$REPO_DIR"
git fetch origin "$BRANCH"

target=$(git rev-parse "origin/$BRANCH")
deployed=$(cat "$STATE_FILE" 2>/dev/null || echo none)

if [ "$deployed" = "$target" ]; then
    echo "$(date -Is) already at $target, nothing to do"
    exit 0
fi

echo "$(date -Is) deploying $target"
git reset --hard "$target"
docker compose up -d --build --remove-orphans
docker image prune -f
mkdir -p "$(dirname "$STATE_FILE")"
echo "$target" > "$STATE_FILE"
echo "$(date -Is) deploy OK"
