import { test, expect } from '@playwright/test';

/**
 * Starts a new split with the given number of people (tabbed view is the
 * default) and lands on the Details page.
 */
async function startSplit(page, personCount) {
  await page.goto('/');
  await page.getByPlaceholder('Persons').fill(String(personCount));
  await page.getByRole('button', { name: 'GO!' }).click();
  await expect(page.getByRole('tab')).toHaveCount(personCount);
}

test.describe('Split bills flow', () => {
  test('entering a person count creates one tab per person', async ({ page }) => {
    await startSplit(page, 3);

    await expect(page.getByRole('tab', { name: 'Name 1' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Name 2' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Name 3' })).toBeVisible();
  });

  test('adding a food row, entering a cost, and sharing it splits the total between sharers', async ({ page }) => {
    await startSplit(page, 2);

    // Each person starts with one empty food row; fill it in on the first tab.
    await page.getByPlaceholder('Item').fill('Pizza');
    await page.getByPlaceholder('Cost').fill('20');

    // Reveal the per-item sharer checkboxes.
    await page.locator('button:has(i.mdi-account-multiple)').first().click();

    // Both people are shared with by default when a food item is added.
    const nameOneShare = page.getByRole('checkbox', { name: 'Name 1' });
    const nameTwoShare = page.getByRole('checkbox', { name: 'Name 2' });
    await expect(nameOneShare).toBeChecked();
    await expect(nameTwoShare).toBeChecked();
    await expect(page.getByText('Per Pax: 10')).toBeVisible();

    // Person-level and grand totals reflect the $20 item.
    await expect(page.locator('span:has(i.mdi-sigma)').first()).toHaveText('20');
    await expect(page.getByText('Expenditure:')).toBeVisible();
    await expect(page.getByText('Name 1 10.00', { exact: true })).toBeVisible();
    await expect(page.getByText('Name 2 10.00', { exact: true })).toBeVisible();

    // Name 2 owes Name 1 for their half of the shared pizza. The "Amount
    // Owed" section renders two alternate views (summary vs. detailed); only
    // one is visible at a time, so scope to the visible one specifically.
    await expect(page.getByText('Amount Owed:')).toBeVisible();
    const visibleAmountOwedPanel = page.locator('.bg-teal-accent-1.pa-1').nth(2);
    await expect(visibleAmountOwedPanel).toContainText('Name 1');
    await expect(visibleAmountOwedPanel).toContainText('10.00');
  });

  test('unchecking a sharer excludes them from the split and updates totals', async ({ page }) => {
    await startSplit(page, 2);

    await page.getByPlaceholder('Item').fill('Pizza');
    await page.getByPlaceholder('Cost').fill('20');
    await page.locator('button:has(i.mdi-account-multiple)').first().click();

    // Remove Name 2 from the sharers so Name 1 covers the whole cost alone.
    await page.getByRole('checkbox', { name: 'Name 2' }).uncheck();

    await expect(page.getByText('Per Pax: 20')).toBeVisible();
    await expect(page.getByText('Name 1 20.00', { exact: true })).toBeVisible();
    // Name 2 no longer owes anything once removed from the item's sharers.
    await expect(page.getByText('Name 2 0.00', { exact: true })).toBeVisible();
  });

  test('a second food row on the same person adds to their running total', async ({ page }) => {
    await startSplit(page, 2);

    await page.getByPlaceholder('Item').fill('Pizza');
    await page.getByPlaceholder('Cost').fill('20');

    // Add a second food row for the same (first) person.
    await page.locator('button:has(i.mdi-plus)').first().click();
    await page.getByPlaceholder('Item').nth(1).fill('Drinks');
    await page.getByPlaceholder('Cost').nth(1).fill('10');

    // Person total combines both items (default: shared by everyone).
    await expect(page.locator('span:has(i.mdi-sigma)').first()).toHaveText('30');
  });

  test('switching tabs shows each person their own food items', async ({ page }) => {
    await startSplit(page, 2);

    await page.getByPlaceholder('Item').fill('Pizza');
    await page.getByPlaceholder('Cost').fill('20');

    await page.getByRole('tab', { name: 'Name 2' }).click();

    // Name 2's tab starts with its own empty food row, not Name 1's Pizza.
    await expect(page.getByPlaceholder('Item')).toHaveValue('');
    await expect(page.getByPlaceholder('Cost')).toBeEmpty();

    // The shared expenditure summary still reflects both people's totals.
    await expect(page.getByText('Name 1 10.00', { exact: true })).toBeVisible();
    await expect(page.getByText('Name 2 10.00', { exact: true })).toBeVisible();
  });
});
