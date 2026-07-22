---
name: sync-upstream
description: Syncs the local fork with the upstream Sentinel repository. Fetches from sentinel-upstream, merges into the vanilla Main branch, then propagates changes into the dirty master accumulator branch with conflict resolution. Use whenever you need to update your fork before starting new speckit work, or whenever upstream has new commits you need.
---

# Sync Upstream

Syncs the `sentinel-upstream` canonical repository into your local fork's vanilla `Main` branch, then merges those changes into the dirty `master` accumulator branch where all speckit specs, agent tooling, and development documentation live.

## Architecture

```
sentinel-upstream/Main ──────▶ myfork/Main ──────▶ local Main   (VANILLA, no tooling)
                                                │
                                                │ merge
                                                ▼
                                            master          (DIRTY accumulator)
```

- **`Main`** — Vanilla branch. Tracks upstream exactly. No `.opencode/`, `.agents/`, `.specify/`, specs, or agent files.
- **`master`** — Dirty accumulator branch. Houses ALL speckit specs, agent skills, tooling configs, and accumulated documentation from every past speckit session.

## Usage

Invoke this skill when:
- You need to pull the latest upstream changes before starting new work
- You see new upstream commits and want to keep your fork updated
- You just created a fresh clone and need to set up the two-branch architecture

## Workflow

### Step 1: Verify clean working tree

```bash
git status --porcelain
```

The script requires a clean working tree (no uncommitted changes). Stash or commit first.

### Step 2: Fetch and sync vanilla Main

```bash
git fetch sentinel-upstream
git checkout Main
git merge sentinel-upstream/Main
git push myfork Main
```

### Step 3: Merge vanilla Main into dirty master

This is where conflicts happen. The `master` branch accumulates:
- All speckit specs (`specs/`)
- Agent skills & config (`.agents/`, `.opencode/`)
- Tooling files (`AGENTS.md`, `skills-lock.json`)
- Past development documentation

The `Main` branch has NONE of these — it only receives upstream source code changes.

```bash
git checkout master
git merge Main
```

### Step 4: Push updated master

```bash
git push myfork master
```

## Conflict Resolution — AGENT INSTRUCTIONS

When merging `Main` into `master`, conflicts are expected. Below is the resolution strategy per file category. **The agent MUST follow these rules.**

### Category A: Tooling & Internal Files — ALWAYS KEEP OURS (`master`)

These files exist ONLY on `master` and NEVER on `Main`. Accept all of them from `master`:

```
.opencode/          .agents/          .specify/
specs/              AGENTS.md         CLAUDE.md
skills-lock.json    .vscode/
```

Resolution command:
```bash
git checkout --ours -- <file>
```

### Category B: Source Code (`src/`, `Tests/`, `server/`, `netlify/`, `supabase/`, `scripts/`, `public/`, `e2e/`)

Default: **Accept upstream first (`--theirs`), then layer dirty additions.**

Strategy:
1. Take upstream's version (`--theirs`) — this gives you the latest canonical code
2. Review each conflicting file for changes on `master` that haven't been upstreamed yet
3. If `master` has local improvements that are NOT in upstream, manually splice them into the merged file

```bash
git checkout --theirs -- <file>
# Then manually review and re-apply any unsubmitted dirty changes
```

### Category C: `.gitignore` — MANUAL MERGE

Both branches modify `.gitignore`. The merged version MUST contain:

**Always keep from `master`:**
```
.opencode/
.agents/
.specify/
specs/
AGENTS.md
```

**Add any new patterns from upstream** — inspect `git diff Main...master -- .gitignore` to see what each side added.

### Category D: Config Files — ACCEPT UPSTREAM, PRESERVE DIRTY CUSTOMIZATIONS

Config files include: `package.json`, `vite.config.js`, `vitest.config.js`, `playwright.config.ts`, `netlify.toml`, `vercel.json`, `eslint.config.js`, `postcss.config.js`, `tailwind.config.js`, `stackbit.config.js`, `tsconfig.json`, `index.html`, `dev.sh`

Strategy:
1. Accept upstream's version (`--theirs`)
2. Review `master`'s version for custom dev configurations (proxy settings, plugin additions, test config changes) and re-apply those manually

### Category E: Files only on Main (new upstream additions)

These arrive as new files from the merge — no conflict. Review them and commit as-is.

### Category F: Files only on master (speckit artifacts, docs)

No conflict — they stay untouched. These are the speckit specs, agent files, etc.

### Conflict Resolution Procedure

1. After `git merge Main`, check for conflicts:
   ```bash
   git diff --name-only --diff-filter=U
   ```
2. For each conflicted file, classify it into categories A-F above
3. Resolve Category A files with `--ours` (always)
4. Resolve Category B and D files with `--theirs`, then manually review
5. Resolve Category C (`.gitignore`) manually — keep both sides' additions
6. Stage resolved files: `git add <file>`
7. Complete the merge: `git merge --continue` (or `git commit` if already staged)

### Example Merge Session

```
$ git merge Main
Auto-merging .gitignore
CONFLICT (content): Merge conflict in .gitignore
Auto-merging package.json
CONFLICT (content): Merge conflict in package.json
Auto-merging src/components/Map/MapView.jsx
CONFLICT (content): Merge conflict in src/components/Map/MapView.jsx

# Resolve .gitignore: keep dirty ignore rules, add upstream's new patterns
$ vim .gitignore
$ git add .gitignore

# Resolve package.json: accept upstream, re-add dirty's custom scripts
$ git checkout --theirs -- package.json
$ vim package.json  # re-add proxy configs, dev scripts from master
$ git add package.json

# Resolve MapView.jsx: accept upstream, check if master has unsubmitted features
$ git checkout --theirs -- src/components/Map/MapView.jsx
$ git diff master -- src/components/Map/MapView.jsx  # inspect what master had
# If master's changes were already upstreamed, skip. If not, manually apply.
$ git add src/components/Map/MapView.jsx

# Complete merge
$ git merge --continue
```

## Script

The `scripts/sync-upstream.sh` shell script automates the core git operations but pauses for the agent to perform conflict resolution when `master` diverges from `Main`.

### Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `UPSTREAM_REMOTE` | `sentinel-upstream` | Canonical upstream remote |
| `FORK_REMOTE` | `myfork` | Your fork remote |
| `VANILLA_BRANCH` | `Main` | Clean branch tracking upstream |
| `DIRTY_BRANCH` | `master` | Dirty accumulator branch |

These can be overridden via script flags: `--upstream`, `--fork`, `--vanilla`, `--dirty`.

### Script Flags

```
sync-upstream.sh [--upstream <remote>] [--fork <remote>]
                 [--vanilla <branch>] [--dirty <branch>]
                 [--dry-run] [--help]
```

### Output

```
✅ Sync complete from sentinel-upstream
   Vanilla Main updated: 3 new commits
   Dirty master updated: merge from Main (manual conflict resolution may be needed)
   myfork/Main pushed
   myfork/master pushed

Next: Create a new speckit branch from master
   git checkout -b feature/<name> master
```

## Troubleshooting

### "Working tree is dirty"
Commit or stash your changes before running sync.

### "sentinel-upstream remote not found"
```bash
git remote add sentinel-upstream git@github.com:National-Wildfire-Tracking-Team/Sentinel-.git
```

### "myfork remote not found"
```bash
git remote add myfork git@github.com:<your-username>/Sentinel-.git
```

### "Merge conflict in packages"
If `package.json` or lock files have conflicts, resolve by accepting upstream and then running `npm install` to regenerate locks.

### "Baseline branch Main not found locally"
The script will create it from `myfork/Main` if it doesn't exist locally.
