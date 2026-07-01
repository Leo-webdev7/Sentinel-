# Research: Console Error Check & Fix

**Feature**: 001-console-error-check
**Date**: 2026-06-25

## Research Tasks

### 1. Playwright Console Event Listeners

**Decision**: Use Playwright's `page.on('console')` and `page.on('pageerror')` APIs

**Rationale**: Playwright provides native event-driven access to browser console output:
- `page.on('console')` captures all console API calls (log, warn, error, info, debug)
- `page.on('pageerror')` captures uncaught JavaScript exceptions
- `page.on('requestfailed')` captures network request failures
- Events fire in real-time as errors occur

**Alternatives considered**:
- Chrome DevTools Protocol directly: More complex, lower-level API
- Browser extension: Requires user installation, less automation
- Puppeteer: Similar but not in project; Playwright already present

### 2. Error Classification Strategy

**Decision**: Classify errors by source type based on event origin

**Rationale**: Different error types require different metadata extraction:
- Console errors (`page.on('console')`): Extract type, text, location from console message
- Page errors (`page.on('pageerror')`): Extract error object, stack trace
- Network errors (`page.on('requestfailed')`): Extract request URL, failure reason

**Alternatives considered**:
- Single unified parser: Less accurate for different error sources
- Browser-native error codes: Not consistently available across error types

### 3. Sensitive Data Filtering

**Decision**: Apply regex-based filtering for API keys, tokens, and credentials

**Rationale**: Error messages and stack traces may contain sensitive data. Filter patterns:
- API key formats (`sk-*`, `ak_*`, etc.)
- Bearer tokens
- Authorization headers
- Environment variable values accidentally logged

**Alternatives considered**:
- Server-side redaction: Not applicable for client-side errors
- Browser extension approach: Same filtering needed

### 4. Fix Suggestion Strategy

**Decision**: Pattern-matching against known error signatures

**Rationale**: Common errors have predictable patterns and solutions:
- `TypeError: Cannot read property of undefined` → Optional chaining suggestion
- `CORS errors` → Server configuration guidance
- `404 Not Found` → Resource path verification
- `Failed to fetch` → Network connectivity check

**Alternatives considered**:
- AI-powered analysis: Too slow for real-time, adds external dependency
- Manual lookup table: Limited scalability

### 5. AI-Agent-Readable Output Format

**Decision**: Structured JSON format optimized for AI agent consumption

**Rationale**: JSON provides the best balance of machine-readability and human-inspectability:
- Universally parseable by AI agents (Claude, GPT, etc.)
- Can include all context fields (surrounding code, component hierarchy, state)
- Copy-pasteable directly into AI agent conversations
- Easy to convert to other formats if needed
- Schema versioning for backward compatibility

**Alternatives considered**:
- Markdown report: Human-readable but harder for AI to parse programmatically
- Plain text: Too simple, loses structured context
- Both JSON + Markdown: Over-engineered for initial implementation

### 6. AI Context Collection Strategy

**Decision**: Capture surrounding code, component hierarchy, and state snapshots

**Rationale**: AI agents need sufficient context to understand errors without additional investigation:
- Surrounding code (5-10 lines) shows the error in context
- React component hierarchy helps understand UI-related errors
- State snapshot shows application state at time of error
- Reproduction steps help AI agents verify fixes

## Summary of Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| Collection | Playwright event listeners | Already in project, real-time, well-documented |
| Classification | Source-type based | Different events need different metadata extraction |
| Filtering | Regex patterns for sensitive data | Prevents accidental credential exposure |
| Fixes | Pattern matching | Fast, no external dependencies, covers common cases |
| Output Format | Structured JSON | Machine-readable, copy-pasteable, schema-versioned |
| AI Context | Code + hierarchy + state | Sufficient for AI agents to understand without investigation |
