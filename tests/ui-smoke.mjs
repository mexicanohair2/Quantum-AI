import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

try {
  await page.route("https://api.tavily.com/search", async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": "content-type, x-tavily-access-mode"
        }
      });
      return;
    }
    const headers = request.headers();
    const payload = request.postDataJSON();
    assert.equal(request.method(), "POST");
    assert.equal(headers["x-tavily-access-mode"], "keyless");
    assert.equal(headers.authorization, undefined);
    assert.equal(payload.query, "пример поиска");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({
        results: [{
          title: "Проверочная страница",
          url: "https://example.com/article",
          content: "Текст проверочного результата."
        }]
      })
    });
  });

  await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
  assert.equal(await page.title(), "Quantum-AI");
  assert.equal(await page.locator("#sendBtn").isDisabled(), true);
  assert.equal((await page.locator("body").innerText()).includes("Qwen"), false);

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
  await page.locator("#webSearchNav").click();
  await page.locator("#webQuery").fill("пример поиска");
  await page.locator("#searchForm button[type='submit']").click();
  await page.locator(".search-result").first().waitFor();
  assert.equal(await page.locator(".result-title").first().textContent(), "Проверочная страница");
  assert.equal(await page.locator(".result-domain").first().textContent(), "example.com");

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
  assert.equal(await page.locator("#sidebar").evaluate((node) => node.classList.contains("open")), true);

  page.once("dialog", (dialog) => dialog.accept());
  await page.locator('#chatHistory [data-action="delete"]').click();
  assert.equal(await page.locator("#historyCount").textContent(), "0");

  console.log("Quantum-AI browser smoke test passed.");
} finally {
  await browser.close();
}
