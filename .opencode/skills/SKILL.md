---
name: prepare-for-upstream
description: Prepare current changes for upstream submission. Creates a clean branch with a single squashed commit, removing all internal files (.specify, .agents, skills, constitution, etc.). Use when ready to create a PR to the upstream repository.
---

# Prepare for Upstream

A skill that prepares local changes for submission to the upstream repository by creating a clean branch with a single squashed commit, stripped of all internal development files.

## Purpose

When working on a fork, developers accumulate internal files (.specify/, .agents/, skills, constitution, spec documents, etc.) that should NOT be pushed to the upstream repository. This skill automates the process of:

1. Creating a new branch from upstream/Main
2. Squashing all current changes into a single commit
3. Removing internal files from the commit
4. Pushing the clean branch to the fork for PR creation

## Files Excluded from Upstream

The following files/directories are automatically excluded:

### SpecKit & Planning Files
- `.specify/` - All SpecKit configuration and memory
- `specs/` - All feature specifications and planning documents
- `AGENTS.md` - Agent context file

### Skills & Extensions
- `.agents/` - All agent skills and configurations
- `skills/` - Any top-level skills directory

### Constitution & Governance
- `.specify/memory/constitution.md` - Project constitution
- Any `*.constitution.*` files

### Internal Documentation
- `docs/plan*.md` - Planning documents
- `docs/research*.md` - Research documents
- Any `*-internal.md` files

### Development Artifacts
- `coverage/` - Test coverage reports
- `playwright-report/` - E2E test reports
- `*.log` - Log files
- `.env*` - Environment files (except .env.example)

## Usage

### Basic Usage

```
/prepare.for.upstream
```

This will:
1. Detect current branch and changes
2. Create a new branch named `feature/<description>` from upstream/Main
3. Squash all changes into one clean commit
4. Remove excluded files
5. Push to fork for PR creation

### With Custom Branch Name

```
/prepare.for.upstream my-feature-name
```

### With Custom Commit Message

```
/prepare.for.upstream --message "feat: add new feature"
```

## Workflow

### Step 1: Detect Current State

```bash
# Check current branch
git branch --show-current

# Check for changes
git status --short

# Check upstream remote
git remote -v
```

### Step 2: Create Clean Branch

```bash
# Fetch latest from upstream
git fetch upstream

# Create new branch from upstream/Main
git checkout -b feature/<name> upstream/Main
```

### Step 3: Apply Cleaned Changes

```bash
# Stash current changes
git stash

# Apply only non-excluded files
git stash pop

# Remove excluded files
git rm -r --cached .specify/ specs/ .agents/ AGENTS.md 2>/dev/null || true
git rm --cached .env 2>/dev/null || true
git rm --cached coverage/ -r 2>/dev/null || true
```

### Step 4: Create Squash Commit

```bash
# Stage all changes
git add .

# Create single commit
git commit -m "<message>"
```

### Step 5: Push to Fork

```bash
# Push to fork
git push origin feature/<name>
```

## Output

After running the skill, you'll see:

```
✅ Clean branch created: feature/<name>
✅ Commit: <commit-hash> - <message>
✅ Changes: <N> files changed
✅ Excluded: <M> internal files removed
✅ Pushed to: origin/feature/<name>

Next steps:
1. Create PR: gh pr create --base Main
2. Or visit: https://github.com/<org>/<repo>/compare/Main...<fork>:<branch>
```

## Excluded File Patterns

```gitignore
# SpecKit
.specify/
specs/

# Agents
.agents/
AGENTS.md

# Skills
skills/

# Constitution
constitution.md
*.constitution.*

# Internal docs
docs/plan*.md
docs/research*.md
*-internal.md

# Development artifacts
coverage/
playwright-report/
*.log
.env
.env.local
.env.*.local
```

## Example

### Before (current branch)
```
my-feature-branch/
├── .github/workflows/ci.yml    (modified)
├── src/App.tsx                  (modified)
├── netlify.toml                 (modified)
├── .specify/memory/constitution.md  (internal - exclude)
├── specs/001-build-pipeline/    (internal - exclude)
├── AGENTS.md                    (internal - exclude)
└── README.md                    (modified)
```

### After (clean branch)
```
feature/ci-pipeline/
├── .github/workflows/ci.yml    (modified)
├── src/App.tsx                  (modified)
├── netlify.toml                 (modified)
└── README.md                    (modified)
```

### Commit Message
```
feat: implement CI/CD pipeline

- Update ci.yml to trigger on all PRs
- Add lint, build, test, typecheck, coverage jobs
- Configure Netlify auto-deploy for stage/dev/Main
- Remove old deploy.yml and prod-merge-gate.yml
```

## Tips

1. **Commit Message**: Use conventional commits (feat:, fix:, docs:, etc.)
2. **One Feature Per PR**: Keep each upstream PR focused on one change
3. **Verify Before Push**: Always review the commit before pushing
4. **Backup**: Keep your working branch until PR is merged

## Troubleshooting

### "No changes to commit"
- Ensure you have uncommitted changes on current branch
- Check if files are already committed

### "Upstream remote not found"
- Add upstream: `git remote add upstream <url>`
- Or use `origin` if that's your upstream

### "Conflicts after squash"
- Resolve conflicts in the clean branch
- Commit resolution: `git add . && git commit -m "resolve conflicts"`

### "Excluded files still in commit"
- Check `.gitignore` patterns
- Manually remove: `git rm --cached <file>`
