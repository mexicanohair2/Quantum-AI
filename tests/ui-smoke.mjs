import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
let chatRequests = 0;
let failNextChat = false;

await context.addInitScript(() => {
  const session = localStorage.getItem("quantum-ui-test-auth") === "yes" ? {
    access_token: "mock-qqcross-access-token",
    user: {
      id: "8b90b6c7-1e36-4fd5-8a6c-123456789012",
      email: "player@example.com",
      email_confirmed_at: "2026-11-22T00:00:00Z",
      is_anonymous: false
    }
  } : null;
  window.supabase = {
    createClient() {
      return {
        auth: {
          async getSession() { return { data: { session }, error: null }; },
          onAuthStateChange(callback) {
            window.__quantumAuthCallback = callback;
            return { data: { subscription: { unsubscribe() {} } } };
          }
        }
      };
    }
  };
});

const page = await context.newPage();
await page.route("https://cdn.jsdelivr.net/**/supabase.js*", (route) => route.fulfill({
  status: 200,
  contentType: "application/javascript",
  body: "/* Supabase UMD is stubbed by addInitScript for this isolated UI test. */"
}));
await page.route("https://quantum-ai-chat-api.qq-ai-cloud.workers.dev/**", async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  if (url.pathname === "/health") {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, service: "Quantum-AI" }) });
    return;
  }
  assert.equal(request.headers()["authorization"], "Bearer mock-qqcross-access-token");
  if (url.pathname === "/api/balance") {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ quota: { used: 250, reserved: 0, remaining: 9750, limit: 10000, resetsAt: "2026-11-23T00:00:00Z" } })
    });
    return;
  }
  if (url.pathname === "/api/chat") {
    chatRequests += 1;
    if (failNextChat) {
      failNextChat = false;
      await route.abort("failed");
      return;
    }
    const payload = request.postDataJSON();
    assert.ok(Array.isArray(payload.messages));
    assert.equal(payload.messages.at(-1).role, "user");
    await new Promise((resolve) => setTimeout(resolve, 180));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        reply: "Ответ Quantum-AI: 2 + 2 = 4.",
        sources: [],
        model: "@cf/qwen/qwen3.8-27b",
        quota: { used: 300, reserved: 0, remaining: 9700, limit: 10000 }
      })
    });
    return;
  }
  await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "Not found" }) });
});

try {
  await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
  assert.equal(await page.title(), "Quantum-AI");
  assert.equal(await page.locator("#prompt").isDisabled(), true);
  assert.equal(await page.locator("#sendBtn").isDisabled(), true);
  assert.equal(await page.locator("#loginLink").isVisible(), true);
  assert.match(await page.locator("#chatError").innerText(), /подтверждённый аккаунт QQCross/i);

  await page.evaluate(() => localStorage.setItem("quantum-ui-test-auth", "yes"));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("#authStatus")?.dataset.state === "ready");
  assert.equal(await page.locator("#prompt").isDisabled(), false);
  assert.equal(await page.locator("#loginLink").isVisible(), false);
  assert.match(await page.locator("#authStatus").innerText(), /9\s?750 нейронов/);

  await page.locator("#prompt").fill("Сколько будет 2 + 2?");
  assert.equal(await page.locator("#sendBtn").isDisabled(), false);
  await page.locator("#sendBtn").click();
  await page.evaluate(() => {
    const form = document.querySelector("#messageForm");
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await page.locator("#threadMessages .message.assistant").waitFor({ state: "visible" });
  assert.match(await page.locator("#threadMessages").innerText(), /2 \+ 2 = 4/);
  assert.match(await page.locator("#authStatus").innerText(), /9\s?700 нейронов/);
  assert.equal(chatRequests, 1);
  assert.equal(await page.locator("#chatHistory .history-item").count(), 1);

  failNextChat = true;
  await page.locator("#prompt").fill("Проверка отключения сети");
  await page.locator("#sendBtn").click();
  await page.locator("#chatError").waitFor({ state: "visible" });
  assert.match(await page.locator("#chatError").innerText(), /Нет соединения/);
  assert.equal(await page.locator("#prompt").inputValue(), "Проверка отключения сети");
  assert.equal(chatRequests, 2);

  await page.locator("#menuBtn").click();
  assert.equal(await page.locator("#sidebar").evaluate((node) => node.classList.contains("open")), true);
  await page.locator("#closeSidebarBtn").click();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= 390));

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("#authStatus")?.dataset.state === "ready");
  assert.equal(await page.locator("#chatHistory .history-item").count(), 1);
  assert.match(await page.locator("#threadMessages").innerText(), /2 \+ 2 = 4/);
  console.log("Quantum-AI shared-auth and mobile chat browser smoke tests passed.");
} finally {
  await browser.close();
}
