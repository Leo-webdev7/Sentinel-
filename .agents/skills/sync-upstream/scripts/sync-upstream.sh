#!/usr/bin/env bash
#
# sync-upstream.sh
# Syncs sentinel-upstream → local Main (vanilla) → master (dirty accumulator)
#
# Usage:
#   ./sync-upstream.sh [options]
#
# Options:
#   --upstream <remote>   Upstream remote (default: sentinel-upstream)
#   --fork <remote>       Fork remote (default: myfork)
#   --vanilla <branch>    Clean vanilla branch (default: Main)
#   --dirty <branch>      Dirty accumulator branch (default: master)
#   --dry-run             Show what would happen without making changes
#   --help, -h            Show this help

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

UPSTREAM_REMOTE="sentinel-upstream"
FORK_REMOTE="myfork"
VANILLA_BRANCH="Main"
DIRTY_BRANCH="master"
DRY_RUN=false

usage() {
  echo "Usage: $0 [options]"
  echo ""
  echo "Syncs sentinel-upstream → local Main (vanilla) → master (dirty accumulator)"
  echo ""
  echo "Options:"
  echo "  --upstream <remote>   Upstream remote (default: $UPSTREAM_REMOTE)"
  echo "  --fork <remote>       Fork remote (default: $FORK_REMOTE)"
  echo "  --vanilla <branch>    Clean vanilla branch (default: $VANILLA_BRANCH)"
  echo "  --dirty <branch>      Dirty accumulator branch (default: $DIRTY_BRANCH)"
  echo "  --dry-run             Show what would happen without making changes"
  echo "  --help, -h            Show this help"
  exit 0
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --upstream) UPSTREAM_REMOTE="$2"; shift 2 ;;
    --fork) FORK_REMOTE="$2"; shift 2 ;;
    --vanilla) VANILLA_BRANCH="$2"; shift 2 ;;
    --dirty) DIRTY_BRANCH="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    --help|-h) usage ;;
    *) echo -e "${RED}Unknown option: $1${NC}"; usage ;;
  esac
done

echo -e "${CYAN}🔗 Sync Upstream${NC}"
echo "  Upstream remote: $UPSTREAM_REMOTE"
echo "  Fork remote:     $FORK_REMOTE"
echo "  Vanilla branch:  $VANILLA_BRANCH"
echo "  Dirty branch:    $DIRTY_BRANCH"
echo ""

# ── Helpers ─────────────────────────────────────────────

require_clean_tree() {
  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo -e "${RED}❌ Working tree is dirty. Commit or stash changes first.${NC}"
    git status --short
    exit 1
  fi
}

require_remote() {
  local remote="$1"
  if ! git remote get-url "$remote" &>/dev/null; then
    echo -e "${RED}❌ Remote '$remote' not found.${NC}"
    echo "  Add it with: git remote add $remote <url>"
    exit 1
  fi
}

require_branch_exists() {
  local branch="$1"
  if ! git show-ref --verify --quiet "refs/heads/$branch"; then
    if ! git show-ref --verify --quiet "refs/remotes/$FORK_REMOTE/$branch"; then
      echo -e "${RED}❌ Branch '$branch' not found locally or on $FORK_REMOTE${NC}"
      exit 1
    fi
  fi
}

ensure_local_branch() {
  local branch="$1"
  if git show-ref --verify --quiet "refs/heads/$branch"; then
    return 0
  fi
  echo -e "${YELLOW}  Branch '$branch' not local, creating from $FORK_REMOTE/$branch...${NC}"
  if $DRY_RUN; then
    echo -e "${YELLOW}  [dry-run] git checkout -b $branch $FORK_REMOTE/$branch${NC}"
  else
    git checkout -b "$branch" "$FORK_REMOTE/$branch"
  fi
}

# ── Step 1: Verify state ────────────────────────────────

echo -e "${YELLOW}📋 Step 1: Checking repository state...${NC}"

