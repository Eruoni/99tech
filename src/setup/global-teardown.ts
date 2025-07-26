import { FullConfig } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

/**
 * Global teardown function that runs after all tests
 * Focused on cleanup and essential post-test tasks
 * @param config - Playwright full configuration
 */
async function globalTeardown(config: FullConfig): Promise<void> {
  const teardownStartTime = Date.now();
  
  logger.info('🏁 Starting Global Teardown', {
    timestamp: new Date().toISOString()
  });

  try {
    // 1. Process and archive test artifacts
    await processTestArtifacts();

    // 2. Cleanup temporary files
    await cleanupTemporaryFiles();

    // 3. Archive important logs
    await archiveLogs();

    // 4. Generate performance summary
    // Later, when we apply performance test
    // await generatePerformanceSummary();

    // 5. Send notifications (if configured)
    // Later, after our CI ready
    // await sendNotifications();

    // 6. Cleanup browser processes
    await cleanupBrowserProcesses();

    // 7. Generate final summary
    await generateFinalSummary();

    const teardownEndTime = Date.now();
    const teardownDuration = teardownEndTime - teardownStartTime;

    logger.info('✅ Global Teardown Completed Successfully', {
      duration: `${teardownDuration}ms`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const teardownEndTime = Date.now();
    const teardownDuration = teardownEndTime - teardownStartTime;
    
    logger.error('❌ Global Teardown Failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${teardownDuration}ms`,
      timestamp: new Date().toISOString()
    });
    
    // Continue with basic cleanup even if some steps fail
    await basicCleanup();
  }
}

/**
 * Process and organize test artifacts
 */
async function processTestArtifacts(): Promise<void> {
  logger.info('📁 Processing test artifacts');

  try {
    const artifactsDir = path.join(__dirname, '../../test-artifacts');
    await fs.mkdir(artifactsDir, { recursive: true });

    // Organize screenshots
    await organizeArtifacts('screenshots', /\.(png|jpg|jpeg)$/i);
    
    // Organize videos
    await organizeArtifacts('videos', /\.(webm|mp4)$/i);
    
    // Organize traces
    await organizeArtifacts('traces', /\.zip$/i);
    
    // Copy important logs
    await copyImportantLogs();

    logger.info('✅ Test artifacts processed');

  } catch (error) {
    logger.error('Failed to process test artifacts', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Organize artifacts by type and date
 */
async function organizeArtifacts(artifactType: string, pattern: RegExp): Promise<void> {
  try {
    const sourceDir = artifactType;
    const targetDir = path.join(__dirname, '../../test-artifacts', artifactType);
    
    await fs.mkdir(targetDir, { recursive: true });
    
    const files = await fs.readdir(sourceDir).catch(() => []);
    
    for (const file of files) {
      if (pattern.test(file)) {
        const sourcePath = path.join(sourceDir, file);
        const targetPath = path.join(targetDir, file);
        
        try {
          await fs.copyFile(sourcePath, targetPath);
        } catch (error) {
          logger.debug(`Failed to copy ${file}`, {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }

    logger.debug(`Organized ${artifactType} artifacts`, {
      sourceDir,
      targetDir,
      fileCount: files.length
    });

  } catch (error) {
    logger.warn(`Failed to organize ${artifactType} artifacts`, {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Copy important logs to artifacts
 */
async function copyImportantLogs(): Promise<void> {
  try {
    const logsDir = path.join(__dirname, '../../test-artifacts/logs');
    await fs.mkdir(logsDir, { recursive: true });

    const importantLogs = [
      'logs/combined.log',
      'logs/error.log',
      'logs/test-execution.log'
    ];

    for (const logPath of importantLogs) {
      try {
        const fileName = path.basename(logPath);
        await fs.copyFile(logPath, path.join(logsDir, fileName));
      } catch {
        // Log file doesn't exist, skip
      }
    }

  } catch (error) {
    logger.warn('Failed to copy important logs', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Cleanup temporary files and directories
 */
async function cleanupTemporaryFiles(): Promise<void> {
  logger.info('🧹 Cleaning up temporary files');

  try {
    const tempDirs = [
      'temp',
      '.temp',
      'tmp'
    ];

    for (const dir of tempDirs) {
      try {
        await fs.rmdir(dir, { recursive: true });
        logger.debug(`Removed temporary directory: ${dir}`);
      } catch {
        // Directory doesn't exist or can't be removed, ignore
      }
    }

    // Clean up old log files (keep last 7 days)
    await cleanupOldLogFiles();

    logger.info('✅ Temporary files cleaned up');

  } catch (error) {
    logger.error('Failed to cleanup temporary files', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Clean up old log files (older than 7 days)
 */
async function cleanupOldLogFiles(): Promise<void> {
  try {
    const logsDir = path.join(__dirname, '../../logs');
    const files = await fs.readdir(logsDir).catch(() => []);
    
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    for (const file of files) {
      const filePath = path.join(logsDir, file);
      const stats = await fs.stat(filePath).catch(() => null);
      
      if (stats && stats.mtime.getTime() < sevenDaysAgo) {
        await fs.unlink(filePath);
        logger.debug(`Removed old log file: ${file}`);
      }
    }

  } catch (error) {
    logger.warn('Failed to cleanup old log files', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Archive important logs
 */
async function archiveLogs(): Promise<void> {
  logger.info('📦 Archiving logs');

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveDir = path.join(__dirname, '../../logs/archive');
    await fs.mkdir(archiveDir, { recursive: true });

    // Archive current logs
    const logFiles = ['combined.log', 'error.log', 'test-execution.log'];
    
    for (const logFile of logFiles) {
      const sourcePath = path.join(__dirname, '../../logs', logFile);
      const archivePath = path.join(archiveDir, `${timestamp}-${logFile}`);
      
      try {
        await fs.copyFile(sourcePath, archivePath);
        logger.debug(`Archived log file: ${logFile}`);
      } catch {
        // Log file doesn't exist, skip
      }
    }

    logger.info('✅ Logs archived', {
      archiveDir,
      timestamp
    });

  } catch (error) {
    logger.error('Failed to archive logs', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Generate performance summary from logs
 */
async function generatePerformanceSummary(): Promise<void> {
  logger.info('⚡ Generating performance summary');

  try {
    // Collect performance data from logs
    const performanceData = await collectPerformanceData();
    
    // Generate performance report
    const performanceReport = {
      summary: {
        totalMeasurements: performanceData.length,
        averagePageLoad: calculateAverage(performanceData.filter(d => d.type === 'pageLoad'), 'duration'),
        averageApiResponse: calculateAverage(performanceData.filter(d => d.type === 'apiResponse'), 'duration'),
        slowestPageLoad: Math.max(...performanceData.filter(d => d.type === 'pageLoad').map(d => d.duration || 0)),
        slowestApiResponse: Math.max(...performanceData.filter(d => d.type === 'apiResponse').map(d => d.duration || 0))
      },
      thresholds: {
        pageLoadThreshold: parseInt(process.env.PAGE_LOAD_THRESHOLD || '5000'),
        apiResponseThreshold: parseInt(process.env.API_RESPONSE_THRESHOLD || '3000')
      },
      violations: performanceData.filter(d => 
        (d.type === 'pageLoad' && d.duration > parseInt(process.env.PAGE_LOAD_THRESHOLD || '5000')) ||
        (d.type === 'apiResponse' && d.duration > parseInt(process.env.API_RESPONSE_THRESHOLD || '3000'))
      ),
      timestamp: new Date().toISOString()
    };

    // Save performance report
    const reportsDir = path.join(__dirname, '../../test-results');
    await fs.mkdir(reportsDir, { recursive: true });
    
    await fs.writeFile(
      path.join(reportsDir, 'performance-summary.json'),
      JSON.stringify(performanceReport, null, 2)
    );

    logger.info('✅ Performance summary generated', {
      totalMeasurements: performanceReport.summary.totalMeasurements,
      violations: performanceReport.violations.length,
      avgPageLoad: Math.round(performanceReport.summary.averagePageLoad),
      avgApiResponse: Math.round(performanceReport.summary.averageApiResponse)
    });

  } catch (error) {
    logger.error('Failed to generate performance summary', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Collect performance data from logs
 */
async function collectPerformanceData(): Promise<Array<{
  testName: string;
  type: 'pageLoad' | 'apiResponse';
  duration: number;
  timestamp: string;
}>> {
  const performanceData: Array<{
    testName: string;
    type: 'pageLoad' | 'apiResponse';
    duration: number;
    timestamp: string;
  }> = [];

  try {
    const logFile = path.join(__dirname, '../../logs/test-execution.log');
    const logContent = await fs.readFile(logFile, 'utf-8').catch(() => '');
    
    const lines = logContent.split('\n');
    
    for (const line of lines) {
      if (line.includes('"type":"performance"')) {
        try {
          const logEntry = JSON.parse(line);
          
          if (logEntry.action && logEntry.duration) {
            const duration = parseInt(logEntry.duration.replace('ms', ''));
            
            performanceData.push({
              testName: logEntry.action || 'unknown',
              type: logEntry.action.includes('API') ? 'apiResponse' : 'pageLoad',
              duration: duration,
              timestamp: logEntry.timestamp
            });
          }
        } catch {
          // Skip malformed log entries
        }
      }
    }

  } catch (error) {
    logger.warn('Failed to collect performance data', {
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return performanceData;
}

/**
 * Calculate average from performance data
 */
function calculateAverage(data: Array<{ duration: number }>, field: 'duration'): number {
  if (data.length === 0) return 0;
  const sum = data.reduce((acc, item) => acc + item[field], 0);
  return sum / data.length;
}

/**
 * Send notifications if configured
 */
async function sendNotifications(): Promise<void> {
  logger.info('📧 Processing notifications');

  try {
    // Check if notifications are configured
    const notificationConfig = {
      email: process.env.EMAIL_NOTIFICATIONS === 'true',
      slack: process.env.SLACK_NOTIFICATIONS === 'true',
      teams: process.env.TEAMS_NOTIFICATIONS === 'true'
    };

    if (!notificationConfig.email && !notificationConfig.slack && !notificationConfig.teams) {
      logger.info('⏭️ No notifications configured');
      return;
    }

    // Collect basic test summary for notifications
    const testSummary = {
      timestamp: new Date().toISOString(),
      environment: process.env.BASE_URL || 'unknown',
      browser: process.env.BROWSER || 'chromium',
      testSuite: process.env.TEST_SUITE || 'all'
    };
    
    // Send notifications based on configuration
    if (notificationConfig.email) {
      logger.info('📧 Email notification would be sent here', testSummary);
    }
    
    if (notificationConfig.slack) {
      logger.info('📱 Slack notification would be sent here', testSummary);
    }
    
    if (notificationConfig.teams) {
      logger.info('👥 Teams notification would be sent here', testSummary);
    }

    logger.info('✅ Notifications processed');

  } catch (error) {
    logger.error('Failed to send notifications', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Cleanup browser processes
 */
async function cleanupBrowserProcesses(): Promise<void> {
  logger.info('🌐 Cleaning up browser processes');

  try {
    // This is platform-specific cleanup
    if (process.platform === 'win32') {
      // Windows cleanup
      await execAsync('taskkill /f /im chrome.exe /t').catch(() => {});
      await execAsync('taskkill /f /im firefox.exe /t').catch(() => {});
      await execAsync('taskkill /f /im msedge.exe /t').catch(() => {});
    } else {
      // Unix-like systems cleanup
      await execAsync('pkill -f "chrome|chromium"').catch(() => {});
      await execAsync('pkill -f "firefox"').catch(() => {});
      await execAsync('pkill -f "webkit"').catch(() => {});
    }

    logger.info('✅ Browser processes cleaned up');

  } catch (error) {
    logger.warn('Browser process cleanup completed with warnings', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Generate final summary
 */
async function generateFinalSummary(): Promise<void> {
  logger.info('📋 Generating final summary');

  try {
    const finalSummary = {
      execution: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'test',
        browser: process.env.BROWSER || 'chromium',
        baseUrl: process.env.BASE_URL,
        testSuite: process.env.TEST_SUITE || 'all'
      },
      artifacts: {
        reportsGenerated: await checkReportsGenerated(),
        screenshotsCaptured: await countFiles('screenshots', '.png'),
        videosCaptured: await countFiles('videos', '.webm'),
        tracesCaptured: await countFiles('traces', '.zip')
      },
      performance: {
        performanceSummaryGenerated: await fileExists('test-results/performance-summary.json')
      }
    };

    // Save final summary
    const summaryFile = path.join(__dirname, '../../test-results/final-summary.json');
    await fs.writeFile(summaryFile, JSON.stringify(finalSummary, null, 2));

    // Log final summary to console
    logger.info('🎯 Test Execution Complete', finalSummary);

  } catch (error) {
    logger.error('Failed to generate final summary', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Basic cleanup for emergency situations
 */
async function basicCleanup(): Promise<void> {
  logger.info('⚠️ Performing basic cleanup');

  try {
    // Basic browser cleanup
    if (process.platform !== 'win32') {
      await execAsync('pkill -f "chrome|chromium|firefox|webkit"').catch(() => {});
    }

    logger.info('✅ Basic cleanup completed');

  } catch (error) {
    logger.error('Basic cleanup failed', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// Helper Functions

/**
 * Check if reports were generated
 */
async function checkReportsGenerated(): Promise<string[]> {
  const reports: string[] = [];
  
  const reportPaths = [
    'allure-report/index.html',
    'playwright-report/index.html'
  ];

  for (const reportPath of reportPaths) {
    try {
      await fs.access(reportPath);
      reports.push(reportPath);
    } catch {
      // Report doesn't exist
    }
  }

  return reports;
}

/**
 * Count files in directory with specific extension
 */
async function countFiles(directory: string, extension: string): Promise<number> {
  try {
    const files = await fs.readdir(directory);
    return files.filter(file => file.endsWith(extension)).length;
  } catch {
    return 0;
  }
}

/**
 * Check if file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export default globalTeardown;