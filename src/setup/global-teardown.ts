import { FullConfig } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../config/logger.js';
import type { TestResult } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

/**
 * Global teardown function that runs after all tests
 * @param config - Playwright full configuration
 */
async function globalTeardown(config: FullConfig): Promise<void> {
  const teardownStartTime = Date.now();
  
  logger.info('🏁 Starting Global Teardown', {
    timestamp: new Date().toISOString()
  });

  try {
    // 1. Generate test execution report
    await generateTestExecutionReport();

    // 2. Process and archive test artifacts
    await processTestArtifacts();

    // 3. Generate Allure report
    await generateAllureReport();

    // 4. Cleanup temporary files
    await cleanupTemporaryFiles();

    // 5. Archive important logs
    await archiveLogs();

    // 6. Generate performance summary
    await generatePerformanceSummary();

    // 7. Send notifications (if configured)
    await sendNotifications();

    // 8. Cleanup browser processes
    await cleanupBrowserProcesses();

    // 9. Generate final summary
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
 * Generate comprehensive test execution report
 */
async function generateTestExecutionReport(): Promise<void> {
  logger.info('📊 Generating test execution report');

  try {
    // Read test results from various sources
    const testResults = await collectTestResults();
    
    // Generate HTML report
    const htmlReport = generateHtmlReport(testResults);
    
    // Generate JSON report
    const jsonReport = generateJsonReport(testResults);
    
    // Save reports
    const reportsDir = path.join(__dirname, '../../test-results/reports');
    await fs.mkdir(reportsDir, { recursive: true });
    
    await fs.writeFile(
      path.join(reportsDir, 'execution-report.html'),
      htmlReport
    );
    
    await fs.writeFile(
      path.join(reportsDir, 'execution-report.json'),
      JSON.stringify(jsonReport, null, 2)
    );

    logger.info('✅ Test execution report generated', {
      totalTests: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      skipped: testResults.skipped
    });

  } catch (error) {
    logger.error('Failed to generate test execution report', {
      error: error instanceof Error ? error.message : String(error)
    });
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
    await organizeArtifacts('screenshots', '**/*.png');
    
    // Organize videos
    await organizeArtifacts('videos', '**/*.webm');
    
    // Organize traces
    await organizeArtifacts('traces', '**/*.zip');
    
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
 * Generate Allure report if enabled
 */
async function generateAllureReport(): Promise<void> {
  if (!process.env.ALLURE_RESULTS_DIR) {
    logger.info('⏭️ Allure report generation skipped (not configured)');
    return;
  }

  logger.info('📊 Generating Allure report');

  try {
    // Check if allure-results directory exists and has files
    const allureResultsDir = process.env.ALLURE_RESULTS_DIR || 'allure-results';
    const allureReportDir = process.env.ALLURE_REPORT_DIR || 'allure-report';
    
    const resultFiles = await fs.readdir(allureResultsDir).catch(() => []);
    
    if (resultFiles.length === 0) {
      logger.warn('No Allure results found to generate report');
      return;
    }

    // Generate Allure report
    const command = `npx allure generate ${allureResultsDir} --clean -o ${allureReportDir}`;
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('WARNING')) {
      logger.warn('Allure generation warnings', { stderr });
    }

    // Generate Allure trend data
    await generateAllureTrends();

    logger.info('✅ Allure report generated', {
      resultsDir: allureResultsDir,
      reportDir: allureReportDir,
      resultFiles: resultFiles.length
    });

  } catch (error) {
    logger.error('Failed to generate Allure report', {
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
 * Generate performance summary
 */
async function generatePerformanceSummary(): Promise<void> {
  logger.info('⚡ Generating performance summary');

  try {
    // Collect performance data from logs
    const performanceData = await collectPerformanceData();
    
    // Generate performance report
    const performanceReport = {
      summary: {
        totalTests: performanceData.length,
        averagePageLoad: calculateAverage(performanceData, 'pageLoad'),
        averageApiResponse: calculateAverage(performanceData, 'apiResponse'),
        slowestPageLoad: Math.max(...performanceData.map(d => d.pageLoad || 0)),
        slowestApiResponse: Math.max(...performanceData.map(d => d.apiResponse || 0))
      },
      thresholds: {
        pageLoadThreshold: parseInt(process.env.PAGE_LOAD_THRESHOLD || '5000'),
        apiResponseThreshold: parseInt(process.env.API_RESPONSE_THRESHOLD || '3000')
      },
      violations: performanceData.filter(d => 
        (d.pageLoad && d.pageLoad > parseInt(process.env.PAGE_LOAD_THRESHOLD || '5000')) ||
        (d.apiResponse && d.apiResponse > parseInt(process.env.API_RESPONSE_THRESHOLD || '3000'))
      ),
      timestamp: new Date().toISOString()
    };

    // Save performance report
    const reportsDir = path.join(__dirname, '../../test-results/reports');
    await fs.mkdir(reportsDir, { recursive: true });
    
    await fs.writeFile(
      path.join(reportsDir, 'performance-summary.json'),
      JSON.stringify(performanceReport, null, 2)
    );

    logger.info('✅ Performance summary generated', {
      totalTests: performanceReport.summary.totalTests,
      violations: performanceReport.violations.length,
      avgPageLoad: performanceReport.summary.averagePageLoad,
      avgApiResponse: performanceReport.summary.averageApiResponse
    });

  } catch (error) {
    logger.error('Failed to generate performance summary', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
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

    // Collect test summary for notifications
    const testSummary = await collectTestSummary();
    
    // Send notifications based on configuration
    if (notificationConfig.email) {
      await sendEmailNotification(testSummary);
    }
    
    if (notificationConfig.slack) {
      await sendSlackNotification(testSummary);
    }
    
    if (notificationConfig.teams) {
      await sendTeamsNotification(testSummary);
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
    const testResults = await collectTestResults();
    const performanceData = await collectPerformanceData();
    
    const finalSummary = {
      execution: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'test',
        browser: process.env.BROWSER || 'chromium',
        baseUrl: process.env.BASE_URL,
        testSuite: process.env.TEST_SUITE || 'all'
      },
      results: testResults,
      performance: {
        averagePageLoad: calculateAverage(performanceData, 'pageLoad'),
        averageApiResponse: calculateAverage(performanceData, 'apiResponse'),
        performanceViolations: performanceData.filter(d => 
          (d.pageLoad && d.pageLoad > 5000) || (d.apiResponse && d.apiResponse > 3000)
        ).length
      },
      artifacts: {
        reportsGenerated: await checkReportsGenerated(),
        screenshotsCaptured: await countFiles('screenshots', '.png'),
        videosCaptured: await countFiles('videos', '.webm'),
        tracesCaptured: await countFiles('traces', '.zip')
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
    // Remove auth files
    await fs.unlink('auth/state.json').catch(() => {});
    await fs.unlink('auth/cookies.json').catch(() => {});
    
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
 * Collect test results from multiple sources
 */
async function collectTestResults(): Promise<{
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  tests: TestResult[];
}> {
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
    tests: [] as TestResult[]
  };

  try {
    // Try to read Playwright JSON results
    const playwrightResultsPath = 'test-results/results.json';
    const playwrightResults = await fs.readFile(playwrightResultsPath, 'utf-8')
      .then(data => JSON.parse(data))
      .catch(() => null);

    if (playwrightResults) {
      results.total = playwrightResults.stats?.total || 0;
      results.passed = playwrightResults.stats?.passed || 0;
      results.failed = playwrightResults.stats?.failed || 0;
      results.skipped = playwrightResults.stats?.skipped || 0;
      results.duration = playwrightResults.stats?.duration || 0;
    }

    // Try to read JUnit results as fallback
    const junitResultsPath = 'test-results/junit.xml';
    await fs.access(junitResultsPath).then(async () => {
      // JUnit XML parsing would go here if needed
      logger.debug('JUnit results file found');
    }).catch(() => {
      logger.debug('No JUnit results file found');
    });

  } catch (error) {
    logger.warn('Failed to collect complete test results', {
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return results;
}

/**
 * Organize artifacts by type and date
 */
async function organizeArtifacts(artifactType: string, pattern: string): Promise<void> {
  try {
    const sourceDir = artifactType;
    const targetDir = path.join(__dirname, '../../test-artifacts', artifactType);
    
    await fs.mkdir(targetDir, { recursive: true });
    
    const files = await fs.readdir(sourceDir).catch(() => []);
    
    for (const file of files) {
      if (file.match(pattern.replace('**/', '').replace('*', '.*'))) {
        const sourcePath = path.join(sourceDir, file);
        const targetPath = path.join(targetDir, file);
        
        await fs.copyFile(sourcePath, targetPath);
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
 * Generate Allure trend data
 */
async function generateAllureTrends(): Promise<void> {
  try {
    const trendsDir = path.join(__dirname, '../../allure-report/history');
    await fs.mkdir(trendsDir, { recursive: true });

    // Basic trend data structure
    const trendData = {
      buildOrder: Date.now(),
      reportUrl: 'allure-report/index.html',
      data: {
        total: 0,
        passed: 0,
        failed: 0,
        broken: 0,
        skipped: 0,
        unknown: 0
      }
    };

    const trendsFile = path.join(trendsDir, 'trends.json');
    await fs.writeFile(trendsFile, JSON.stringify([trendData], null, 2));

  } catch (error) {
    logger.warn('Failed to generate Allure trends', {
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
 * Collect performance data from logs
 */
async function collectPerformanceData(): Promise<Array<{
  testName: string;
  pageLoad?: number;
  apiResponse?: number;
  timestamp: string;
}>> {
  const performanceData: Array<{
    testName: string;
    pageLoad?: number;
    apiResponse?: number;
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
          
          performanceData.push({
            testName: logEntry.action || 'unknown',
            pageLoad: logEntry.action === 'Page Navigation' ? parseInt(logEntry.duration) : undefined,
            apiResponse: logEntry.action?.includes('API') ? parseInt(logEntry.duration) : undefined,
            timestamp: logEntry.timestamp
          });
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
function calculateAverage(data: Array<any>, field: string): number {
  const values = data.map(d => d[field]).filter(v => v !== undefined && v !== null);
  return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
}

/**
 * Collect test summary for notifications
 */
async function collectTestSummary(): Promise<{
  total: number;
  passed: number;
  failed: number;
  duration: string;
  environment: string;
}> {
  const results = await collectTestResults();
  
  return {
    total: results.total,
    passed: results.passed,
    failed: results.failed,
    duration: `${Math.round(results.duration / 1000)}s`,
    environment: process.env.BASE_URL || 'unknown'
  };
}

/**
 * Send email notification (placeholder)
 */
async function sendEmailNotification(summary: any): Promise<void> {
  logger.info('📧 Email notification would be sent here', summary);
  // Implementation would depend on email service (SendGrid, SES, etc.)
}

/**
 * Send Slack notification (placeholder)
 */
async function sendSlackNotification(summary: any): Promise<void> {
  logger.info('📱 Slack notification would be sent here', summary);
  // Implementation would use Slack webhook or API
}

/**
 * Send Teams notification (placeholder)
 */
async function sendTeamsNotification(summary: any): Promise<void> {
  logger.info('👥 Teams notification would be sent here', summary);
  // Implementation would use Teams webhook
}

/**
 * Check if reports were generated
 */
async function checkReportsGenerated(): Promise<string[]> {
  const reports: string[] = [];
  
  const reportPaths = [
    'test-results/reports/execution-report.html',
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
 * Generate HTML report content
 */
function generateHtmlReport(results: any): string {
  const passRate = results.total > 0 ? ((results.passed / results.total) * 100).toFixed(1) : '0';
  
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Test Execution Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f0f0f0; padding: 20px; border-radius: 5px; }
        .stats { display: flex; gap: 20px; margin: 20px 0; }
        .stat-card { background: #fff; border: 1px solid #ddd; padding: 15px; border-radius: 5px; text-align: center; }
        .passed { border-left: 4px solid #4caf50; }
        .failed { border-left: 4px solid #f44336; }
        .skipped { border-left: 4px solid #ff9800; }
        .pass-rate { border-left: 4px solid #2196f3; }
    </style>
</head>
<body>
    <div class="header">
        <h1>OrangeHRM Test Execution Report</h1>
        <p>Generated: ${new Date().toISOString()}</p>
        <p>Environment: ${process.env.BASE_URL}</p>
        <p>Browser: ${process.env.BROWSER || 'chromium'}</p>
    </div>
    
    <div class="stats">
        <div class="stat-card passed">
            <h3>${results.passed}</h3>
            <p>Passed</p>
        </div>
        <div class="stat-card failed">
            <h3>${results.failed}</h3>
            <p>Failed</p>
        </div>
        <div class="stat-card skipped">
            <h3>${results.skipped}</h3>
            <p>Skipped</p>
        </div>
        <div class="stat-card pass-rate">
            <h3>${passRate}%</h3>
            <p>Pass Rate</p>
        </div>
    </div>
    
    <h2>Summary</h2>
    <p>Total Tests: ${results.total}</p>
    <p>Duration: ${Math.round(results.duration / 1000)}s</p>
    <p>Status: ${results.failed === 0 ? '✅ PASSED' : '❌ FAILED'}</p>
</body>
</html>`;
}

/**
 * Generate JSON report content
 */
function generateJsonReport(results: any): any {
  return {
    timestamp: new Date().toISOString(),
    environment: {
      baseUrl: process.env.BASE_URL,
      browser: process.env.BROWSER || 'chromium',
      testSuite: process.env.TEST_SUITE || 'all'
    },
    summary: {
      total: results.total,
      passed: results.passed,
      failed: results.failed,
      skipped: results.skipped,
      passRate: results.total > 0 ? ((results.passed / results.total) * 100) : 0,
      duration: results.duration
    },
    status: results.failed === 0 ? 'PASSED' : 'FAILED'
  };
}

export default globalTeardown;