ORIGINAL_BRANCH=$(git branch --show-current 2>/dev/null || echo "detached")
echo "  Current branch: $ORIGINAL_BRANCH"

require_clean_tree
require_remote "$UPSTREAM_REMOTE"
require_remote "$FORK_REMOTE"

echo ""

# ── Step 2: Fetch upstream ──────────────────────────────

echo -e "${YELLOW}🔄 Step 2: Fetching $UPSTREAM_REMOTE...${NC}"

if $DRY_RUN; then
  echo -e "${CYAN}  [dry-run] git fetch $UPSTREAM_REMOTE${NC}"
else
  git fetch "$UPSTREAM_REMOTE"
fi

# Check for upstream branch
UPSTREAM_REF="$UPSTREAM_REMOTE/$VANILLA_BRANCH"
if ! git show-ref --verify --quiet "refs/remotes/$UPSTREAM_REF"; then
  echo -e "${RED}❌ Remote branch '$UPSTREAM_REF' not found.${NC}"
  echo "  Available upstream branches:"
  git ls-remote --heads "$UPSTREAM_REMOTE" | awk '{print $2}' | sed 's|refs/heads/|  |'
  exit 1
fi

# Count new commits
UPSTREAM_COMMITS=$(git rev-list --count "$UPSTREAM_REF" ^"$UPSTREAM_REF" 2>/dev/null || echo 0)
echo "  Upstream branch: $UPSTREAM_REF"

echo ""

# ── Step 3: Sync vanilla Main ───────────────────────────

echo -e "${YELLOW}🌿 Step 3: Syncing vanilla $VANILLA_BRANCH...${NC}"

# Ensure local Main exists
ensure_local_branch "$VANILLA_BRANCH"

if ! $DRY_RUN; then
  git checkout "$VANILLA_BRANCH"
  git fetch "$UPSTREAM_REMOTE"
fi

BEFORE_MERGE=$(git rev-parse HEAD 2>/dev/null || echo "")

if $DRY_RUN; then
  echo -e "${CYAN}  [dry-run] git merge $UPSTREAM_REF${NC}"
else
  if git merge --ff-only "$UPSTREAM_REF" 2>/dev/null; then
    MERGE_TYPE="fast-forward"
  else
    echo -e "${YELLOW}  Fast-forward not possible, attempting merge...${NC}"
    if git merge "$UPSTREAM_REF" --no-edit; then
      MERGE_TYPE="merge"
    else
      echo -e "${RED}❌ Merge conflict on vanilla $VANILLA_BRANCH${NC}"
      echo "  This should not happen. Your $VANILLA_BRANCH should track upstream cleanly."
      echo "  Resolve conflicts and run: git merge --continue"
      exit 1
    fi
  fi
fi

AFTER_MERGE=$(git rev-parse HEAD)

if $DRY_RUN; then
  echo -e "${CYAN}  [dry-run] git push $FORK_REMOTE $VANILLA_BRANCH${NC}"
else
  if [ "$BEFORE_MERGE" != "$AFTER_MERGE" ]; then
    NEW_COMMITS=$(git rev-list --count "$AFTER_MERGE" "^$BEFORE_MERGE" 2>/dev/null || echo 0)
    echo -e "  ${GREEN}$VANILLA_BRANCH updated: $NEW_COMMITS new commit(s)${NC}"

    git push "$FORK_REMOTE" "$VANILLA_BRANCH"
    echo -e "  Pushed $VANILLA_BRANCH to $FORK_REMOTE"
  else
    echo -e "  ${CYAN}$VANILLA_BRANCH is already up to date${NC}"
  fi
fi

echo ""

# ── Step 4: Merge into dirty master ─────────────────────

echo -e "${YELLOW}🔀 Step 4: Merging $VANILLA_BRANCH into dirty $DIRTY_BRANCH...${NC}"

ensure_local_branch "$DIRTY_BRANCH"

if ! $DRY_RUN; then
  git checkout "$DIRTY_BRANCH"
