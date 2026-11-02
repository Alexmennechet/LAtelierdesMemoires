import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
const books = JSON.parse(
  await readFile(new URL("../data/books.json", import.meta.url), "utf8"),
);
const baseline = JSON.parse(
  await readFile(
    new URL("./fixtures/catalogue-avant-seo.json", import.meta.url),
    "utf8",
  ),
);
const pilotIds = [108, 113, 118];
const newBookIds = [
  104, 105, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119,
];
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
  // Closed selection dialogs also contain lazy images. A page capture must
  // decode only the images displayed in the current view, including off-screen ones.
  for (const img of await page.locator('img[loading="lazy"]:visible').all()) {
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
    "/contact/",
    "/livraison/",
    "/guides/",
    "/guides/dater-un-livre-ancien/",
    "/guides/observer-etat-livre-ancien/",
    "/guides/cartonnages-illustres/",
    "/en/",
    "/en/contact-shipping/",
    ...pilotIds.map(
      (id) => `/en/books/${books.find((b) => b.id === id).slug}/`,
    ),
    `/livres/${books.find((b) => b.id === 105).slug}/`,
  ];
  for (const width of [320, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
    for (const route of routes) {
      await page.goto(base + route);
      await page.locator("body").waitFor();
      if (!route.startsWith("/en/")) {
        await page.waitForFunction(() =>
          /ouvrage|book/i.test(
            document
              .querySelector(".selection-link")
              ?.getAttribute("aria-label") || "",
          ),
        );
      }
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
  assert.equal(
    await page.locator("[data-book-card]:visible").count(),
    books.length,
  );
  await page
    .getByLabel("Catégorie", { exact: true })
    .selectOption(books.find((b) => b.id === 104).category);
  assert.equal(
    await page.locator("[data-book-card]:visible").count(),
    books.filter(
      (b) => b.category === books.find((book) => book.id === 104).category,
    ).length,
  );
  await page.getByRole("button", { name: "Réinitialiser" }).click();
  const quick = page.locator('[data-quick="101"]');
  await quick.focus();
  await page.keyboard.press("Enter");
  const dialog = page.locator("#quick-dialog");
  assert.equal(await dialog.evaluate((el) => el.open), true);
  assert.equal(await page.locator("dialog[open]").count(), 1);
  await axe("quick view mobile");
  await overflow("quick view mobile");
  await dialog
    .getByRole("button", { name: /Afficher la photographie 2 (?:sur|\/) 8/ })
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
  await dialog
    .locator("[data-gallery-image]")
    .evaluate((image) => image.decode());
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
  await page.locator('[data-full-selection] [data-remove="101"]').click();
  assert.equal(
    await page.locator("[data-full-selection] .selection-row").count(),
    0,
  );
  // Exercise a real header click and keyboard activation on small viewports.
  for (const width of [360, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(base + "/boutique/");
    const trigger = page.locator("a[data-open-selection]");
    await trigger.click({ timeout: 5000 });
    assert.equal(
      await page.locator("#selection-dialog").evaluate((el) => el.open),
      true,
    );
    await page.keyboard.press("Escape");
    await trigger.focus();
    await page.keyboard.press("Enter");
    assert.equal(
      await page.locator("#selection-dialog").evaluate((el) => el.open),
      true,
    );
    await page.keyboard.press("Escape");
    assert.ok(await trigger.evaluate((el) => el === document.activeElement));
  }
  // Restore selections saved before publication, using the current prices and links.
  await page.setViewportSize({ width: 390, height: 844 });
  for (const legacyObjects of [true, false]) {
    const saved = newBookIds.map((id) =>
      legacyObjects
        ? { ...baseline.find((b) => b.id === id), lb_url: null, price: 1 }
        : id,
    );
    await page.evaluate(
      (value) => localStorage.setItem("atelier_cart", JSON.stringify(value)),
      saved,
    );
    await page.goto(base + "/selection/");
    await page.waitForFunction(
      () =>
        document.querySelectorAll("[data-full-selection] .selection-row")
          .length === 15,
    );
    const actual = await page
      .locator('[data-full-selection] a[href*="leboncoin.fr/ad/"]')
      .evaluateAll((els) => els.map((e) => e.href));
    assert.deepEqual(
      actual.sort(),
      books
        .filter((b) => newBookIds.includes(b.id))
        .map((b) => b.lb_url)
        .sort(),
    );
    assert.ok(
      !(await page.locator("main").innerText()).includes(
        "Annonce Leboncoin à venir",
      ),
    );
    for (const id of newBookIds) {
      const b = books.find((book) => book.id === id);
      const row = page
        .locator("[data-full-selection] .selection-row")
        .filter({ has: page.locator(`a[href="${b.lb_url}"]`) });
      assert.equal(await row.count(), 1);
      assert.match(
        await row.locator(".price").innerText(),
        new RegExp(`^${b.price}\\s*€$`),
      );
    }
  }
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
      name: books.find((b) => b.id === 105).title,
      exact: true,
    })
    .waitFor();
  await captureFull("test-results/fiche-mobile.png");
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
  assert.equal(
    await fallback.locator("[data-book-card]").count(),
    books.length,
  );
  await fallback.locator('[data-book-card="104"] h3 a').click();
  await fallback
    .getByRole("heading", {
      name: books.find((b) => b.id === 104).title,
      exact: true,
    })
    .waitFor();
  let galleryCount = 0;
  for (const book of books) {
    const response = await fallback.goto(base + `/livres/${book.slug}/`, {
      waitUntil: "domcontentloaded",
    });
    assert.equal(response.status(), 200);
    assert.ok(
      await fallback.locator("main h1").isVisible(),
      `No-JS H1 ADM-${book.id}`,
    );
    assert.ok(
      (
        await fallback.locator('link[rel="canonical"]').getAttribute("href")
      ).endsWith(`/livres/${book.slug}/`),
    );
    if (newBookIds.includes(book.id)) {
      assert.ok(
        (await fallback.locator(`a[href="${book.lb_url}"]`).count()) > 0,
        `No-JS listing ADM-${book.id}`,
      );
      galleryCount += await fallback.locator("a[data-photo]").count();
    }
  }
  assert.equal(galleryCount, 100);
  for (const id of pilotIds) {
    const book = books.find((b) => b.id === id);
    await fallback.goto(base + `/en/books/${book.slug}/`, {
      waitUntil: "domcontentloaded",
    });
    assert.equal(await fallback.locator("html").getAttribute("lang"), "en");
    assert.ok(await fallback.locator("main h1").isVisible());
    assert.ok(
      (
        await fallback.locator('link[rel="canonical"]').getAttribute("href")
      ).endsWith(`/en/books/${book.slug}/`),
    );
    assert.ok((await fallback.locator(`a[href="${book.lb_url}"]`).count()) > 0);
  }
  await noJs.close();
  // Instrumentation exposes local events only; tests prevent the outbound navigation.
  await page.goto(base + "/boutique/");
  await page.evaluate(() => {
    window.auditInteractions = [];
    window.addEventListener("atelier:interaction", (event) =>
      window.auditInteractions.push(event.detail),
    );
  });
  await page.locator('[data-add="104"]').click();
  assert.deepEqual(await page.evaluate(() => window.auditInteractions), [
    { action: "add_selection", language: "fr", bookId: 104 },
  ]);
  await page.keyboard.press("Escape");
  await page.goto(base + "/selection/");
  await page.evaluate(() => {
    window.auditInteractions = [];
    window.addEventListener("atelier:interaction", (event) =>
      window.auditInteractions.push(event.detail),
    );
    document.addEventListener(
      "click",
      (event) => {
        if (event.target.closest("a[data-market]")) event.preventDefault();
      },
      { capture: true },
    );
  });
  const listing = page.locator('[data-full-selection] a[data-market="104"]');
  assert.equal(await listing.getAttribute("target"), "_blank");
  assert.equal(
    await listing.getAttribute("href"),
    books.find((book) => book.id === 104).lb_url,
  );
  await listing.click();
  assert.deepEqual(await page.evaluate(() => window.auditInteractions), [
    { action: "outbound_listing", language: "fr", bookId: 104 },
  ]);
  // A restored selection must use today's contact route, not the inactive ad.
  const carnet = books.find((book) => book.id === 101);
  await page.goto(base + `/livres/${carnet.slug}/`, {
    waitUntil: "networkidle",
  });
  assert.equal(await page.locator(`a[href="${carnet.lb_url}"]`).count(), 0);
  assert.equal(
    await page.locator('[data-contact="101"]').getAttribute("href"),
    carnet.inquiry_url,
  );
  await page.evaluate(() => {
    window.auditInteractions = [];
    window.addEventListener("atelier:interaction", (event) =>
      window.auditInteractions.push(event.detail),
    );
    document.addEventListener("click", (event) => {
      if (event.target.closest("a[data-contact]")) event.preventDefault();
    });
  });
  await page.locator('[data-contact="101"]').click();
  assert.deepEqual(await page.evaluate(() => window.auditInteractions), [
    { action: "outbound_contact", language: "fr", bookId: 101 },
  ]);
  await page.evaluate(
    (book) =>
      localStorage.setItem(
        "atelier_cart",
        JSON.stringify([{ ...book, availability: "unknown" }]),
      ),
    carnet,
  );
  await page.goto(base + "/selection/", { waitUntil: "networkidle" });
  assert.equal(
    await page
      .locator('[data-full-selection] a[data-contact="101"]')
      .getAttribute("href"),
    carnet.inquiry_url,
  );
  assert.equal(await page.locator(`a[href="${carnet.lb_url}"]`).count(), 0);
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
    errors.every((err) =>
      err.includes("server responded with a status of 404"),
    ),
    JSON.stringify([...new Set(errors)]),
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
