# Quickstart: Production Error Logging

**Feature**: 002-production-error-logging
**Date**: 2026-06-25

## Prerequisites

- Node.js >= 18.0.0
- Project dependencies installed (`npm install`)

## Validation Scenarios

### Scenario 1: Automatic Error Capture

**Goal**: Verify that unhandled errors are automatically captured

**Steps**:
1. Start the application in development mode: `npm run dev`
2. Open browser devtools console
3. Trigger a JavaScript error (e.g., call undefined function)
4. Check console for structured error output

**Expected Outcome**: Error appears in console with type, message, source, line, stack trace, and context

### Scenario 2: Promise Rejection Capture

**Goal**: Verify that unhandled promise rejections are captured

**Steps**:
1. Start the application in development mode
2. Trigger an unhandled promise rejection
3. Check console for structured rejection output

**Expected Outcome**: Rejection appears with reason, stack trace, and context

### Scenario 3: Structured Log Format

**Goal**: Verify that logs contain all required context fields

**Steps**:
1. Trigger an error in the application
2. Inspect the console output
3. Verify JSON structure contains: type, message, source, line, column, stackTrace, timestamp, context

**Expected Outcome**: All required fields present in structured JSON format

### Scenario 4: Sensitive Data Filtering

**Goal**: Verify that API keys and tokens are redacted

**Steps**:
1. Trigger an error that includes an API key in the message
2. Check the console output
3. Verify the API key is masked or removed

**Expected Outcome**: Sensitive data appears as `[REDACTED]` in error output

### Scenario 5: Component Hierarchy Capture

**Goal**: Verify that React component hierarchy is captured for component errors

**Steps**:
1. Trigger an error within a React component
2. Check the console output for componentHierarchy field
3. Verify the hierarchy shows the component tree from root to error source

**Expected Outcome**: Component hierarchy array is present and accurate

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
- ✅ Unhandled errors automatically captured
- ✅ Promise rejections captured
- ✅ Structured JSON with all context fields
- ✅ Sensitive data filtered
- ✅ Component hierarchy captured for React errors
