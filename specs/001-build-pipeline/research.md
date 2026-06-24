# Research: Build Pipeline

**Feature**: 001-build-pipeline
**Date**: 2026-06-24
**Updated**: 2026-06-24 - All PRs trigger checks, E2E for Main/stage/dev, per-diff coverage

## Existing Workflow Analysis

### Current State

| Workflow | Trigger | Purpose | Status |
|----------|---------|---------|--------|
| `ci.yml` | push/PR to `prod` | Lint, build, e2e | Needs update |
| `deploy.yml` | push to `Main` | Build, deploy | Remove (auto-deploy) |
| `prod-merge-gate.yml` | PR to `main` | Gate for prod→main | Remove (auto-deploy) |
| `opensky-sync.yml` | schedule/dispatch | Data sync | Keep as-is |

### Gap Analysis

| Requirement | Current | Gap |
|-------------|---------|-----|
| dev branch | ❌ Not configured | Add dev branch in myfork |
| stage branch | ❌ Not configured | Add stage branch |
| PR validation only | ❌ Current has branch checks | Remove branch workflows |
| Auto-deploy via Netlify | ❌ Current uses actions-netlify | Configure Netlify previews |
| All PRs trigger checks | ❌ Current only targets prod | Update trigger to all PRs |
| E2E conditional | ❌ Current always runs E2E | Make E2E conditional on target |
| Per-diff coverage | ❌ Current uses global coverage | Implement per-PR-diff coverage |

## Technical Decisions

### Decision 1: Branch Hierarchy

**Decision**: Three-tier hierarchy: dev → stage → Main

**Rationale**: Constitution v1.5.4 defines dev → stage → Main
workflow. User confirmed `dev` branch will be created in myfork.

**Configuration**:
- `dev` branch: Create in myfork (private development)
- `stage` branch: Exists in sentinel-upstream (staging)
- `Main` branch: Exists in sentinel-upstream (production)

### Decision 2: Workflow File Organization

**Decision**: Single workflow file for PR validation only

**Rationale**: Constitution v1.5.4 clarifies that checks run ONLY
on PRs. No validation runs on branch pushes. Netlify handles
deployment automatically when branches receive new commits.

**New Workflow Structure**:
- `ci.yml` - PR validation (triggers on ALL PRs)
- No stage.yml or production.yml needed (Netlify auto-deploys)

### Decision 3: PR Pipeline Trigger Branches

**Decision**: Trigger on ALL PRs, regardless of target branch

**Rationale**: User clarification - PR pipeline should trigger
all the time, no matter which branch is targeted.

**E2E Test Condition**:
- E2E tests run when PR targets `Main`, `stage`, or `dev`
- E2E tests MAY be skipped for other target branches

### Decision 4: Coverage Tool

**Decision**: Use Vitest's built-in coverage (v8 provider)

**Rationale**: Already in devDependencies, no new dependencies needed.

**Coverage Strategy**:
- Per-PR-diff: changed lines must have 70% coverage
- Not global or per-file coverage

### Decision 5: Netlify Deployment Method

**Decision**: Use Netlify's automatic preview deployment system

**Rationale**: Constitution v1.5.4 specifies that Netlify preview
server handles branch deployments automatically. No explicit
deploy jobs needed. Netlify triggers on branch push events.

**Configuration**:
- `netlify.toml` defines production branch and deploy branches
- `stage` and `dev` branches get automatic preview deployments
- `Main` branch deploys to production site

### Decision 6: Environment Isolation

**Decision**: Single Netlify site with branch-based environments

**Rationale**: Constitution v1.5.4 uses Netlify preview server
with branch deploys. Single site with different branches for
stage and dev. Main branch deploys to production.

**Configuration**:
- Production branch: `Main`
- Deploy branches: `stage`, `dev`
- Environment variables configured per branch in Netlify UI

## Best Practices

### GitHub Actions (PR Validation Only)

- Use `actions/checkout@v4` (latest stable)
- Use `actions/setup-node@v4` with npm caching
- Use matrix strategy for parallel lint/build/test
- Set appropriate timeouts on jobs
- Fail fast on any check failure
- Conditional E2E based on PR target branch

### Coverage Reporting

- Use `--coverage` flag with Vitest
- Implement per-PR-diff coverage using vitest-coverage-diff or similar
- Output in multiple formats for different consumers
- Fail PR if coverage drops below threshold on changed lines
- Report coverage in PR comments (future enhancement)

### Netlify Free Tier

- 300 build minutes/month
- 1 concurrent build
- Use branch deploys for stage and dev
- Use production branch for Main
- Store artifacts with appropriate retention

## Implementation Notes

### Required GitHub Secrets

| Secret | Purpose | Required |
|--------|---------|----------|
| `NETLIFY_AUTH_TOKEN` | Netlify API auth | Yes |
| `NETLIFY_SITE_ID` | Netlify site identifier | Yes |

### Workflow Structure

**PR Pipeline (ci.yml) - triggers on ALL PRs**:
1. lint → 2. build → 3. tests → 4. typecheck → 5. coverage → 6. e2e (conditional)

**E2E Condition**:
```yaml
e2e:
  if: github.event.pull_request.base.ref == 'Main' || 
      github.event.pull_request.base.ref == 'stage' || 
      github.event.pull_request.base.ref == 'dev'
```

**Branch Deployment (automatic via Netlify)**:
- PR merged to stage → Netlify auto-deploys stage
- PR merged to dev → Netlify auto-deploys dev
- PR merged to Main → Netlify auto-deploys production

### Netlify Configuration (netlify.toml)

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "24"

[context.production]
  branch = "Main"

[context.deploy-preview]
  branch = "stage"

[context.branch-deploy]
  branch = "dev"
```
