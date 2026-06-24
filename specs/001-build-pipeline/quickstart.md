# Quickstart: Build Pipeline Validation

**Feature**: 001-build-pipeline
**Date**: 2026-06-24
**Updated**: 2026-06-24 - All PRs trigger checks, E2E for Main/stage/dev

## Prerequisites

- GitHub repository with Actions enabled
- Netlify account with site configured
- GitHub Secrets configured:
  - `NETLIFY_AUTH_TOKEN`
  - `NETLIFY_SITE_ID`
- `dev` branch created in myfork

## Branch Workflow

```
myfork (private)
    │
    ├── dev (active development) ← CREATE THIS
    │     │
    │     ├── feature branches (merge into dev)
    │     │
    │     └── PR → stage
    │
    ├── stage (staging environment)
    │     │
    │     └── PR → Main
    │
    └── Main (production environment)
```

## Deployment Model

| Event | What Happens | Automation |
|-------|--------------|------------|
| PR opened (any target) | Lint, build, tests, typecheck, coverage | GitHub Actions |
| PR targets Main/stage/dev | + E2E tests | GitHub Actions |
| PR merged to stage | Netlify auto-deploys | Netlify preview server |
| PR merged to dev | Netlify auto-deploys | Netlify preview server |
| PR merged to Main | Netlify auto-deploys | Netlify preview server |

## Validation Scenarios

### Scenario 1: PR Pipeline (any target)

**Objective**: Verify PR pipeline runs on all PRs

**Steps**:
1. Create a feature branch from `dev`
2. Make a code change
3. Push and open PR targeting any branch
4. Observe GitHub Actions runs

**Expected Outcome**:
- Lint job starts
- Build job starts after lint
- Tests job starts after build
- Typecheck job starts after tests
- Coverage job starts after typecheck
- PR shows green status when all pass

**Commands**:
```bash
git checkout dev
git checkout -b test/pr-pipeline
echo "// test" >> src/App.jsx
git add . && git commit -m "test: trigger PR pipeline"
git push origin test/pr-pipeline
# Open PR on GitHub targeting any branch
```

### Scenario 2: PR Pipeline with E2E (Main/stage/dev target)

**Objective**: Verify E2E tests run when targeting Main, stage, or dev

**Steps**:
1. Create PR targeting `Main`, `stage`, or `dev`
2. Observe GitHub Actions runs
3. Verify E2E job executes

**Expected Outcome**:
- All standard checks pass
- E2E job runs and passes
- PR shows green status

### Scenario 3: Stage Deployment (Automatic)

**Objective**: Verify stage deployment triggers on stage merge

**Steps**:
1. Merge a valid PR to `stage`
2. Netlify automatically deploys
3. Verify deployment completes to stage environment

**Expected Outcome**:
- No GitHub Actions workflow runs (deployment is automatic)
- Netlify preview server deploys stage branch
- Stage site is updated

### Scenario 4: Production Deployment (Automatic)

**Objective**: Verify production deployment triggers on Main merge

**Steps**:
1. Merge a valid PR to `Main`
2. Netlify automatically deploys
3. Verify deployment completes to production

**Expected Outcome**:
- No GitHub Actions workflow runs (deployment is automatic)
- Netlify preview server deploys Main branch to production
- Production site is updated

### Scenario 5: Secret Management

**Objective**: Verify secrets are properly injected

**Steps**:
1. Check workflow references secrets
2. Run PR validation
3. Verify no secrets in logs

**Expected Outcome**:
- `NETLIFY_AUTH_TOKEN` referenced as secret
- `NETLIFY_SITE_ID` referenced for deployment
- No secret values appear in workflow output

### Scenario 6: Coverage Threshold (Per-Diff)

**Objective**: Verify coverage is checked per-PR-diff

**Steps**:
1. Create PR with uncovered new code
2. Observe coverage check fails
3. Add tests to cover new code
4. Verify coverage check passes

**Expected Outcome**:
- Coverage fails when changed lines < 70% covered
- Coverage passes when changed lines >= 70% covered

## Troubleshooting

### Pipeline Not Triggering

- Verify GitHub Actions is enabled for repository
- Check workflow file exists in `.github/workflows/ci.yml`
- Ensure PR is opened (not just pushed)

### E2E Tests Not Running

- Verify PR targets Main, stage, or dev
- Check Playwright is installed and configured
- Verify E2E tests exist in `e2e/` directory

### Coverage Check Failing

- Run `npm run test:coverage` locally
- Check coverage report in `coverage/` directory
- Identify uncovered changed lines
- Add tests for uncovered code

### Deployment Not Happening

- Verify Netlify is connected to repository
- Check Netlify build settings match netlify.toml
- Verify branch is in deploy branches list
- Check Netlify dashboard for deploy logs

## Success Criteria

- [ ] PR pipeline triggers on ALL PRs
- [ ] All standard checks run: lint, build, tests, typecheck, coverage
- [ ] E2E tests run when PR targets Main, stage, or dev
- [ ] PR merge blocked if any check fails
- [ ] Coverage check enforces 70% threshold on changed lines
- [ ] Stage deployment auto-triggers on stage merge
- [ ] Dev deployment auto-triggers on dev merge
- [ ] Production deployment auto-triggers on Main merge
- [ ] No secrets exposed in logs
- [ ] PR pipelines complete within 15 minutes
