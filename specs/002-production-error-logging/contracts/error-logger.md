# Error Logger API Contract

**Feature**: 002-production-error-logging
**Date**: 2026-06-25

## Service Interface

### ErrorLogger

Primary interface for capturing and logging browser errors.

```typescript
interface ErrorLogger {
  /**
   * Initialize error logging with global handlers.
   * Must be called once at application startup.
   */
  init(): void;

  /**
   * Log an error with context.
   */
  logError(error: Error, context?: Partial<ErrorContext>): void;

  /**
   * Log a promise rejection with context.
   */
  logRejection(reason: unknown, context?: Partial<ErrorContext>): void;

  /**
   * Get all captured errors.
   */
  getErrors(): ErrorLogEntry[];

  /**
   * Clear captured errors.
   */
  clear(): void;
}
```

### ErrorFilter

Interface for filtering sensitive data from logs.

```typescript
interface ErrorFilter {
  /**
   * Check if content contains sensitive data.
   */
  containsSensitiveData(content: string): boolean;

  /**
   * Redact sensitive patterns from content.
   */
  redact(content: string): string;
}
```

### ErrorFormatter

Interface for formatting errors as structured JSON.

```typescript
interface ErrorFormatter {
  /**
   * Format an error into structured JSON.
   */
  format(type: ErrorType, error: Error | unknown, context: ErrorContext): ErrorLogEntry;

  /**
   * Format for console output (human-readable).
   */
  formatForConsole(entry: ErrorLogEntry): string;

  /**
   * Format for server output (JSON).
   */
  formatForServer(entry: ErrorLogEntry): string;
}
```

## Event Types

### Error Capture Events

```typescript
// Emitted when an error is captured
interface ErrorCapturedEvent {
  type: 'error:captured';
  entry: ErrorLogEntry;
}

// Emitted when sensitive data is filtered
interface DataFilteredEvent {
  type: 'data:filtered';
  original: string;
  redacted: string;
}
```

## Usage Patterns

### Basic Error Logging

```typescript
import { ErrorLogger } from './services/error-logger';

const logger = new ErrorLogger();
logger.init();

// Errors are now automatically captured
// They appear in browser console and are sent to server
```

### Component-Level Error Logging

```typescript
import { useErrorLogger } from './hooks/useErrorLogger';

function MyComponent() {
  const { logError } = useErrorLogger();

  const handleClick = () => {
    try {
      // risky operation
    } catch (error) {
      logError(error, { componentHierarchy: ['App', 'MyComponent'] });
    }
  };
}
```

### Custom Error Filtering

```typescript
import { ErrorFilter } from './services/error-filter';

const filter = new ErrorFilter();
const filtered = filter.redact('API key: sk_live_123456789');
// Result: 'API key: [REDACTED]'
```
