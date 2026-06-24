#!/usr/bin/env bash
#
# prepare-for-upstream.sh
# Creates a clean branch with squashed commit for upstream submission
# Original branch stays untouched
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
REMOTE="myfork"
UPSTREAM="sentinel-upstream"

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
      echo "  --remote         Remote name (default: myfork)"
      echo "  --upstream       Upstream remote name (default: sentinel-upstream)"
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

ORIGINAL_BRANCH=$(git branch --show-current 2>/dev/null || echo "detached")
echo "  Original branch: $ORIGINAL_BRANCH"

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo -e "${RED}❌ You have uncommitted changes. Commit or stash them first.${NC}"
  exit 1
fi

# Check for untracked files that might be important
UNTRACKED=$(git ls-files --others --exclude-standard | wc -l)
if [[ $UNTRACKED -gt 0 ]]; then
  echo -e "${YELLOW}⚠️  You have $UNTRACKED untracked files${NC}"
fi

# Step 2: Determine branch name
echo -e "\n${YELLOW}📝 Step 2: Determining branch name...${NC}"

if [[ -z "$BRANCH_NAME" ]]; then
  if [[ "$ORIGINAL_BRANCH" != "detached" ]]; then
    # Use the original branch name with -upstream suffix
    BRANCH_NAME="${ORIGINAL_BRANCH}-upstream"
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
  # Generate commit message from last commit on current branch
  LAST_COMMIT=$(git log -1 --pretty=format:"%s" 2>/dev/null || echo "")
  if [[ -n "$LAST_COMMIT" ]]; then
    COMMIT_MSG="$LAST_COMMIT"
  else
    COMMIT_MSG="feat: update project"
  fi
fi

echo "  Commit message: $COMMIT_MSG"

# Step 4: Fetch latest from upstream
echo -e "\n${YELLOW}🔄 Step 4: Fetching latest from upstream...${NC}"

git fetch "$UPSTREAM"
echo "  Fetched latest from $UPSTREAM"

# Step 5: Create clean branch from upstream
echo -e "\n${YELLOW}🌿 Step 5: Creating clean branch...${NC}"

# Delete the branch if it already exists (force switch back to original first)
if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
  if [[ "$BRANCH_NAME" == "$ORIGINAL_BRANCH" ]]; then
    echo -e "${RED}❌ Cannot delete current branch. Use a different name.${NC}"
    exit 1
  fi
  git checkout "$ORIGINAL_BRANCH" 2>/dev/null || true
  git branch -D "$BRANCH_NAME" 2>/dev/null || true
fi

# Create new branch from upstream/Main
git checkout -b "$BRANCH_NAME" "$UPSTREAM/Main" 2>/dev/null || \
git checkout -b "$BRANCH_NAME" "$UPSTREAM/main" 2>/dev/null || \
git checkout -b "$BRANCH_NAME" "$UPSTREAM/master" 2>/dev/null

echo "  Created branch: $BRANCH_NAME from $UPSTREAM/Main"

# Step 6: Copy changes from original branch (excluding unwanted files)
echo -e "\n${YELLOW}📦 Step 6: Copying changes from $ORIGINAL_BRANCH...${NC}"

if [[ "$ORIGINAL_BRANCH" != "detached" && "$ORIGINAL_BRANCH" != "$BRANCH_NAME" ]]; then
  # Get list of files changed in original branch compared to upstream
  CHANGED_FILES=$(git diff --name-only "$UPSTREAM/Main"..."$ORIGINAL_BRANCH" 2>/dev/null || true)
  
  if [[ -n "$CHANGED_FILES" ]]; then
    echo "  Found $(echo "$CHANGED_FILES" | wc -l) changed files"
    
    # Copy each file, excluding unwanted ones
    while IFS= read -r file; do
      # Skip excluded files
      case "$file" in
        .specify/*|specs/*|.agents/*|.opencode/skills/*|AGENTS.md|skills/*|constitution.md|*.constitution.*|coverage/*|playwright-report/*|*.log|.env|.env.local|.env.*.local)
          echo "  Skipping: $file (excluded)"
          continue
          ;;
      esac
      
      # Copy the file from original branch
      if git checkout "$ORIGINAL_BRANCH" -- "$file" 2>/dev/null; then
        echo "  Copied: $file"
      fi
    done <<< "$CHANGED_FILES"
  else
    echo "  No changes found to copy"
  fi
fi

# Step 7: Create commit
echo -e "\n${YELLOW}📝 Step 7: Creating commit...${NC}"

git add .

if git diff --cached --quiet; then
  echo -e "${YELLOW}⚠️  No changes to commit${NC}"
else
  git commit -m "$COMMIT_MSG"
  echo "  Created commit: $(git rev-parse --short HEAD)"
fi

# Step 8: Push to fork
echo -e "\n${YELLOW}🚀 Step 8: Pushing to fork...${NC}"

git push "$REMOTE" "$BRANCH_NAME" --force-with-lease
echo "  Pushed to: $REMOTE/$BRANCH_NAME"

# Step 9: Switch back to original branch
echo -e "\n${YELLOW}🔄 Step 9: Switching back to original branch...${NC}"

git checkout "$ORIGINAL_BRANCH"
echo "  Switched back to: $ORIGINAL_BRANCH"

# Summary
echo -e "\n${GREEN}✅ Ready for upstream!${NC}"
echo ""
echo "Summary:"
echo "  Original branch: $ORIGINAL_BRANCH (untouched)"
echo "  Clean branch: $BRANCH_NAME"
echo "  Commit: $(git rev-parse --short "$BRANCH_NAME") - $COMMIT_MSG"
echo ""
echo "Next steps:"
echo "  1. Create PR: gh pr create --base Main --head $REMOTE:$BRANCH_NAME"
echo "  2. Or visit: https://github.com/<org>/<repo>/compare/Main...$REMOTE:$BRANCH_NAME"
