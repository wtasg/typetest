import { test, expect } from '@playwright/test';

function makeRun(id: string, daysAgo: number, wpm: number, accuracy: number) {
  const startedAt = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
  return {
    id: `run-${id}`,
    startedAt,
    durationMs: 10000,
    status: 'COMPLETED',
    syncStatus: 'synced',
    sourceId: 'src-1',
    sourceName: 'sample.txt',
    selection: { start: 0, end: 100 },
    fullFile: true,
    gameType: 'normal',
    metrics: {
      raw: { rawWPM: wpm + 5, totalKeystrokes: wpm * 10 },
      effective: { effectiveWPM: wpm, accuracy, correctChars: wpm * 8 },
    },
  };
}

test.describe('Reports View E2E Test Suite', () => {

  test.beforeEach(async ({ page }) => {
    // Clear storage before each test case
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      indexedDB.deleteDatabase('typetest');
    });
    await page.reload();
  });

  test('0 runs: renders empty state messages across all tabs', async ({ page }) => {
    await page.click('button:has-text("Reports")');
    await expect(page.locator('h2')).toHaveText('Reports');

    // Previous Run tab
    await expect(page.locator('.empty-state')).toHaveText('No runs yet.');

    // Prev Prev Run tab
    await page.click('button:has-text("Prev Prev Run")');
    await expect(page.locator('.empty-state')).toHaveText('No second run yet.');

    // Last 7 Days tab
    await page.click('button:has-text("Last 7 Days")');
    await expect(page.locator('.empty-state')).toHaveText('No runs in the last 7 days.');

    // Last 30 Days tab
    await page.click('button:has-text("Last 30 Days")');
    await expect(page.locator('.empty-state')).toHaveText('No runs in the last 30 days.');

    // All Time tab
    await page.click('button:has-text("All Time")');
    await expect(page.locator('.empty-state')).toHaveText('No runs recorded yet.');
  });

  test('1 run: renders single run view, aggregate stats, and chart fallback', async ({ page }) => {
    const singleRun = makeRun('1', 1, 55, 96.5);
    await page.evaluate((data) => {
      localStorage.setItem('tt:runSummaries', JSON.stringify([data]));
    }, singleRun);

    await page.reload();
    await page.click('button:has-text("Reports")');

    // Previous Run tab
    await expect(page.locator('.run-wpm')).toHaveText('55 WPM');
    await expect(page.locator('.run-acc')).toHaveText('96.5% acc');

    // Last 7 Days tab
    await page.click('button:has-text("Last 7 Days")');
    await expect(page.locator('.aggregate-stat:has-text("Runs") .value')).toHaveText('1');
    await expect(page.locator('.aggregate-stat:has-text("Avg WPM") .value')).toHaveText('55');
    await expect(page.locator('.aggregate-stat:has-text("Best WPM") .value')).toHaveText('55');
    await expect(page.locator('.aggregate-stat:has-text("Avg Accuracy") .value')).toHaveText('97%');
    await expect(page.locator('.empty-state')).toHaveText('Need at least 2 runs for trend charts.');
    await expect(page.locator('.run-row')).toHaveCount(1);

    // Return to Previous Run
    await page.click('button:has-text("Previous Run")');
    await expect(page.locator('.run-wpm')).toHaveText('55 WPM');
  });

  test('2 runs: renders single run comparisons and D3 trend charts', async ({ page }) => {
    const run1 = makeRun('1', 3, 40, 90);
    const run2 = makeRun('2', 1, 60, 100);
    await page.evaluate((data) => {
      localStorage.setItem('tt:runSummaries', JSON.stringify(data));
    }, [run2, run1]); // most recent first

    await page.reload();
    await page.click('button:has-text("Reports")');

    // Previous Run tab (most recent: run2)
    await expect(page.locator('.run-wpm')).toHaveText('60 WPM');

    // Prev Prev Run tab (second most recent: run1)
    await page.click('button:has-text("Prev Prev Run")');
    await expect(page.locator('.run-wpm')).toHaveText('40 WPM');

    // Last 7 Days tab
    await page.click('button:has-text("Last 7 Days")');
    await expect(page.locator('.aggregate-stat:has-text("Runs") .value')).toHaveText('2');
    await expect(page.locator('.aggregate-stat:has-text("Avg WPM") .value')).toHaveText('50'); // (40+60)/2
    await expect(page.locator('.aggregate-stat:has-text("Best WPM") .value')).toHaveText('60');
    await expect(page.locator('.aggregate-stat:has-text("Avg Accuracy") .value')).toHaveText('95%'); // (90+100)/2
    await expect(page.locator('svg.d3-chart')).toHaveCount(2); // WpmChart and AccuracyChart
    await expect(page.locator('.run-row')).toHaveCount(2);
  });

  test('10 runs: renders 10 runs history and accurate multi-run trend charts', async ({ page }) => {
    const runs = [];
    for (let i = 1; i <= 10; i++) {
      runs.push(makeRun(String(i), i * 2, 30 + i * 4, 90 + i)); // WPM from 34 to 70, days from 2 to 20
    }
    // Sort most recent first
    runs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    await page.evaluate((data) => {
      localStorage.setItem('tt:runSummaries', JSON.stringify(data));
    }, runs);

    await page.reload();
    await page.click('button:has-text("Reports")');

    // All Time tab
    await page.click('button:has-text("All Time")');
    await expect(page.locator('.aggregate-stat:has-text("Runs") .value')).toHaveText('10');
    await expect(page.locator('.aggregate-stat:has-text("Best WPM") .value')).toHaveText('70');
    await expect(page.locator('svg.d3-chart')).toHaveCount(2);
    await expect(page.locator('.run-row')).toHaveCount(10);

    // Seamless tab switching back and forth
    await page.click('button:has-text("Last 7 Days")');
    await expect(page.locator('.aggregate-stat:has-text("Runs") .value')).not.toHaveText('0');

    await page.click('button:has-text("Previous Run")');
    await expect(page.locator('.run-wpm')).toBeVisible();
  });
});
