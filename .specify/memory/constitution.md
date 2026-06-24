<!--
Sync Impact Report
==================
Version change: 1.0.0 → 1.1.0 (Minor: new workflow guidance)
Modified principles:
  - II. Clean Sharing Protocol → II. Clean Sharing Protocol (expanded)
  - III. Squashed Commits → III. Squashed Commits for Completed Work (expanded)
  - IV. Branch Hygiene → IV. Branch Hygiene & Privacy Boundaries (expanded)
Added sections:
  - VI. Release Branch Protocol (new principle)
  - Branch Naming Convention (under Repository Workflow)
  - Pull Request Protocol (under Repository Workflow)
Removed sections: N/A
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ (Constitution Check section aligns)
  - .specify/templates/spec-template.md ✅ (scope/requirements alignment)
  - .specify/templates/tasks-template.md ✅ (task categorization reflects principles)
Follow-up TODOs: None
-->

# Sentinel Constitution

## Core Principles

### I. Privacy & Data Isolation

All private working data MUST remain in the private repository (`myfork`). This includes:
- SpecKit specifications, skills, and tooling generated files
- Private working notes, cowriting notes, and temporary files
- AI assistant (Claude, etc.) context files and auto-generated artifacts
- Development experiments, drafts, and work-in-progress branches

The private repository serves as the exclusive workspace for preparation,
experimentation, and iteration. No private artifacts may appear in commits
destined for the public repository (`origin`).

### II. Clean Sharing Protocol

Before any branch is pushed to the public repository (`origin`) or opened as
a pull request, it MUST be sanitized:
- Remove all private mentions, references to private notes, and internal context
- Delete temporary files, AI-inserted artifacts, and tooling-generated files
- Strip any coworking notes, personal annotations, or development breadcrumbs
- Ensure commit messages are clean, professional, and free of private context

The shared branch MUST represent only the final, production-ready work
suitable for public review. No intermediate states, drafts, or experimental
artifacts may be visible in the shared branch history.

### III. Squashed Commits for Completed Work

All completed work MUST be committed as a single squashed commit. This
commit may then be:
- Cherry-picked into the main branch of the public repository
- Rebased or moved into shared branches
- Packaged for release

Individual commits, experimental fixes, and work-in-progress snapshots
MUST NOT be pushed to shared branches. Each logical unit of work results
in exactly one clean, atomic commit.

### IV. Branch Hygiene & Privacy Boundaries

Branches are categorized by their intended visibility:

**Private Branches** (stay in `myfork`, preferably local):
- Specification development and iteration
- SpecKit work and tooling experiments
- Feature prototypes and proof-of-concepts
- Personal preparation and research branches

**Shared Branches** (push to `origin` only when cleaned):
- Completed features ready for review
- Bug fixes validated and sanitized
- Release candidates and production-ready changes

Private branches MUST remain in the local workspace until the work is
complete and the branch has been sanitized for sharing.

### V. Commit Integrity & Atomicity

Each commit MUST represent a complete, self-contained logical change:
- Commits MUST compile and pass all tests
- Commits MUST NOT break existing functionality
- Commit messages MUST follow conventional commit format
- Each commit MUST be independently reviewable and reversible

Work in progress is tracked through private branches and commits, but
only atomic, validated commits enter the shared history.

### VI. Release Branch Protocol

The path from private work to shared code follows a strict protocol:

1. **Create Release Branch**: From the private workspace, create a branch
   using the naming convention: `<type>/<feature-name>-<github-nickname>`
   - Example: `feature/wildfire-alerts-leo`
   - Example: `fix/map-rendering-leo`
   - Example: `docs/api-reference-leo`

2. **Clean & Squash**: On this branch, perform ALL cleanup:
   - Remove all private context, temporary files, and generated noise
   - Strip AI-inserted artifacts and tooling-generated files
   - Squash all work into a single, clean commit
   - Write a clean, professional commit message

3. **Push to Origin**: Push the cleaned release branch to `origin`:
   ```
   git push origin feature/wildfire-alerts-leo
   ```

4. **Open Pull Request**: Create a PR from the release branch targeting
   the `Main` branch of `origin`

5. **Human Review & Merge**: PR MUST be reviewed and merged by a human.
   No automated merging is permitted.

This protocol ensures clean, reviewable history in the public repository.

## Repository Workflow

### Dual-Remote Architecture

The project maintains two remotes with distinct purposes:

- **`origin`** (public): The shared project repository for team
  collaboration and public visibility
- **`myfork`** (private): The personal workspace for development,
  experimentation, and preparation

### Branch Naming Convention

When preparing work for sharing, branches MUST follow this format:

```
<type>/<feature-name>-<github-nickname>
```

Where:
- `<type>`: One of `feature`, `fix`, `docs`, `refactor`, `test`, `ci`
- `<feature-name>`: Short, descriptive kebab-case name
- `<github-nickname>`: Your GitHub username (e.g., `leo`)

Examples:
- `feature/smoke-layer-leo`
- `fix/legend-positioning-leo`
- `docs/deployment-guide-leo`

This convention ensures clear ownership and purpose for shared branches.

### Work Cycle

1. **Private Development**: Work occurs in private branches within `myfork`
2. **Completion & Validation**: Work is validated, tested, and finalized
3. **Create Release Branch**: Branch named `<type>/<name>-<nickname>` created
4. **Clean & Squash**: All private artifacts removed, work squashed to one commit
5. **Push & PR**: Branch pushed to `origin`, PR opened against `Main`

### Pull Request Protocol

When opening a pull request:
- PR MUST target the `Main` branch of `origin`
- PR MUST NOT be merged automatically or by AI
- PR MUST receive human review and approval before merge
- PR description MUST be clean and professional
- PR MUST NOT contain references to private context or tooling

### Branch Protection

- Never commit directly to `Main` on `origin`
- Never push raw development branches to `origin`
- Never include private notes, tooling files, or AI artifacts in shared commits
- Always verify commit content before sharing
- Use interactive rebase to clean commit history before sharing

## Governance

This constitution establishes the fundamental workflow boundaries for the
Sentinel project. All development activity MUST comply with these principles.

### Amendment Process

1. Proposed changes MUST be documented with rationale
2. Changes MUST preserve the privacy boundary between repositories
3. Version increments follow semantic versioning:
   - MAJOR: Workflow principle removals or incompatible changes
   - MINOR: New principles or materially expanded guidance
   - PATCH: Clarifications, wording, and non-semantic refinements

### Compliance Review

- All pull requests MUST be reviewed for privacy compliance before merge
- Commit history MUST be inspected for accidental private data inclusion
- Branch names and commit messages MUST adhere to naming conventions
- Regular audits of shared branches ensure ongoing compliance

### Enforcement

Violations of privacy boundaries require immediate remediation:
- Force-push to remove compromised commits from shared branches
- Rotate any exposed credentials or private artifacts
- Document the incident and update procedures as needed

**Version**: 1.1.0 | **Ratified**: 2026-06-24 | **Last Amended**: 2026-06-24
