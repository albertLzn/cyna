import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:10000/api';

test.describe('Technical test chat', () => {
  test.beforeEach(async ({ request, page }) => {
    // Cleanup messages beforEach run
    await request.delete(`${API_BASE}/messages/cleanup`, { params: { prefix: 'Test E2E message' } }).catch(() => {});
    await request.delete(`${API_BASE}/messages/cleanup`, { params: { prefix: 'TestMessage' } }).catch(() => {});

    await page.goto('http://localhost:3000');
  });

  test('complete chat flow: open floating chat, send message, verify status, delete', async ({ page }) => {
    // Open FloatingChat
    await page.click('button:has(svg.lucide-message-square)');

    // Conversations List visible
    await expect(page.locator('.fixed h3:has-text("Messages")')).toBeVisible();

    // Select first conv
    const firstConversation = page.locator('div.divide-y button').first();
    await firstConversation.click();

    // Retrieve participant name
    const convWindow = page.locator('.fixed.z-40');
    await convWindow.waitFor({ state: 'visible', timeout: 5000 });

    // sendMessage
    const input = convWindow.locator('input[placeholder="Type a message..."]');
    await input.fill('Test E2E message');
    await input.press('Enter');

    // check message is displayed — scope au ConversationWindow via z-40
    await expect(
      convWindow.locator('p:has-text("Test E2E message")').last()
    ).toBeVisible({ timeout: 5000 });

    // Check icon status
    await expect(
      convWindow.locator('svg.lucide-check-check').last()
    ).toBeVisible();

    // Delete message, scope au ConversationWindow
    const deleteButton = convWindow.locator('button[title="Delete message"]').last();
    await deleteButton.waitFor({ state: 'visible', timeout: 5000 });
    await deleteButton.click();

    // Deleted message displayed as deleted
    await expect(
      convWindow.locator('p:has-text("[Message deleted]")')
    ).toBeVisible({ timeout: 3000 });
  });

  test('page /messages displays same conversations as floating chat', async ({ page }) => {
    await page.goto('http://localhost:3000/messages');

    // Conversations List visible
    await expect(page.locator('aside')).toBeVisible();

    // Select conv
    const firstConv = page.locator('aside button').first();
    await firstConv.click();
  });

  test('typing indicator and message send flow', async ({ page }) => {
    // Open floatingChat
    await page.click('button:has(svg.lucide-message-square)');

    // Select conv
    await page.locator('div.divide-y button').first().click();

    // Wait open
    const convWindow = page.locator('.fixed.z-40');
    await convWindow.waitFor({ state: 'visible', timeout: 5000 });

    // startTyping event
    const input = convWindow.locator('input[placeholder="Type a message..."]');
    await input.pressSequentially('TestMessage', { delay: 100 });

    // Wait so the other user sees the typingIndicator
    await page.waitForTimeout(500);

    // sendMessage
    await input.press('Enter');

    // Message is displayed
    await expect(
      convWindow.locator('p:has-text("TestMessage")').last()
    ).toBeVisible({ timeout: 5000 });
  });
});