# Console Monitor API Contract

**Feature**: 001-console-error-check
**Date**: 2026-06-25

## Service Interface

### ConsoleMonitor

Primary interface for capturing and analyzing browser console errors.

```typescript
interface ConsoleMonitor {
  /**
   * Start monitoring console events on a Playwright page.
   * Errors are captured in real-time via event listeners.
   */
  startMonitoring(page: Page): void;

  /**
   * Stop monitoring and return all captured errors.
   */
  stopMonitoring(): ErrorSummary;

  /**
   * Get current error summary without stopping monitoring.
   */
  getSummary(): ErrorSummary;

  /**
   * Clear all captured errors and reset counters.
   */
  clear(): void;
}
```

### ErrorClassifier

Interface for classifying captured errors by type.

```typescript
interface ErrorClassifier {
  /**
   * Classify a console message into an ErrorType.
   */
  classify(message: ConsoleMessage): ErrorType;

  /**
   * Classify a page error into an ErrorType.
   */
  classifyError(error: Error): ErrorType;
}
```

### FixAnalyzer

Interface for generating fix suggestions.

```typescript
interface FixAnalyzer {
  /**
   * Analyze an error and return fix suggestions.
   */
  analyze(error: ConsoleError): FixSuggestion[];

  /**
   * Check if a fix can be applied automatically.
   */
  canAutoFix(error: ConsoleError): boolean;
}
```

### AIContextCollector

Interface for enriching errors with AI-agent context.

```typescript
interface AIContextCollector {
  /**
   * Collect surrounding code, component hierarchy, and state for an error.
   */
  collectContext(error: ConsoleError, page: Page): Promise<AIContext>;

  /**
   * Get React component hierarchy from root to error source.
   */
  getComponentHierarchy(error: ConsoleError): string[];

  /**
   * Capture relevant application state at time of error.
   */
  getStateSnapshot(): Record<string, unknown>;
}
```

### ErrorLogExporter

Interface for exporting errors in AI-agent-optimized JSON format.

```typescript
interface ErrorLogExporter {
  /**
   * Export all captured errors as structured JSON for AI agent consumption.
   */
  exportToJSON(summary: ErrorSummary): ErrorLog;

  /**
   * Export to JSON and copy to clipboard.
   */
  exportAndCopy(summary: ErrorSummary): Promise<string>;

  /**
   * Export to JSON file.
   */
  exportToFile(summary: ErrorSummary, filePath: string): Promise<void>;
}
```

## Event Types

### Console Capture Events

```typescript
// Emitted when a new error is captured
interface ErrorCapturedEvent {
  type: 'error:captured';
  error: ConsoleError;
}

// Emitted when monitoring starts
interface MonitoringStartedEvent {
  type: 'monitoring:started';
  timestamp: Date;
}

// Emitted when monitoring stops
interface MonitoringStoppedEvent {
  type: 'monitoring:stopped';
  summary: ErrorSummary;
}
```

## Usage Patterns

### Basic Monitoring

```typescript
const monitor = new ConsoleMonitor();
monitor.startMonitoring(page);

// ... perform actions that may trigger errors ...

const summary = monitor.stopMonitoring();
console.log(`Found ${summary.totalErrors} unique errors`);
```

### With Fix Suggestions

```typescript
const analyzer = new FixAnalyzer();
const summary = monitor.stopMonitoring();

for (const error of summary.errors) {
  const suggestions = analyzer.analyze(error);
  console.log(`${error.message}: ${suggestions[0].suggestion}`);
}
```

### AI Agent Workflow

```typescript
const monitor = new ConsoleMonitor();
const contextCollector = new AIContextCollector();
const exporter = new ErrorLogExporter();

// Start monitoring
monitor.startMonitoring(page);

// ... perform actions that may trigger errors ...

// Stop and collect context
const summary = monitor.stopMonitoring();

// Enrich errors with AI context
for (const error of summary.errors) {
  error.context = await contextCollector.collectContext(error, page);
}

// Export as JSON for AI agent
const errorLog = exporter.exportToJSON(summary);
console.log(JSON.stringify(errorLog, null, 2));

// Or copy to clipboard for direct paste to AI agent
await exporter.exportAndCopy(summary);
```
