# Research: Production Error Logging

**Feature**: 002-production-error-logging
**Date**: 2026-06-25

## Research Tasks

### 1. Browser Error Capture APIs

**Decision**: Use window.onerror, window.onunhandledrejection, and console.error interception

**Rationale**: Browser-native APIs provide comprehensive error capture:
- `window.onerror`: Captures uncaught JavaScript errors with source, line, column
- `window.onunhandledrejection`: Captures unhandled promise rejections
- `console.error` interception: Captures errors logged via console.error
- No external dependencies required

**Alternatives considered**:
- Error Boundary (React): Only catches component lifecycle errors, not all errors
- Source Map parsing: Adds complexity, not needed for structured logs

### 2. Component Hierarchy Capture

**Decision**: Use React DevTools hook internals or component stack tracing

**Rationale**: For errors within React components, capture the component tree:
- React provides `React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED` for stack traces
- Alternative: Parse stack trace to extract component names
- Trade-off: Full hierarchy vs. simplified stack-based approximation

**Alternatives considered**:
- Full React DevTools integration: Too heavy for production logging
- Manual wrapping: Requires changes to every component

### 3. Server-Side Output

**Decision**: Use console.error for browser, fetch to server endpoint for server stdout

**Rationale**: Browser console.error goes to browser devtools; for server stdout:
- Option A: Send via fetch to a server endpoint that logs to stdout
- Option B: Use WebSocket for real-time streaming
- Option C: Batch and send periodically
- Recommended: Simple fetch POST to existing server endpoint

**Alternatives considered**:
- Direct stdout from browser: Not possible (browser has no stdout)
- localStorage: Not visible to server

### 4. Sensitive Data Filtering

**Decision**: Regex-based filtering for common sensitive patterns

**Rationale**: Filter before logging to prevent credential exposure:
- API key formats (sk-*, ak_*, etc.)
- Bearer tokens in headers
- Authorization headers
- Environment variable values

**Alternatives considered**:
- Server-side filtering: Too late, data already transmitted
- Browser extension approach: Same filtering needed

### 5. JSON Structure for Logs

**Decision**: Structured JSON with error, context, and timestamp fields

**Rationale**: JSON provides machine-readable, parseable output:
```json
{
  "type": "error|warning|info",
  "message": "Error message",
  "source": "file URL",
  "line": 123,
  "column": 45,
  "stackTrace": "full stack",
  "timestamp": "ISO 8601",
  "context": {
    "url": "current page URL",
    "userAgent": "browser user agent",
    "viewport": "1920x1080",
    "componentHierarchy": ["App", "Dashboard", "Map"]
  }
}
```

## Summary of Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| Browser Capture | window.onerror + onunhandledrejection | Native, comprehensive, no dependencies |
| Component Hierarchy | Stack trace parsing | Lightweight, no React internals dependency |
| Server Output | fetch POST to endpoint | Simple, reliable, existing infrastructure |
| Filtering | Regex patterns | Fast, covers common patterns |
| Format | Structured JSON | Machine-readable, parseable |
