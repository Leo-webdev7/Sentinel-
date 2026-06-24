# Prepare for Upstream Skill

A skill that prepares local changes for submission to the upstream repository.

## What It Does

1. Creates a clean branch from upstream/Main
2. Squashes all changes into a single commit
3. Removes internal files (.specify, .agents, skills, constitution, etc.)
4. Pushes the clean branch to your fork for PR creation

## Quick Start

```bash
# Basic usage
/prepare.for.upstream

# With custom branch name
/prepare.for.upstream my-feature

# With custom commit message
/prepare.for.upstream --message "feat: add new feature"
```

## Files Excluded

The following files are automatically removed from the upstream commit:

- `.specify/` - SpecKit configuration and memory
- `specs/` - Feature specifications and planning docs
- `.agents/` - Agent skills and configurations
- `AGENTS.md` - Agent context file
- `skills/` - Skills directory
- `constitution.md` - Project constitution
- `coverage/`, `playwright-report/` - Test artifacts
- `.env`, `.env.local` - Environment files
- `*.log` - Log files

## Example

### Before (your working branch)
```
my-feature/
├── .github/workflows/ci.yml    ✓ committed
├── src/App.tsx                  ✓ committed
├── .specify/memory/constitution.md  ✗ internal
├── specs/001-build-pipeline/    ✗ internal
└── AGENTS.md                    ✗ internal
```

### After (clean upstream branch)
```
feature/ci-pipeline/
├── .github/workflows/ci.yml    ✓ clean
├── src/App.tsx                  ✓ clean
└── (no internal files)
```

## Configuration

### Remotes

The skill expects these remotes:
- `origin` or `upstream` - Your fork
- `upstream` - The original repository

If `upstream` doesn't exist, it falls back to `origin`.

### Branch Naming

Branches are prefixed with:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `refactor/` - Code refactoring

## Troubleshooting

### "No changes to commit"
- Ensure you have uncommitted changes
- Check `git status` to see current state

### "Remote not found"
- Add upstream: `git remote add upstream <url>`
- Or use: `git remote add origin <url>`

### "Conflicts after squash"
- Resolve conflicts in the clean branch
- Commit: `git add . && git commit -m "resolve conflicts"`

### "Excluded files still in commit"
- Check `.gitignore` patterns
- Manually remove: `git rm --cached <file>`
