#!/usr/bin/env bash
#
# prepare-for-upstream.sh
# Creates a clean branch with squashed commit for upstream submission
#
# Usage:
#   ./prepare-for-upstream.sh [branch-name] [--message "commit message"]
#
# Examples:
#   ./prepare-for-upstream.sh
#   ./prepare-for-upstream.sh my-feature
#   ./prepare-for-upstream.sh --message "feat: add new feature"
#   ./prepare-for-upstream.sh my-feature --message "feat: add new feature"

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
BRANCH_NAME=""
COMMIT_MSG=""
REMOTE="origin"
UPSTREAM="upstream"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --message|-m)
      COMMIT_MSG="$2"
      shift 2
      ;;
    --remote)
      REMOTE="$2"
      shift 2
      ;;
    --upstream)
      UPSTREAM="$2"
      shift 2
      ;;
    --help|-h)
      echo "Usage: $0 [branch-name] [--message \"commit message\"]"
      echo ""
      echo "Options:"
      echo "  --message, -m    Custom commit message"
      echo "  --remote         Remote name (default: origin)"
      echo "  --upstream       Upstream remote name (default: upstream)"
      echo "  --help, -h       Show this help"
      exit 0
      ;;
    *)
      BRANCH_NAME="$1"
      shift
      ;;
  esac
done

echo -e "${YELLOW}🔧 Preparing for upstream submission...${NC}"

# Step 1: Check current state
echo -e "\n${YELLOW}📋 Step 1: Checking current state...${NC}"

CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "detached")
echo "  Current branch: $CURRENT_BRANCH"

CHANGES=$(git status --short | wc -l)
echo "  Uncommitted changes: $CHANGES files"

# Check for remotes
if ! git remote get-url "$REMOTE" &>/dev/null; then
  echo -e "${RED}❌ Remote '$REMOTE' not found${NC}"
  echo "  Add it with: git remote add $REMOTE <url>"
  exit 1
fi

if ! git remote get-url "$UPSTREAM" &>/dev/null; then
  echo -e "${YELLOW}⚠️  Upstream '$UPSTREAM' not found, using '$REMOTE'${NC}"
  UPSTREAM="$REMOTE"
fi

# Step 2: Determine branch name
echo -e "\n${YELLOW}📝 Step 2: Determining branch name...${NC}"

if [[ -z "$BRANCH_NAME" ]]; then
  # Generate branch name from current changes
  if [[ "$CURRENT_BRANCH" != "detached" ]]; then
    BRANCH_NAME="$CURRENT_BRANCH"
  else
    BRANCH_NAME="feature/$(date +%Y%m%d-%H%M%S)"
  fi
fi

# Ensure feature/ prefix
if [[ ! "$BRANCH_NAME" =~ ^(feature/|fix/|docs/|refactor/) ]]; then
  BRANCH_NAME="feature/$BRANCH_NAME"
fi

echo "  Branch name: $BRANCH_NAME"

# Step 3: Determine commit message
echo -e "\n${YELLOW}💬 Step 3: Determining commit message...${NC}"

if [[ -z "$COMMIT_MSG" ]]; then
  # Generate commit message from changes
  CHANGED_FILES=$(git diff --name-only 2>/dev/null | head -5)
  if [[ -n "$CHANGED_FILES" ]]; then
    FIRST_FILE=$(basename "$CHANGED_FILES" | head -1)
    COMMIT_MSG="feat: update $FIRST_FILE"
  else
    COMMIT_MSG="feat: update project"
  fi
fi

echo "  Commit message: $COMMIT_MSG"

# Step 4: Fetch latest from upstream
echo -e "\n${YELLOW}🔄 Step 4: Fetching latest from upstream...${NC}"

git fetch "$UPSTREAM"
echo "  Fetched latest from $UPSTREAM"

# Step 5: Create clean branch
echo -e "\n${YELLOW}🌿 Step 5: Creating clean branch...${NC}"

# Stash current changes if any
if [[ $CHANGES -gt 0 ]]; then
  git stash push -m "temp stash for upstream preparation"
  echo "  Stashed current changes"
fi

# Create new branch from upstream/Main
git checkout -b "$BRANCH_NAME" "$UPSTREAM/Main" 2>/dev/null || \
git checkout -b "$BRANCH_NAME" "$UPSTREAM/main" 2>/dev/null || \
git checkout -b "$BRANCH_NAME" "$UPSTREAM/master" 2>/dev/null

echo "  Created branch: $BRANCH_NAME"

# Step 6: Apply cleaned changes
echo -e "\n${YELLOW}🧹 Step 6: Applying cleaned changes...${NC}"

if [[ $CHANGES -gt 0 ]]; then
  git stash pop
  
  # Remove excluded files from staging
  echo "  Removing internal files..."
  
  # SpecKit files
  git rm -r --cached .specify/ 2>/dev/null || true
  git rm -r --cached specs/ 2>/dev/null || true
  
  # Agent files
  git rm -r --cached .agents/ 2>/dev/null || true
  git rm --cached AGENTS.md 2>/dev/null || true
  
  # Skills
  git rm -r --cached skills/ 2>/dev/null || true
  
  # Constitution
  git rm --cached constitution.md 2>/dev/null || true
  git rm --cached *.constitution.* 2>/dev/null || true
  
  # Internal docs
  git rm --cached docs/plan*.md 2>/dev/null || true
  git rm --cached docs/research*.md 2>/dev/null || true
  git rm --cached *-internal.md 2>/dev/null || true
  
  # Development artifacts
  git rm -r --cached coverage/ 2>/dev/null || true
  git rm -r --cached playwright-report/ 2>/dev/null || true
  git rm --cached *.log 2>/dev/null || true
  git rm --cached .env 2>/dev/null || true
  git rm --cached .env.local 2>/dev/null || true
  git rm --cached .env.*.local 2>/dev/null || true
  
  echo "  Removed internal files from staging"
fi

# Step 7: Create squash commit
echo -e "\n${YELLOW}📦 Step 7: Creating commit...${NC}"

git add .

if git diff --cached --quiet; then
  echo -e "${YELLOW}⚠️  No changes to commit${NC}"
else
  git commit -m "$COMMIT_MSG"
  echo "  Created commit: $(git rev-parse --short HEAD)"
fi

# Step 8: Push to fork
echo -e "\n${YELLOW}🚀 Step 8: Pushing to fork...${NC}"

git push "$REMOTE" "$BRANCH_NAME"
echo "  Pushed to: $REMOTE/$BRANCH_NAME"

# Summary
echo -e "\n${GREEN}✅ Ready for upstream!${NC}"
echo ""
echo "Summary:"
echo "  Branch: $BRANCH_NAME"
echo "  Commit: $(git rev-parse --short HEAD) - $COMMIT_MSG"
echo "  Changes: $(git diff --stat HEAD~1 2>/dev/null | tail -1)"
echo ""
echo "Next steps:"
echo "  1. Create PR: gh pr create --base Main"
echo "  2. Or visit: https://github.com/<org>/<repo>/compare/Main...$REMOTE:$BRANCH_NAME"
