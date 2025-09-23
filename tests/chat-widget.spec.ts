import { test, expect } from '@playwright/test';

test.describe('Chat Widget Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to deploy page
    await page.goto('/dashboard/agents/c9faa713-65ae-4b58-a6f4-782cbc8c5a99/deploy');

    // Wait for page to load
    await page.waitForSelector('text=Deploy Your Agent', { timeout: 10000 });
  });

  test('should display deploy page correctly', async ({ page }) => {
    // Check main elements
    await expect(page.locator('h1:has-text("Deploy Your Agent")')).toBeVisible();

    // Check tabs
    await expect(page.locator('button:has-text("Website Widget")')).toBeVisible();
    await expect(page.locator('button:has-text("API Access")')).toBeVisible();
    await expect(page.locator('button:has-text("Integrations")')).toBeVisible();
  });

  test('should show embed code', async ({ page }) => {
    // Check for embed code section
    await expect(page.locator('text=Quick Start')).toBeVisible();
    await expect(page.locator('text=AlonChat Widget')).toBeVisible();

    // Check for code block
    const codeBlock = page.locator('pre code');
    await expect(codeBlock).toBeVisible();

    // Verify code contains necessary elements
    const codeContent = await codeBlock.textContent();
    expect(codeContent).toContain('alonchat');
    expect(codeContent).toContain('agentId');
  });

  test('should copy embed code to clipboard', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Click copy button
    const copyButton = page.locator('button:has(svg)').filter({ hasText: '' }).first();
    await copyButton.click();

    // Check for success message
    await expect(page.locator('text=Widget code copied to clipboard!')).toBeVisible({ timeout: 5000 });

    // Check that button shows checkmark
    await expect(page.locator('svg.text-green-400')).toBeVisible();
  });

  test('should show and hide live preview', async ({ page }) => {
    // Initially, preview should not be active
    await expect(page.locator('text=Click "Show Live Preview"')).toBeVisible();

    // Click show preview button
    await page.locator('button:has-text("Show Live Preview")').click();

    // Check that preview is shown
    await expect(page.locator('text=This is how your chat widget will appear')).toBeVisible();

    // Check for floating widget button
    await expect(page.locator('button:has(svg.h-6.w-6)').last()).toBeVisible({ timeout: 5000 });

    // Click hide preview
    await page.locator('button:has-text("Hide Preview")').click();

    // Preview should be hidden
    await expect(page.locator('text=Click "Show Live Preview"')).toBeVisible();
  });

  test('should open chat widget when clicking floating button', async ({ page }) => {
    // Show live preview
    await page.locator('button:has-text("Show Live Preview")').click();

    // Wait for floating button
    await page.waitForSelector('button:has(svg.h-6.w-6)', { timeout: 5000 });

    // Click floating chat button
    const floatingButton = page.locator('button:has(svg.h-6.w-6)').last();
    await floatingButton.click();

    // Check that chat modal opens
    await expect(page.locator('text=Online').last()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[placeholder="Type your message..."]').last()).toBeVisible();
  });

  test('should send message in widget', async ({ page }) => {
    // Show live preview and open widget
    await page.locator('button:has-text("Show Live Preview")').click();
    await page.waitForTimeout(1000);

    const floatingButton = page.locator('button:has(svg.h-6.w-6)').last();
    await floatingButton.click();

    // Type and send message
    const input = page.locator('input[placeholder="Type your message..."]').last();
    await input.fill('Hello from widget test');

    // Send message
    const sendButton = page.locator('button:has(svg.h-4.w-4)').last();
    await sendButton.click();

    // Check message appears
    await expect(page.locator('text=Hello from widget test')).toBeVisible({ timeout: 5000 });
  });

  test('should minimize chat widget', async ({ page }) => {
    // Show preview and open widget
    await page.locator('button:has-text("Show Live Preview")').click();
    await page.waitForTimeout(1000);

    const floatingButton = page.locator('button:has(svg.h-6.w-6)').last();
    await floatingButton.click();

    // Find minimize button
    const minimizeButton = page.locator('button:has(svg)').filter({ hasText: '' }).nth(-3);
    await minimizeButton.click();

    // Check that chat is minimized (input should not be visible)
    await expect(page.locator('input[placeholder="Type your message..."]').last()).not.toBeVisible();
  });

  test('should close chat widget', async ({ page }) => {
    // Show preview and open widget
    await page.locator('button:has-text("Show Live Preview")').click();
    await page.waitForTimeout(1000);

    const floatingButton = page.locator('button:has(svg.h-6.w-6)').last();
    await floatingButton.click();

    // Find close button (X button)
    const closeButton = page.locator('button:has(svg.h-4.w-4)').filter({ hasText: '' }).last();
    await closeButton.click();

    // Widget should be closed, floating button should reappear
    await expect(page.locator('button:has(svg.h-6.w-6)').last()).toBeVisible({ timeout: 5000 });
  });

  test('should show installation guide', async ({ page }) => {
    // Check for installation steps
    await expect(page.locator('text=Installation Guide')).toBeVisible();
    await expect(page.locator('text=Copy the embed code')).toBeVisible();
    await expect(page.locator('text=Add to your website')).toBeVisible();
    await expect(page.locator('text=Test the widget')).toBeVisible();
  });

  test('should switch to API tab', async ({ page }) => {
    // Click API Access tab
    await page.locator('button:has-text("API Access")').click();

    // Check API content is shown
    await expect(page.locator('text=Endpoint')).toBeVisible();
    await expect(page.locator('text=Example Request')).toBeVisible();
    await expect(page.locator('text=/api/agents/')).toBeVisible();
  });

  test('should switch to Integrations tab', async ({ page }) => {
    // Click Integrations tab
    await page.locator('button:has-text("Integrations")').click();

    // Check integrations are shown
    await expect(page.locator('text=Website Widget')).toBeVisible();
    await expect(page.locator('text=Facebook Messenger')).toBeVisible();
    await expect(page.locator('text=WhatsApp')).toBeVisible();
    await expect(page.locator('text=Coming Soon')).toBeVisible();
  });
});