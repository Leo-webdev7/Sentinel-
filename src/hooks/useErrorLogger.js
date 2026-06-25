/**
 * useErrorLogger.js
 * React hook for component-level error logging.
 */

import { useCallback } from 'react';
import { ErrorLogger } from '../services/error-logger.js';

/**
 * React hook for logging errors with component context.
 * @returns {{ logError: (error: Error, context?: object) => void, logRejection: (reason: unknown, context?: object) => void, getErrors: () => import('../types/error-logging.js').ErrorLogEntry[], clear: () => void }}
 */
export function useErrorLogger() {
  const logError = useCallback((error, context) => {
    ErrorLogger.logError(error, context);
  }, []);

  const logRejection = useCallback((reason, context) => {
    ErrorLogger.logRejection(reason, context);
  }, []);

  const getErrors = useCallback(() => {
    return ErrorLogger.getErrors();
  }, []);

  const clear = useCallback(() => {
    ErrorLogger.clear();
  }, []);

  return { logError, logRejection, getErrors, clear };
}
