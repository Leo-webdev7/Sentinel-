# Data Model: Console Error Check & Fix

**Feature**: 001-console-error-check
**Date**: 2026-06-25

## Entities

### ConsoleError

Represents a single captured browser console error with AI-agent context.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier for the error |
| `type` | ErrorType | Classification of the error |
| `message` | string | Error message text |
| `source` | string | Source file URL or identifier |
| `line` | number | Line number (if available) |
| `column` | number | Column number (if available) |
| `stackTrace` | string | Full stack trace (if available) |
| `timestamp` | Date | When the error was captured |
| `count` | number | How many times this error occurred |
| `filtered` | boolean | Whether sensitive data was redacted |
| `context` | AIContext | Additional context for AI agent consumption |

### AIContext

Contextual information to help AI agents understand and fix errors.

| Field | Type | Description |
|-------|------|-------------|
| `surroundingCode` | string | Code lines around the error location |
| `componentHierarchy` | string[] | React component tree from root to error source |
| `stateSnapshot` | Record<string, unknown> | Relevant application state at time of error |
| `reproductionSteps` | string[] | Steps to reproduce the error (if determinable) |
| `affectedFiles` | string[] | Files that may need modification to fix |

### ErrorType (enum)

Classification of console errors.

| Value | Description |
|-------|-------------|
| `runtime` | JavaScript runtime errors (TypeError, ReferenceError, etc.) |
| `network` | Network request failures (fetch, XHR, WebSocket) |
| `resource` | Resource loading failures (images, CSS, fonts) |
| `deprecation` | Browser deprecation warnings |
| `console` | General console API calls (log, warn, info) |

### FixSuggestion

Proposed resolution for an identified error.

| Field | Type | Description |
|-------|------|-------------|
| `errorId` | string | Reference to the ConsoleError |
| `pattern` | string | Matched error pattern |
| `suggestion` | string | Human-readable fix description |
| `confidence` | number | Confidence level (0-1) |
| `autoFixable` | boolean | Whether fix can be applied automatically |
| `codeDiff` | string | Preview of suggested code changes (unified diff format) |
| `explanation` | string | Detailed explanation of why this fix works |

### ErrorSummary

Aggregated view of all captured errors.

| Field | Type | Description |
|-------|------|-------------|
| `totalErrors` | number | Total unique errors |
| `totalOccurrences` | number | Total error occurrences |
| `byType` | Map<ErrorType, number> | Count by error type |
| `errors` | ConsoleError[] | All captured errors |
| `duration` | number | Monitoring duration in ms |

### ErrorLog

Structured JSON output optimized for AI agent consumption.

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | Schema version for AI agent compatibility |
| `generatedAt` | Date | When the log was generated |
| `applicationUrl` | string | URL of the application being monitored |
| `summary` | ErrorSummary | Aggregated error statistics |
| `errors` | AIErrorEntry[] | Errors with full context for AI agents |

### AIErrorEntry

Error entry formatted for AI agent consumption.

| Field | Type | Description |
|-------|------|-------------|
| `error` | ConsoleError | The captured error with context |
| `suggestions` | FixSuggestion[] | Possible fixes with code diffs |
| `relatedErrors` | string[] | IDs of errors with shared root causes |
| `priority` | number | Fix priority (1 = highest) |

## Relationships

```
ErrorSummary 1──* ConsoleError
ConsoleError 1──* FixSuggestion
ConsoleError 1──1 AIContext
ErrorLog 1──1 ErrorSummary
ErrorLog 1──* AIErrorEntry
AIErrorEntry 1──1 ConsoleError
AIErrorEntry 1──* FixSuggestion
```

## State Transitions

### Error Lifecycle

```
[Captured] → [Classified] → [Analyzed] → [Context Enriched] → [Fix Suggested]
```

1. **Captured**: Error received from Playwright event listener
2. **Classified**: Error assigned ErrorType based on source
3. **Analyzed**: Stack trace parsed, root cause identified
4. **Context Enriched**: AIContext populated with surrounding code, component hierarchy, state
5. **Fix Suggested**: Pattern matched, suggestion with code diff generated

### Monitoring Session

```
[Idle] → [Monitoring] → [Sweep Complete] → [Report Generated] → [JSON Exported]
```

1. **Idle**: No active monitoring
2. **Monitoring**: Playwright listeners active, errors being captured
3. **Sweep Complete**: Monitoring period ended
4. **Report Generated**: Final summary and suggestions ready
5. **JSON Exported**: ErrorLog in structured JSON format ready for AI agent
