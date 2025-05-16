// Debug utility for logging important events
export const debug = {
  log: (message: string, data?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      if (data) {
        console.log(`[DEBUG] ${message}`, data);
      } else {
        console.log(`[DEBUG] ${message}`);
      }
    }
  },
  
  error: (message: string, error?: any) => {
    if (process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_DEBUG_ERRORS === 'true') {
      if (error) {
        console.error(`[ERROR] ${message}`, error);
      } else {
        console.error(`[ERROR] ${message}`);
      }
    }
  },
  
  warn: (message: string, data?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      if (data) {
        console.warn(`[WARN] ${message}`, data);
      } else {
        console.warn(`[WARN] ${message}`);
      }
    }
  }
};

// Add a helper to trace API calls
export const traceApi = async <T>(
  name: string, 
  fn: () => Promise<T>
): Promise<T> => {
  debug.log(`API call started: ${name}`);
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    debug.log(`API call successful: ${name} (${duration}ms)`);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    debug.error(`API call failed: ${name} (${duration}ms)`, error);
    throw error;
  }
}; 