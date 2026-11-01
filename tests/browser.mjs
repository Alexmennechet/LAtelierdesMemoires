import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:4173";
await mkdir("test-results", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE
    ? { executablePath: process.env.BROWSER_EXECUTABLE }
    : {}),
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
const errors = [];
const failed = [];
const requests = [];
page.on("pageerror", (err) => errors.push(err.message));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("response", (res) => {
  if (res.status() >= 400 && !res.url().endsWith("/does-not-exist/"))
    failed.push(`${res.status()} ${res.url()}`);
});
page.on("request", (req) => requests.push(req.url()));
const results = [];
async function axe(label) {
  const report = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  results.push({
    label,
    violations: report.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => n.target),
    })),
  });
  assert.deepEqual(results.at(-1).violations, [], `Accessibility: ${label}`);
}
async function overflow(label) {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    `Horizontal overflow: ${label}`,
  );
}
async function captureFull(path) {
  for (const img of await page.locator('img[loading="lazy"]').all()) {
    await img.scrollIntoViewIfNeeded();
    await img.evaluate((el) => el.decode().catch(() => {}));
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path, fullPage: true });
}
try {
  await page.goto(base + "/");
  await page
    .getByRole("button", { name: "Lire la vidéo d’ambiance" })
    .waitFor();
  assert.ok(
    !requests.some((u) => u.endsWith(".mp4")),
    "Video must not download before user action",
  );
  assert.ok(
    requests.every((u) => u.startsWith(base)),
    "All initial resources should be local",
  );
  await page.getByRole("button", { name: "Lire la vidéo d’ambiance" }).click();
  await page
    .getByRole("button", { name: "Mettre la vidéo en pause" })
    .waitFor();
  await page.getByRole("button", { name: "Mettre la vidéo en pause" }).click();
  assert.equal(
    await page.locator(".hero-video").evaluate((el) => el.paused),
    true,
  );
  await axe("home desktop");
  await captureFull("test-results/accueil-desktop.png");
  const routes = [
    "/",
    "/boutique/",
    "/a-propos/",
    "/faq/",
    "/mentions-legales/",
    "/conditions/",
    "/selection/",
    "/livres/victor-hugo-annees-enfance/",
  ];
  for (const width of [320, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
    for (const route of routes) {
      await page.goto(base + route);
      await page.locator("body").waitFor();
      await page.waitForFunction(() =>
        document
          .querySelector(".selection-link")
          ?.getAttribute("aria-label")
          .includes("ouvrage"),
      );
      await overflow(`${width} ${route}`);
      if (width === 390 || width === 1280) await axe(`${width} ${route}`);
      if (width === 390 && route === "/")
        await captureFull("test-results/accueil-mobile.png");
      if (width === 768 && route === "/boutique/")
        await captureFull("test-results/boutique-tablette.png");
    }
    console.log(`Responsive ${width}px: passed`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/boutique/");
  await page.getByRole("searchbox").fill("gustave simon");
  assert.equal(await page.locator("[data-book-card]:visible").count(), 1);
  assert.ok(page.url().includes("q=gustave"));
  await page.reload();
  assert.equal(await page.getByRole("searchbox").inputValue(), "gustave simon");
  await page.getByRole("searchbox").fill("zzzzzz");
  await page
    .getByRole("heading", {
      name: "Aucun ouvrage ne correspond à votre recherche",
    })
    .waitFor();
  await page
    .getByRole("button", { name: "Afficher tous les ouvrages" })
    .click();
  assert.equal(await page.locator("[data-book-card]:visible").count(), 7);
  await page
    .getByLabel("Catégorie", { exact: true })
    .selectOption("Contes & romans");
  assert.equal(await page.locator("[data-book-card]:visible").count(), 3);
  await page.getByRole("button", { name: "Réinitialiser" }).click();
  const quick = page.getByRole("button", {
    name: "Aperçu de Carnet original de 1918 — Croquis de guerre et de mode",
  });
  await quick.focus();
  await page.keyboard.press("Enter");
  const dialog = page.locator("#quick-dialog");
  assert.equal(await dialog.evaluate((el) => el.open), true);
  assert.equal(await page.locator("dialog[open]").count(), 1);
  await axe("quick view mobile");
  await overflow("quick view mobile");
  await dialog
    .getByRole("button", { name: "Afficher la photographie 2 sur 8" })
    .focus();
  await page.keyboard.press("Enter");
  assert.match(
    await dialog.locator("[data-gallery-image]").getAttribute("alt"),
    /photographie 2 sur 8/,
  );
  await page.keyboard.press("ArrowRight");
  assert.match(
    await dialog.locator("[data-gallery-image]").getAttribute("alt"),
    /photographie 3 sur 8/,
  );
  await page.screenshot({ path: "test-results/apercu-mobile.png" });
  for (let i = 0; i < 24; i++) {
    await page.keyboard.press("Tab");
    assert.ok(
      await dialog.evaluate((el) => el.contains(document.activeElement)),
      "Focus must stay in open dialog",
    );
  }
  await page.keyboard.press("Escape");
  assert.equal(await dialog.evaluate((el) => el.open), false);
  assert.ok(
    await quick.evaluate((el) => el === document.activeElement),
    "Focus returns to quick-view trigger",
  );
  await quick.click();
  await dialog.locator('[data-add="101"]').click();
  assert.equal(await page.locator("dialog[open]").count(), 1);
  assert.equal(
    await page.locator("#selection-dialog").evaluate((el) => el.open),
    true,
  );
  assert.equal(
    await page.locator("[data-selection-list] .selection-row").count(),
    1,
  );
  await axe("selection drawer mobile");
  const selectionBounds = await page.locator("#selection-dialog").boundingBox();
  assert.ok(
    selectionBounds.x >= 0 && selectionBounds.x + selectionBounds.width <= 391,
    "Selection drawer must fit viewport",
  );
  await page.screenshot({ path: "test-results/selection-mobile.png" });
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("dialog[open]").count(), 0);
  for (const button of await page.locator('[data-add="101"]').all())
    assert.equal(await button.isDisabled(), true);
  await page.goto(base + "/selection/");
  assert.equal(
    await page.locator("[data-full-selection] .selection-row").count(),
    1,
  );
  await axe("full selection");
  await page.getByRole("button", { name: /Retirer Carnet/ }).click();
  assert.equal(
    await page.locator("[data-full-selection] .selection-row").count(),
    0,
  );
  // Legacy malformed data must neither crash initialization nor create duplicate copies.
  await page.evaluate(() => localStorage.setItem("atelier_cart", "{broken"));
  await page.reload();
  await page
    .getByRole("link", { name: "Explorer la boutique", exact: true })
    .waitFor();
  await page.evaluate(() =>
    localStorage.setItem(
      "atelier_cart",
      JSON.stringify([101, { id: 101 }, { id: 105 }, 999]),
    ),
  );
  await page.reload();
  assert.equal(
    await page.locator("[data-full-selection] .selection-row").count(),
    2,
  );
  await page.goto(base + "/livres/victor-hugo-annees-enfance/");
  await page
    .getByRole("heading", {
      name: "Victor Hugo — Années d’enfance",
      exact: true,
    })
    .waitFor();
  await page.screenshot({
    path: "test-results/fiche-mobile.png",
    fullPage: true,
  });
  const blocked = await browser.newContext();
  await blocked.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Blocked", "SecurityError");
      },
    }),
  );
  const blockedPage = await blocked.newPage();
  await blockedPage.goto(base + "/boutique/");
  await blockedPage.locator('[data-add="101"]').click();
  assert.equal(
    await blockedPage.locator("[data-selection-list] .selection-row").count(),
    1,
  );
  await blocked.close();
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const fallback = await noJs.newPage();
  await fallback.goto(base + "/boutique/");
  assert.equal(await fallback.locator("[data-book-card]").count(), 7);
  await fallback
    .getByRole("link", { name: "Contes bleus", exact: true })
    .click();
  await fallback
    .getByRole("heading", { name: "Contes bleus", exact: true })
    .waitFor();
  assert.ok(
    await fallback
      .getByRole("link", { name: /Consulter l’annonce Leboncoin/ })
      .getAttribute("href"),
  );
  await noJs.close();
  const response = await page.goto(base + "/does-not-exist/");
  assert.equal(response.status(), 404);
  assert.ok(
    response
      .headers()
      ["content-security-policy"].includes("frame-ancestors 'none'"),
  );
  assert.deepEqual(failed, []);
  // A deliberate 404 can emit a console resource error; all prior pages must be clean.
  assert.ok(
    errors.every((err) => err.includes("404 (Not Found)")),
    JSON.stringify(errors),
  );
  console.log(
    "Search, URLs, gallery, keyboard, focus, dialogs, selection, storage errors, no-JS and headers: passed",
  );
  await writeFile(
    "test-results/accessibility.json",
    JSON.stringify(results, null, 2),
  );
} finally {
  await browser.close();
}
