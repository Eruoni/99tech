import winston from 'winston';
import dotenv from 'dotenv';
import type { LogContext, TestLogMethods } from '../types/index.ts';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log levels and colors
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  verbose: 4
} as const;

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
  verbose: 'magenta'
} as const;

// Add colors to winston
winston.addColors(logColors);

// Create custom format
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format with colors
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Create transports array
const transports: winston.transport[] = [];

// Add console transport if enabled
if (process.env.LOG_TO_CONSOLE === 'true') {
  transports.push(
    new winston.transports.Console({
      level: process.env.LOG_LEVEL || 'info',
      format: consoleFormat,
      handleExceptions: true,
      handleRejections: true
    })
  );
}

// Add file transports if enabled
if (process.env.LOG_TO_FILE === 'true') {
  const logsDir = path.resolve(__dirname, '../../logs');
  
  // Combined logs
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      level: process.env.LOG_LEVEL || 'info',
      format: customFormat,
      handleExceptions: true,
      handleRejections: true,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );

  // Error logs
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: customFormat,
      handleExceptions: true,
      handleRejections: true,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );

  // Debug logs
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'debug.log'),
      level: 'debug',
      format: customFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 3
    })
  );

  // Test execution logs
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'test-execution.log'),
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      maxsize: 10485760, // 10MB
      maxFiles: 10
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  levels: logLevels,
  format: customFormat,
  transports: transports,
  exitOnError: false
});

// Create a stream for use with other libraries
const loggerStream = {
  write: (message: string): void => {
    logger.info(message.trim());
  }
};

// Add helper methods for test logging
const testLogger: TestLogMethods = {
  start: (testName: string, suite: string): void => {
    logger.info('Test Started', {
      test: testName,
      suite: suite,
      timestamp: new Date().toISOString(),
      type: 'test_start'
    });
  },

  end: (testName: string, suite: string, status: string, duration: number): void => {
    logger.info('Test Completed', {
      test: testName,
      suite: suite,
      status: status,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      type: 'test_end'
    });
  },

  step: (stepName: string, action: string, details: LogContext = {}): void => {
    logger.debug('Test Step', {
      step: stepName,
      action: action,
      details: details,
      timestamp: new Date().toISOString(),
      type: 'test_step'
    });
  },

  api: (method: string, url: string, status: number, responseTime: number, requestData: any = {}, responseData: any = {}): void => {
    logger.info('API Call', {
      method: method,
      url: url,
      status: status,
      responseTime: `${responseTime}ms`,
      request: requestData,
      response: responseData,
      timestamp: new Date().toISOString(),
      type: 'api_call'
    });
  },

  performance: (action: string, duration: number, threshold: number): void => {
    const level = duration > threshold ? 'warn' : 'info';
    logger[level]('Performance Metric', {
      action: action,
      duration: `${duration}ms`,
      threshold: `${threshold}ms`,
      passed: duration <= threshold,
      timestamp: new Date().toISOString(),
      type: 'performance'
    });
  },

  error: (error: Error, context: LogContext = {}): void => {
    logger.error('Test Error', {
      error: error.message,
      stack: error.stack,
      context: context,
      timestamp: new Date().toISOString(),
      type: 'test_error'
    });
  },

  screenshot: (testName: string, screenshotPath: string): void => {
    logger.info('Screenshot Captured', {
      test: testName,
      path: screenshotPath,
      timestamp: new Date().toISOString(),
      type: 'screenshot'
    });
  },

  assertion: (assertion: string, expected: any, actual: any, passed: boolean): void => {
    const level = passed ? 'info' : 'error';
    logger[level]('Assertion', {
      assertion: assertion,
      expected: expected,
      actual: actual,
      passed: passed,
      timestamp: new Date().toISOString(),
      type: 'assertion'
    });
  }
};

// Add suite-specific loggers
const createSuiteLogger = (suite: string) => winston.createLogger({
  levels: logLevels,
  format: customFormat,
  transports: transports,
  exitOnError: false,
  defaultMeta: { suite }
});

// Create extended logger object
const extendedLogger = Object.assign(logger, {
  test: testLogger,
  ui: createSuiteLogger('UI'),
  api: createSuiteLogger('API'),
  regression: createSuiteLogger('Regression'),
  performance: createSuiteLogger('Performance'),
  stream: loggerStream
});

// Handle uncaught exceptions
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection', {
    reason: reason,
    promise: promise.toString(),
    type: 'unhandled_rejection'
  });
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
    type: 'uncaught_exception'
  });
});

// Type the logger properly
export interface ExtendedLogger extends Omit<winston.Logger, 'stream'> {
  test: TestLogMethods;
  ui: winston.Logger;
  api: winston.Logger;
  regression: winston.Logger;
  performance: winston.Logger;
  stream: {
    write: (message: string) => void;
  };
}

export default extendedLogger as ExtendedLogger;