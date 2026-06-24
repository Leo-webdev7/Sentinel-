<!--
Sync Impact Report
==================
Version change: 1.3.0 → 1.4.0 (Minor: new principle)
Modified principles:
  - VIII. Testing Discipline (expanded)
Added sections:
  - IX. Technical Constraints & Decision Framework (new principle)
  - Legacy Code Policy (under IX)
  - Library Management (under IX)
  - Technical Decision Protocol (under IX)
  - Platform Constraints (under IX)
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

### VII. CI/CD Pipeline Requirements

All code entering the `Main` branch MUST pass through automated quality
gates. Two distinct pipelines enforce this requirement:

#### Pull Request Pipeline

When a PR is opened targeting `Main`, the following checks MUST pass
before merge is permitted:
1. **Lint**: Code style and static analysis
2. **Build**: Successful production build
3. **Tests**: All unit and integration tests pass
4. **Coverage**: Test coverage meets minimum threshold for affected areas
5. **E2E Tests**: End-to-end validation completes successfully

If ANY check fails, the PR MUST NOT be merged until the issue is resolved.
This pipeline serves as a security gate protecting the main branch.

#### Main Branch Pipeline

When code is merged to `Main`, the following steps execute:
1. **Lint**: Code style and static analysis
2. **Build**: Successful production build
3. **Tests**: All unit and integration tests pass
4. **E2E Tests**: End-to-end validation completes successfully
5. **Deploy**: Publish to Netlify production environment

Note: Coverage checks are NOT required on the main branch pipeline.
Coverage is enforced at the PR stage only.

#### Implementation Requirements

- Pipelines MUST be implemented as GitHub Actions workflows
- Workflow files MUST be stored in `.github/workflows/`
- Netlify credentials MUST be stored securely in GitHub Secrets
- Secrets MUST NOT be hardcoded or logged in workflow output
- Pipeline configuration MUST be version-controlled alongside code

### VIII. Testing Discipline

Quality assurance through testing is mandatory for feature work.
Every feature MUST include tests unless explicitly exempted.

#### Test Coverage Requirements

- All feature code MUST have corresponding tests
- Minimum coverage threshold: **70% of code branches** for the
  affected feature area
- Coverage is measured at the feature/PR scope, not globally
- Tests MUST be included in the same PR as the feature code

#### When Coverage is Checked

- Coverage is checked during the **PR pipeline only**
- Coverage is NOT required for main branch pipeline merges
- PR MUST NOT be merged if coverage falls below the threshold
- Coverage reports SHOULD be visible in PR comments

#### Coverage Exemptions

The following types of changes are exempt from test coverage requirements:
- Build pipeline and CI/CD configuration changes
- Infrastructure and deployment configuration
- Documentation-only changes
- Dependency updates and version bumps
- Linting and formatting configuration

These exemptions exist because such changes do not affect application
logic and do not introduce functional risk.

#### Test Placement

- Unit tests: Co-located with source files or in `tests/unit/`
- Integration tests: In `tests/integration/`
- E2E tests: In `e2e/` directory
- Test naming: Match the feature or module being tested

### IX. Technical Constraints & Decision Framework

Technical decisions MUST respect established constraints and follow
a clear decision protocol. This ensures consistency, stability, and
cost-effectiveness throughout the project.

#### Legacy Code Policy

Code created before **June 22, 2026** is considered legacy code.
Legacy code is subject to the following restrictions:

- MUST NOT be refactored unless explicitly requested by the user
- MUST NOT be restructured or reorganized without user approval
- MUST NOT undergo architectural changes unless necessary for new features
- MUST be treated as stable, working code that requires minimal intervention

When working on features that touch legacy code, prefer additive changes
over modifications to existing structures. New code should be isolated
and not require changes to legacy implementations.

#### Library Management

Dependencies MUST be managed conservatively to minimize bloat:

- MUST NOT add new libraries without considering existing alternatives
- MUST prefer using libraries already present in the project
- MUST justify any new dependency with clear technical rationale
- MUST evaluate bundle size impact before adding client-side libraries

Before adding a new library:
1. Check if existing libraries can solve the problem
2. Evaluate if the functionality can be implemented simply
3. Consider the long-term maintenance burden
4. Assess impact on bundle size and performance

#### Technical Decision Protocol

When a technical decision presents multiple viable options, the
following protocol MUST be followed:

1. **Identify the Fork**: Clearly state that a technical decision
   point has been reached
2. **Present Options**: List all viable technical approaches
3. **Explain Consequences**: For each option, describe:
   - Technical benefits and drawbacks
   - Implementation complexity
   - Long-term maintenance implications
   - Cost implications (if applicable)
4. **Await User Decision**: MUST NOT proceed until the user chooses
   an approach and acknowledges the consequences

This protocol ensures informed decision-making and prevents
unintended architectural direction.

#### Platform Constraints (Netlify Free Tier)

The project MUST operate within Netlify's Free Tier limits unless
the user explicitly approves otherwise.

When making implementation decisions:
- MUST prefer Netlify-native features when available
- MUST stay within Free Tier resource limits
- MUST clearly disclose when a solution requires paid features

**Free Tier Boundaries** (as of June 2026):
- 100 GB bandwidth per month
- 300 build minutes per month
- 1 concurrent build
- Serverless functions: 125K invocations/month
- Edge functions: 3M invocations/month
- Forms: 100 submissions/month
- Identity: 1,000 monthly active users
- Blobs: 1 GB storage

When a solution would exceed these limits, the user MUST be informed
before proceeding with implementation.

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
6. **CI/CD Gate**: PR must pass lint, build, test, coverage, and E2E checks
7. **Human Review**: PR reviewed and approved by human
8. **Merge & Deploy**: Merge triggers main branch pipeline and deployment

### Pull Request Protocol

When opening a pull request:
- PR MUST target the `Main` branch of `origin`
- PR MUST NOT be merged automatically or by AI
- PR MUST receive human review and approval before merge
- PR MUST pass all CI/CD pipeline checks before merge
- PR MUST include tests covering the feature (unless exempted)
- PR MUST meet coverage threshold for the affected feature area
- PR description MUST be clean and professional
- PR MUST NOT contain references to private context or tooling

### Branch Protection

- Never commit directly to `Main` on `origin`
- Never push raw development branches to `origin`
- Never include private notes, tooling files, or AI artifacts in shared commits
- Always verify commit content before sharing
- Use interactive rebase to clean commit history before sharing
- Never bypass CI/CD pipeline checks

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
- CI/CD pipeline results MUST be verified before merge
- Test coverage MUST meet threshold for affected feature areas
- Technical decisions MUST follow the decision protocol
- Regular audits of shared branches ensure ongoing compliance

### Enforcement

Violations of privacy boundaries require immediate remediation:
- Force-push to remove compromised commits from shared branches
- Rotate any exposed credentials or private artifacts
- Document the incident and update procedures as needed

**Version**: 1.4.0 | **Ratified**: 2026-06-24 | **Last Amended**: 2026-06-24