fi

BEFORE_DIRTY=$(git rev-parse HEAD 2>/dev/null || echo "")

if $DRY_RUN; then
  echo -e "${CYAN}  [dry-run] git merge $VANILLA_BRANCH${NC}"
  echo -e "${YELLOW}  [dry-run] If conflicts occur, resolve per SKILL.md agent instructions${NC}"
else
  if git merge "$VANILLA_BRANCH" --no-edit 2>/dev/null; then
    echo -e "  ${GREEN}Clean merge — no conflicts${NC}"
  else
    CONFLICT_COUNT=$(git diff --name-only --diff-filter=U 2>/dev/null | wc -l)
    echo ""
    echo -e "${YELLOW}⚠️  MERGE CONFLICTS DETECTED ($CONFLICT_COUNT files)${NC}"
    echo ""
    echo -e "${CYAN}Conflicted files:${NC}"
    git diff --name-only --diff-filter=U | while IFS= read -r f; do
      echo "  $f"
    done
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}  AGENT: Follow the conflict resolution strategy in${NC}"
    echo -e "${RED}  .agents/skills/sync-upstream/SKILL.md${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${CYAN}Quick resolution guide:${NC}"
    echo "  Category A (tooling):  git checkout --ours -- <file>"
    echo "    → .opencode/ .agents/ .specify/ specs/ AGENTS.md CLAUDE.md skills-lock.json .vscode/"
    echo "  Category B (source):   git checkout --theirs -- <file>, then review for unsubmitted dirty changes"
    echo "    → src/ Tests/ server/ netlify/ supabase/ scripts/ public/ e2e/"
    echo "  Category C (.gitignore): Manual merge — keep dirty's patterns, add upstream's"
    echo "  Category D (config):   git checkout --theirs -- <file>, re-apply dirty customizations"
    echo "    → package.json vite.config.js netlify.toml etc."
    echo ""
    echo "After resolving:"
    echo "  1. git add <resolved-files>"
    echo "  2. git merge --continue"
    echo "  3. Then run: git push $FORK_REMOTE $DIRTY_BRANCH"
    echo ""
    echo -e "${CYAN}The script will exit now. Complete the merge, then re-run with --dry-run to verify.${NC}"
    exit 2
  fi
fi

AFTER_DIRTY=$(git rev-parse HEAD 2>/dev/null || echo "")

if [ "$BEFORE_DIRTY" != "$AFTER_DIRTY" ] && ! $DRY_RUN; then
  echo -e "  Pushing $DIRTY_BRANCH to $FORK_REMOTE..."
  git push "$FORK_REMOTE" "$DIRTY_BRANCH"
fi

echo ""

# ── Step 5: Return to original branch ──────────────────

echo -e "${YELLOW}🏠 Step 5: Returning to original branch...${NC}"

if [ "$ORIGINAL_BRANCH" != "detached" ] && ! $DRY_RUN; then
  if git show-ref --verify --quiet "refs/heads/$ORIGINAL_BRANCH"; then
    git checkout "$ORIGINAL_BRANCH"
    echo "  Back on: $ORIGINAL_BRANCH"
  fi
fi

echo ""

# ── Summary ────────────────────────────────────────────

echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           ✅ Sync Upstream Complete                   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  Vanilla:   $VANILLA_BRANCH ← $UPSTREAM_REF"
echo "  Dirty:     $DIRTY_BRANCH (accumulated specs + tooling)"
echo "  Fork:      $FORK_REMOTE"
echo ""

if ! $DRY_RUN; then
  echo -e "${CYAN}Next: Start a new speckit session${NC}"
  echo ""
  echo "  git checkout $DIRTY_BRANCH"
  echo "  git checkout -b feature/<your-feature>"
  echo ""
  echo "Then invoke your speckit workflow on the new branch."
else
  echo -e "${CYAN}[dry-run complete — no changes made]${NC}"
fi
