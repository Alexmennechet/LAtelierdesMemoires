import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { filterBooks, normalizeSelection, marketUrl } from "../src/model.mjs";
const books = JSON.parse(
  await readFile(new URL("../data/books.json", import.meta.url), "utf8"),
);
test("selection migration recovers legacy IDs, rejects stale data and prevents duplicates", () => {
  assert.deepEqual(
    normalizeSelection(
      [101, { id: 101 }, { id: 105 }, null, {}, 999, "102"],
      books,
    ),
    [101, 105],
  );
  for (const malformed of [null, {}, "invalid", 123])
    assert.deepEqual(normalizeSelection(malformed, books), []);
});
test("search finds authors, accents, years and intersects categories", () => {
  assert.equal(filterBooks(books, "gustave simon")[0].id, 105);
  assert.equal(filterBooks(books, "edouard laboulaye")[0].id, 104);
  assert.equal(filterBooks(books, "1911")[0].id, 102);
  assert.equal(filterBooks(books, "1911", "Contes & romans").length, 0);
  assert.equal(filterBooks(books, "aucun-resultat").length, 0);
});
test("external link allowlist rejects lookalikes, credentials and insecure URLs", () => {
  assert.equal(marketUrl(books[0].lb_url), books[0].lb_url);
  for (const value of [
    "https://fakeleboncoin.fr/ad/1",
    "https://leboncoin.fr.evil.test",
    "https://leboncoin.fr@evil.test",
    "http://www.leboncoin.fr",
    "javascript:alert(1)",
    "https://user:pass@www.leboncoin.fr",
    "https://www.leboncoin.fr:8443/",
  ])
    assert.equal(marketUrl(value), null, value);
});
async function files(path) {
  const found = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const file = join(path, entry.name);
    found.push(...(entry.isDirectory() ? await files(file) : [file]));
  }
  return found;
}
test("built pages have unique metadata, valid local links and no GitHub media dependencies", async () => {
  const paths = (await files("dist")).filter(
    (f) => f.endsWith(".html") && !f.includes("google6"),
  );
  assert.equal(paths.length, 15);
  const titles = new Set();
  for (const path of paths) {
    const html = await readFile(path, "utf8");
    const title = html.match(/<title>(.*?)<\/title>/s)[1];
    assert.ok(!titles.has(title), `Duplicate title: ${path}`);
    titles.add(title);
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1, path);
    assert.match(
      html,
      /<link rel="canonical" href="https:\/\/latelierdesmemoires.netlify.app\//,
    );
    assert.ok(!html.includes("github.com/"), path);
    assert.ok(!/\sonclick=|\sstyle=/.test(html), path);
    const json = JSON.parse(
      html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1],
    );
    assert.ok(
      !JSON.stringify(json).includes("InStock"),
      "Do not invent availability",
    );
    for (const [, href] of html.matchAll(/(?:href|src)="(\/[^"?#]*)[^" ]*"/g)) {
      const file = join("dist", href, href.endsWith("/") ? "index.html" : "");
      assert.ok((await stat(file)).isFile(), `${path}: ${href}`);
    }
  }
  const sitemap = await readFile("dist/sitemap.xml", "utf8");
  assert.equal((sitemap.match(/<loc>/g) || []).length, 13);
  for (const b of books) assert.ok(sitemap.includes(`/livres/${b.slug}/`));
  assert.ok(!sitemap.includes("/selection/"));
});
