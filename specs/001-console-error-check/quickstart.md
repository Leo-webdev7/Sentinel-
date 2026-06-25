# Quickstart: Console Error Check & Fix

**Feature**: 001-console-error-check
**Date**: 2026-06-25

## Prerequisites

- Node.js >= 18.0.0
- Playwright browsers installed (`npx playwright install`)
- Project dependencies installed (`npm install`)

## Validation Scenarios

### Scenario 1: Basic Error Capture

**Goal**: Verify that console errors are captured from the running application

**Steps**:
1. Start the application in development mode: `npm run dev`
2. Run the E2E test that navigates through the application: `npx playwright test e2e/application-errors.spec.ts`
3. Verify the test captures console errors from the application (not from the monitor itself)

**Expected Outcome**: Test passes, showing captured errors with type, message, and source location from the application

### Scenario 2: Error Classification

**Goal**: Verify that errors are correctly categorized by type

**Steps**:
1. Create a test page with known error patterns:
   - JavaScript runtime error (undefined variable)
   - Network request to non-existent endpoint
   - Missing image resource
2. Run the monitor against this test page
3. Check that each error is classified correctly

**Expected Outcome**: Runtime errors marked as `runtime`, network failures as `network`, missing resources as `resource`

### Scenario 3: Fix Suggestions

**Goal**: Verify that appropriate fix suggestions are generated

**Steps**:
1. Capture a TypeError: "Cannot read property of undefined"
2. Run the fix analyzer on the captured error
3. Verify suggestion mentions optional chaining or null check

**Expected Outcome**: Fix suggestion is actionable and addresses the root cause

### Scenario 4: Sensitive Data Filtering

**Goal**: Verify that API keys and tokens are redacted

**Steps**:
1. Trigger an error that includes an API key in the message
2. Check the captured error output
3. Verify the API key is masked or removed

**Expected Outcome**: Sensitive data appears as `[REDACTED]` in error output

### Scenario 5: AI Agent JSON Export

**Goal**: Verify that error logs are exportable as structured JSON for AI agent consumption

**Steps**:
1. Capture multiple errors during a monitoring session
2. Export the error log as JSON
3. Verify the JSON contains: version, generatedAt, summary, errors array
4. Verify each error includes AIContext (surroundingCode, componentHierarchy, stateSnapshot)
5. Paste the JSON into an AI agent (Claude/GPT) and verify it can understand the errors

**Expected Outcome**: JSON output is valid, contains all required context fields, and AI agent can interpret errors without additional information

### Scenario 6: AI Agent Fix Verification

**Goal**: Verify that AI agent can fix errors using only the JSON log

**Steps**:
1. Capture a known error (e.g., TypeError: Cannot read property of undefined)
2. Export the error log as JSON
3. Provide the JSON to an AI agent with the instruction "Fix these errors"
4. Verify the AI agent suggests the correct fix (optional chaining or null check)

**Expected Outcome**: AI agent successfully identifies and suggests fix for the error using only the JSON context

## Running All Validations

```bash
# Unit tests
npm run test

# E2E tests
npx playwright test

# Full validation suite
npm run test && npx playwright test
```

## Success Criteria

All validation scenarios pass:
- ✅ Console errors captured in real-time
- ✅ Errors classified by type with 95%+ accuracy
- ✅ Fix suggestions provided for 80%+ of errors
- ✅ Sensitive data filtered from output
- ✅ JSON export contains all required AI context fields
- ✅ AI agent can understand and fix 80%+ of errors using JSON log
