<!--
Sync Impact Report
==================
Version change: 1.5.3 → 1.5.4 (PATCH: branch naming correction)
Modified principles:
  - VI. Release Branch Protocol (main → Main)
  - VII. CI/CD Pipeline Requirements (main → Main)
  - Repository Workflow section (main → Main)
Added sections: N/A
Removed sections: N/A
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ (no changes needed)
  - .specify/templates/spec-template.md ✅ (no changes needed)
  - .specify/templates/tasks-template.md ✅ (no changes needed)
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

The project uses a three-tier branch hierarchy with two deployment
environments:

```
dev → stage → Main
     (staging)  (production)
```

#### Branch Definitions

- **`dev`**: Active development branch. All work happens here.
  - All feature branches merge into `dev`
  - This is the integration branch for ongoing work

- **`stage`**: Staging environment branch. Pre-production validation.
  - Code from `dev` is promoted via PR
  - Deploys automatically to Netlify stage environment
  - Used for final validation before production

- **`Main`**: Production environment branch. Stable releases only.
  - Code from `stage` is promoted via PR
  - Deploys automatically to Netlify production environment
  - Represents the current stable release

#### Promotion Flow

1. **Work in `dev`**: All development happens in `dev` or feature
   branches that merge into `dev`

2. **PR: `dev` → `stage`**: When ready to validate:
   - Create PR from `dev` to `stage`
   - Pass CI/CD pipeline checks
   - Human review and approval
   - Merge triggers stage deployment

3. **Validate in Stage**: Test in stage environment with production-like
   configuration

4. **PR: `stage` → `Main`**: When ready for production:
   - Create PR from `stage` to `Main`
   - Pass CI/CD pipeline checks
   - Human review and approval
   - Merge triggers production deployment

#### Branch Protection Rules

- NEVER commit directly to `stage` or `Main`
- NEVER merge without passing CI/CD checks
- NEVER merge without human approval
- ALWAYS use pull requests for promotions

### VII. CI/CD Pipeline Requirements

Validation checks run ONLY during pull requests. Deployment happens
automatically via Netlify preview server when branches receive new
commits.

#### PR Validation Pipeline

When any PR is opened, the following checks MUST pass before
merge is permitted:
1. **Lint**: Code style and static analysis
2. **Build**: Successful production build
3. **Tests**: All unit and integration tests pass
4. **Typecheck**: TypeScript/type checking passes
5. **Coverage**: Test coverage meets minimum threshold (70%)

If ANY check fails, the PR MUST NOT be merged until resolved.

**Important**: These checks run ONLY on PRs. No validation runs
on direct pushes to `stage` or `dev`.

#### Branch Deployment (Automatic)

When code is merged to `stage` or `dev` (new commit on branch),
Netlify automatically deploys:

- **`stage` branch**: Netlify preview deployment
- **`dev` branch**: Netlify preview deployment

No explicit deploy job is required. Netlify's preview server
handles deployment automatically on branch updates.

#### Production Deployment (Main branch)

When code is merged to `Main`, Netlify deploys to production.

Production deployment targets the production branch/site.

#### Netlify Preview Server Configuration

The project leverages Netlify's automatic preview deployment system:

- **Stage Branch**: `stage` branch gets automatic deployment
- **Dev Branch**: `dev` branch gets automatic deployment
- **Production**: `Main` branch deploys to production site

**Required GitHub Secrets:**
- `NETLIFY_AUTH_TOKEN` - Netlify API authentication
- `NETLIFY_SITE_ID` - Netlify site identifier (single site)

**Netlify Configuration in netlify.toml:**
- Production branch: `Main`
- Deploy branches: `stage`, `dev`
- Environment variables configured per branch in Netlify UI

#### Validation Rules Summary

| Event | What Runs | Purpose |
|-------|-----------|---------|
| PR opened (any target) | Lint, build, tests, typecheck, coverage | Gate before merge |
| PR merged to stage | Netlify auto-deploy | Stage validation |
| PR merged to dev | Netlify auto-deploy | Dev validation |
| PR merged to Main | Netlify auto-deploy | Production release |

No checks run on branch pushes - only on PRs.

#### Implementation Requirements

- Validation MUST be implemented as GitHub Actions workflows
- Workflow files MUST be stored in `.github/workflows/`
- Netlify credentials MUST be stored securely in GitHub Secrets
- Secrets MUST NOT be hardcoded or logged in workflow output
- Pipeline configuration MUST be version-controlled alongside code
- Netlify preview server handles branch deployments automatically
- Only PR validation requires explicit CI workflow

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
- Coverage is NOT required on stage or main branch pipelines
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

### Branch Hierarchy

```
myfork (private)
    │
    ├── dev (active development)
    │     │
    │     ├── feature branches (merge into dev)
    │     │
    │     └── PR → stage
    │
    ├── stage (staging environment)
    │     │
    │     └── PR → main
    │
    └── main (production environment)
```

### Environment Variables

| Environment | Branch | Netlify Site ID | Purpose |
|-------------|--------|-----------------|---------|
| Stage | `stage` | `NETLIFY_SITE_ID_STAGE` | Pre-production validation |
| Production | `Main` | `NETLIFY_SITE_ID_MAIN` | Live application |

### Work Cycle

1. **Development**: Work in `dev` or feature branches
2. **Integration**: Merge feature branches into `dev`
3. **Stage Promotion**: PR from `dev` → `stage`
4. **Stage Validation**: Test in stage environment
5. **Production Promotion**: PR from `stage` → `Main`
6. **Production Deploy**: Automatic deployment to Netlify

### Pull Request Protocol

When opening a pull request:
- PR MUST target either `stage` or `Main` (never `dev`)
- PR MUST NOT be merged automatically or by AI
- PR MUST receive human review and approval before merge
- PR MUST pass all CI/CD pipeline checks before merge
- PR MUST include tests covering the feature (unless exempted)
- PR MUST meet coverage threshold for the affected feature area
- PR description MUST be clean and professional
- PR MUST NOT contain references to private context or tooling

### Branch Protection

- Never commit directly to `stage` or `Main`
- Never push raw development branches to `stage` or `Main`
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

**Version**: 1.5.4 | **Ratified**: 2026-06-24 | **Last Amended**: 2026-06-24
