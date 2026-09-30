#!/bin/zsh
# Merge the 20 area branches into feat/pilot, one at a time.
# Usage: merge-pilot.sh <branch>... ; stops at the first merge that needs a human.
# messages/*.json merge through the json3 driver (.git/info/attributes);
# convex/_generated/* always takes ours and is regenerated afterwards.
set -u
cd /Users/syedabdulmuqeeth/Developer/Luma.Green || exit 1
git rev-parse --abbrev-ref HEAD | grep -qx feat/pilot || { echo "not on feat/pilot"; exit 1; }
for B in "$@"; do
  echo "=== merging $B"
  if git merge --no-edit --no-ff "$B" -m "merge($B): into feat/pilot" >/dev/null 2>&1; then
    echo "clean"
    continue
  fi
  conflicts=$(git diff --name-only --diff-filter=U)
  rest=""
  for f in ${(f)conflicts}; do
    case "$f" in
      convex/_generated/*) git checkout --ours -- "$f" && git add "$f" ;;
      pnpm-lock.yaml) git checkout --ours -- "$f" && git add "$f"; echo "lockfile: took ours (run pnpm install after)";;
      *) rest="$rest $f" ;;
    esac
  done
  if [ -n "$rest" ]; then
    echo "NEEDS A HUMAN:$rest"
    exit 2
  fi
  git commit --no-edit --no-verify -q -m "merge($B): into feat/pilot" && echo "resolved generated files"
done
echo "all merged; now: npx convex codegen --typecheck disable && git add convex/_generated && git commit"
