import { test, expect } from '@playwright/test';

test.describe('Chat Playground Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a specific agent's playground
    // You'll need to replace this with an actual agent ID from your database
    await page.goto('/dashboard/agents/c9faa713-65ae-4b58-a6f4-782cbc8c5a99/playground');

    // Wait for the page to load
    await page.waitForSelector('text=Playground', { timeout: 10000 });
  });

  test('should display playground interface correctly', async ({ page }) => {
    // Check if main elements are visible
    await expect(page.locator('text=Model')).toBeVisible();
    await expect(page.locator('text=Temperature')).toBeVisible();
    await expect(page.locator('text=System prompt')).toBeVisible();

    // Check for chat interface
    const chatHeader = page.locator('h2:has-text("AI Assistant")').or(page.locator('h2:has-text("PronoiaTest")'));
    await expect(chatHeader).toBeVisible();

    // Check for input field
    await expect(page.locator('input[placeholder="Type your message..."]')).toBeVisible();
  });

  test('should send and receive chat messages', async ({ page }) => {
    // Type a message
    const input = page.locator('input[placeholder="Type your message..."]');
    await input.fill('Hello, can you help me?');

    // Send the message
    await page.locator('button:has(svg)').last().click(); // Click send button

    // Wait for user message to appear
    await expect(page.locator('text=Hello, can you help me?')).toBeVisible({ timeout: 5000 });

    // Wait for bot response (with typing indicator)
    await expect(page.locator('text=Typing').or(page.locator('.animate-bounce'))).toBeVisible({ timeout: 10000 });

    // Wait for actual response
    await page.waitForTimeout(3000); // Give time for response

    // Check that there are at least 2 messages (user + assistant)
    const messages = await page.locator('[class*="rounded-2xl"]').count();
    expect(messages).toBeGreaterThanOrEqual(2);
  });

  test('should clear conversation when refresh button is clicked', async ({ page }) => {
    // Send a message first
    const input = page.locator('input[placeholder="Type your message..."]');
    await input.fill('Test message');
    await page.locator('button:has(svg)').last().click();

    // Wait for message to appear
    await expect(page.locator('text=Test message')).toBeVisible({ timeout: 5000 });

    // Click refresh/clear button
    await page.locator('button[title="Clear conversation"]').click();

    // Check that conversation is cleared
    await expect(page.locator('text=Start a Conversation')).toBeVisible({ timeout: 5000 });
  });

  test('should copy chat to clipboard', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Send a message
    const input = page.locator('input[placeholder="Type your message..."]');
    await input.fill('Test for clipboard');
    await page.locator('button:has(svg)').last().click();

    // Wait for message to appear
    await expect(page.locator('text=Test for clipboard')).toBeVisible({ timeout: 5000 });

    // Click copy button
    const copyButton = page.locator('button:has(svg)').filter({ hasText: '' }).nth(1); // Copy button is usually second icon button
    await copyButton.click();

    // Check for success toast
    await expect(page.locator('text=Chat copied to clipboard')).toBeVisible({ timeout: 5000 });
  });

  test('should adjust temperature slider', async ({ page }) => {
    // Find temperature slider
    const slider = page.locator('input[type="range"]');

    // Get initial value
    const initialValue = await slider.inputValue();

    // Change temperature
    await slider.fill('0.8');

    // Verify value changed
    const newValue = await slider.inputValue();
    expect(newValue).toBe('0.8');

    // Check that the display value updated
    await expect(page.locator('text=0.8')).toBeVisible();
  });

  test('should save agent settings', async ({ page }) => {
    // Change temperature
    const slider = page.locator('input[type="range"]');
    await slider.fill('0.9');

    // Click save button
    await page.locator('button:has-text("Save to agent")').click();

    // Check for success message
    await expect(page.locator('text=Agent settings saved')).toBeVisible({ timeout: 5000 });
  });

  test('should change AI model', async ({ page }) => {
    // Click on model dropdown
    const modelSelect = page.locator('select').first();

    // Check that options are available
    const options = await modelSelect.locator('option').count();
    expect(options).toBeGreaterThan(1);

    // Select a different model
    await modelSelect.selectOption({ index: 1 });

    // Verify selection changed
    const selectedValue = await modelSelect.inputValue();
    expect(selectedValue).toBeTruthy();
  });

  test('should show agent status', async ({ page }) => {
    // Check for status indicator
    const statusElement = page.locator('text=Agent status').locator('..');
    await expect(statusElement).toBeVisible();

    // Check for status badge (Trained, Training, or Draft)
    const statusBadge = page.locator('span:has-text("Trained")').or(
      page.locator('span:has-text("Training")')
    ).or(
      page.locator('span:has-text("Draft")')
    );
    await expect(statusBadge).toBeVisible();
  });

  test('should handle Enter key to send message', async ({ page }) => {
    // Type a message
    const input = page.locator('input[placeholder="Type your message..."]');
    await input.fill('Testing enter key');

    // Press Enter
    await input.press('Enter');

    // Check message was sent
    await expect(page.locator('text=Testing enter key')).toBeVisible({ timeout: 5000 });
  });

  test('should show online status indicator', async ({ page }) => {
    // Check for online status
    await expect(page.locator('text=Online')).toBeVisible();

    // Check for green status dot
    const greenDot = page.locator('span.bg-green-500');
    await expect(greenDot).toBeVisible();
  });
});