# Data Model: Production Error Logging

**Feature**: 002-production-error-logging
**Date**: 2026-06-25

## Entities

### ErrorLogEntry

Represents a single captured error with full context.

| Field | Type | Description |
|-------|------|-------------|
| `type` | ErrorType | Classification of the error |
| `message` | string | Error message text |
| `source` | string | Source file URL or identifier |
| `line` | number | Line number (if available) |
| `column` | number | Column number (if available) |
| `stackTrace` | string | Full stack trace (if available) |
| `timestamp` | string | ISO 8601 timestamp |
| `context` | ErrorContext | Application state at time of error |
| `filtered` | boolean | Whether sensitive data was redacted |

### ErrorType (enum)

Classification of error types.

| Value | Description |
|-------|-------------|
| `error` | Uncaught JavaScript errors |
| `unhandledRejection` | Unhandled promise rejections |
| `consoleError` | Errors logged via console.error |
| `networkError` | Network request failures |
| `resourceError` | Resource loading failures |

### ErrorContext

Captures application state at time of error.

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | Current page URL |
| `userAgent` | string | Browser user agent string |
| `viewport` | string | Viewport dimensions (e.g., "1920x1080") |
| `pageTitle` | string | Current page title |
| `componentHierarchy` | string[] | React component tree (if applicable) |

## Relationships

```
ErrorLogEntry 1──1 ErrorContext
```

## State Transitions

### Error Lifecycle

```
[Occurs] → [Captured] → [Filtered] → [Formatted] → [Output]
```

1. **Occurs**: Error happens in browser
2. **Captured**: Error handler intercepts the error
3. **Filtered**: Sensitive data patterns are redacted
4. **Formatted**: Error converted to structured JSON
5. **Output**: Written to console.error and/or sent to server
