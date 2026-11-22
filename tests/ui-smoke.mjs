import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

try {
  await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
  assert.equal(await page.title(), "Quantum-AI");
  assert.equal(await page.locator("#sendBtn").isDisabled(), true);
  assert.equal((await page.locator("body").innerText()).includes("Qwen"), false);
  assert.equal(await page.locator("#webSearchNav").count(), 0);
  assert.equal(await page.locator("#searchView").count(), 0);
  assert.equal(await page.locator("#chatNav").isVisible(), true);
  assert.ok((await page.locator("#chatNotice").innerText()).includes("ассистент сможет сам вызывать веб-поиск"));

  await page.locator("#newChatBtn").click();
  assert.equal(await page.locator("#historyCount").textContent(), "1");
  assert.equal(await page.locator("#chatHistory .history-item").count(), 1);

  page.once("dialog", (dialog) => dialog.accept("Проверочный чат"));
  await page.locator('#chatHistory [data-action="rename"]').click();
  await page.getByText("Проверочный чат").first().waitFor();

  await page.locator("#chatFilter").fill("не существует");
  assert.equal(await page.locator("#chatHistory .history-item").count(), 0);
  await page.locator("#chatFilter").fill("Проверочный");
  assert.equal(await page.locator("#chatHistory .history-item").count(), 1);
  await page.locator("#chatHistory [data-action='open']").click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#menuBtn").click();
  assert.equal(await page.locator("#sidebar").evaluate((node) => node.classList.contains("open")), true);
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(width <= 390, "mobile layout must not overflow horizontally");
  await page.locator("#closeSidebarBtn").click();
  assert.equal(await page.locator("#sidebar").evaluate((node) => node.classList.contains("open")), false);

  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator("#historyCount").textContent(), "1");
  await page.locator("#menuBtn").click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator('#chatHistory [data-action="delete"]').click();
  assert.equal(await page.locator("#historyCount").textContent(), "0");

  console.log("Quantum-AI chat-first browser smoke test passed.");
} finally {
  await browser.close();
}
