import { test, expect } from '@playwright/test';

test.describe('Social Dev Verification Test', () => {
  test('should load page and output social system validation logs', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      console.log(`[TEST BROWSER LOG] ${text}`);
      logs.push(text);
    });

    await page.goto('http://localhost:3000');

    // Wait up to 15 seconds for the social validation to complete
    let found = false;
    for (let i = 0; i < 30; i++) {
      if (logs.some(l => l.includes('[DEV_TEST_SOCIAL] Social dev verification run complete.'))) {
        found = true;
        break;
      }
      await page.waitForTimeout(500);
    }

    expect(found).toBe(true);
  });
});
