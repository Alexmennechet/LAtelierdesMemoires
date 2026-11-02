import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { filterBooks, normalizeSelection, marketUrl } from "../src/model.mjs";
import { bookInfo, marketLink } from "../src/views.mjs";
import { productSchema } from "../src/seo.mjs";

const json = async (path) =>
  JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const books = await json("../data/books.json");
const media = await json("../data/media.json");
const baseline = await json("./fixtures/catalogue-avant-seo.json");
const site = await json("../data/site.json");
const expected = {
  104: [30, 8],
  105: [15, 5],
  107: [25, 8],
  108: [12, 7],
  109: [25, 5],
  110: [15, 7],
  111: [20, 7],
  112: [30, 7],
  113: [35, 9],
  114: [15, 5],
  115: [8, 5],
  116: [40, 9],
  117: [12, 6],
  118: [20, 7],
  119: [20, 5],
};
const enIds = [108, 113, 118];
const flatten = (value) =>
  Array.isArray(value)
    ? value.flatMap(flatten)
    : value && typeof value === "object"
      ? [value, ...Object.values(value).flatMap(flatten)]
      : [];
const hasType = (node, type) => [].concat(node?.["@type"] || []).includes(type);
function structured(html) {
  return [
    ...html.matchAll(
      /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ].flatMap((m) => flatten(JSON.parse(m[1])));
}
function attributes(tag) {
  return Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)=["']([^"']*)["']/g)].map((m) => [
      m[1],
      m[2].replaceAll("&amp;", "&"),
    ]),
  );
}
function links(html) {
  return [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => attributes(m[0]));
}
const canonical = (html) =>
  links(html).find((a) => a.rel === "canonical")?.href;
const hash = (data) => createHash("sha256").update(data).digest("hex");
const localPath = (src) => decodeURIComponent(new URL(src, site.url).pathname);
const distFile = (src) =>
  join(
    "dist",
    localPath(src),
    localPath(src).endsWith("/") ? "index.html" : "",
  );

// Frozen production data protects the user's prices, exact listings and final photographs.
// References added after the frozen baseline: [price, photos, Leboncoin listing].
const added = {
  120: [20, 7, "https://www.leboncoin.fr/ad/livres/3301253898"],
  121: [25, 5, "https://www.leboncoin.fr/ad/livres/3301255411"],
  122: [15, 6, "https://www.leboncoin.fr/ad/livres/3301256237"],
};

test("19 references preserve production IDs, prices, exact Leboncoin links and 100 final photos", async () => {
  const frozen = books.filter((b) => baseline.some((o) => o.id === b.id));
  assert.equal(frozen.length, 19);
  assert.equal(new Set(books.map((b) => b.id)).size, books.length);
  assert.equal(new Set(books.map((b) => b.slug)).size, books.length);
  assert.deepEqual(
    frozen.map((b) => b.id).sort(),
    baseline.map((b) => b.id).sort(),
  );
  assert.deepEqual(
    books
      .filter((b) => !frozen.includes(b))
      .map((b) => b.id)
      .sort(),
    Object.keys(added).map(Number).sort(),
  );
  let total = 0,
    count = 0;
  for (const b of frozen) {
    const old = baseline.find((o) => o.id === b.id);
    assert.equal(b.price, old.price, `Price ADM-${b.id}`);
    assert.equal(b.lb_url, old.lb_url, `Listing ADM-${b.id}`);
    assert.ok(
      ["unknown", "available", "reserved", "sold"].includes(b.availability),
      `Availability ADM-${b.id}`,
    );
    assert.match(b.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    if (!expected[b.id]) continue;
    const [price, photos] = expected[b.id];
    assert.equal(b.price, price);
    assert.equal(media[b.id].length, photos);
    total += b.price;
    count += photos;
    for (let i = 0; i < photos; i++) {
      const image = media[b.id][i];
      const original = old.images[i];
      assert.ok(image.variants.length >= 3);
      const largest = image.variants.at(-1);
      const source = await readFile(
        new URL(".." + localPath(original), import.meta.url),
      );
      const output = await readFile(distFile(largest.src));
      assert.equal(
        hash(output),
        hash(source),
        `Final photo ADM-${b.id}/${i + 1} must remain byte-identical`,
      );
      assert.ok(image.variants.every((v) => v.width > 0 && v.height > 0));
      for (const variant of image.variants)
        assert.ok((await stat(distFile(variant.src))).isFile());
    }
  }
  assert.equal(total, 322);
  assert.equal(count, 100);
});

test("references added after the baseline keep their price, listing and built photos", async () => {
  for (const [id, [price, photos, listing]] of Object.entries(added)) {
    const b = books.find((x) => x.id === Number(id));
    assert.ok(b, `ADM-${id}`);
    assert.equal(b.price, price, `Price ADM-${id}`);
    assert.equal(b.lb_url, listing, `Listing ADM-${id}`);
    assert.match(b.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(
      ["unknown", "available", "reserved", "sold"].includes(b.availability),
    );
    assert.match(b.description, /\n\nEnvoi soigné\.$/);
    assert.equal(media[id].length, photos, `Photos ADM-${id}`);
    for (const image of media[id]) {
      assert.ok(image.alt && image.caption);
      assert.ok(image.variants.length >= 3);
      for (const variant of image.variants) {
        assert.ok(variant.width > 0 && variant.height > 0);
        assert.ok((await stat(distFile(variant.src))).isFile(), variant.src);
      }
    }
  }
});

test("selection restores legacy IDs and stale objects, rejects malformed data and duplicates", () => {
  assert.deepEqual(
    normalizeSelection(
      [
        101,
        { id: 101 },
        { id: 105, lb_url: null, price: 1 },
        null,
        {},
        999,
        "102",
      ],
      books,
    ),
    [101, 105],
  );
  const fifteen = Object.keys(expected).map(Number);
  assert.deepEqual(
    normalizeSelection(
      fifteen.map((id) => ({ id, lb_url: null })),
      books,
    ),
    fifteen,
  );
  for (const malformed of [null, {}, "invalid", 123])
    assert.deepEqual(normalizeSelection(malformed, books), []);
});

test("search handles author names, accents, dates, descriptions and category intersections", () => {
  assert.equal(filterBooks(books, "gustave simon")[0].id, 105);
  assert.equal(filterBooks(books, "edouard laboulaye")[0].id, 104);
  assert.ok(filterBooks(books, "1918").some((b) => b.id === 101));
  assert.equal(
    filterBooks(
      books,
      "gustave simon",
      books.find((b) => b.id === 104).category,
    ).length,
    0,
  );
  assert.equal(filterBooks(books, "aucun-resultat").length, 0);
});

test("external URLs reject lookalikes, credentials, insecure links and nonstandard ports", () => {
  for (const b of books) assert.equal(marketUrl(b.lb_url), b.lb_url);
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

test("sold and reserved specimens cannot retain an active purchase or add button", () => {
  const source = books.find((b) => b.id === 104);
  for (const availability of ["sold", "reserved"]) {
    const b = { ...source, images: media[source.id], availability };
    const html = bookInfo(b);
    assert.match(html, /vendu|sold|réserv|reserv|indisponible/i, availability);
    assert.ok(
      !/<a\b[^>]*href=["']https:\/\/(?:www\.)?leboncoin\.fr\/ad\//i.test(
        marketLink(b),
      ),
      availability,
    );
    const adds = [
      ...html.matchAll(/<button\b[^>]*data-add=["']104["'][^>]*>/g),
    ].map((m) => m[0]);
    assert.ok(
      adds.every((tag) => /\bdisabled\b/.test(tag)),
      availability,
    );
  }
});

test("product schema distinguishes unconfirmed, available, reserved and sold stock", () => {
  const source = books.find((b) => b.id === 104);
  const canonicalUrl = site.url + `/livres/${source.slug}/`;
  for (const [availability, expectedStock] of [
    ["unknown", undefined],
    ["available", "InStock"],
    ["reserved", "OutOfStock"],
    ["sold", "SoldOut"],
  ]) {
    const book = { ...source, images: media[source.id], availability };
    const schema = productSchema(book, site, canonicalUrl);
    assert.ok(hasType(schema, "Product") && hasType(schema, "Book"));
    assert.equal(schema.sku, `ADM-${source.id}`);
    assert.equal(schema.offers.price, source.price);
    assert.equal(schema.offers.priceCurrency, "EUR");
    assert.equal(
      schema.offers.availability,
      expectedStock ? `https://schema.org/${expectedStock}` : undefined,
    );
    assert.equal(
      Object.hasOwn(schema.offers, "availability"),
      Boolean(expectedStock),
    );
  }
});

async function files(path) {
  const found = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const file = join(path, entry.name);
    found.push(...(entry.isDirectory() ? await files(file) : [file]));
  }
  return found;
}

test("all built pages have unique metadata, one H1, valid local resources and canonical URLs", async () => {
  const paths = (await files("dist")).filter(
    (f) => f.endsWith(".html") && !/google[^\\/]+\.html$/.test(f),
  );
  assert.ok(paths.length >= books.length + 6);
  const titles = new Set(),
    canonicals = new Set(),
    indexable = new Set();
  for (const path of paths) {
    const html = await readFile(path, "utf8");
    const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
    assert.ok(title && !titles.has(title), `Unique title: ${path}`);
    titles.add(title);
    assert.equal((html.match(/<h1[\s>]/gi) || []).length, 1, path);
    const url = canonical(html);
    assert.ok(url?.startsWith(site.url + "/"), path);
    assert.ok(!canonicals.has(url), `Canonical collision: ${path}`);
    canonicals.add(url);
    if (!/name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html))
      indexable.add(url);
    assert.ok(
      !/https?:\/\/(?:[^/]+\.)?(?:github\.com|githubusercontent\.com|googleapis\.com|gstatic\.com)\//.test(
        html,
      ),
      path,
    );
    assert.ok(!/\sonclick=|\sstyle=/.test(html), path);
    assert.ok(!/Annonce Leboncoin à venir/.test(html), path);
    structured(html);
    for (const [, href] of html.matchAll(/(?:href|src)="(\/[^"?#]*)[^" ]*"/g))
      assert.ok((await stat(distFile(href))).isFile(), `${path}: ${href}`);
  }
  const sitemap = await readFile("dist/sitemap.xml", "utf8");
  const urls = new Set(
    [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) =>
      m[1].replaceAll("&amp;", "&"),
    ),
  );
  assert.deepEqual(
    [...urls].sort(),
    [...indexable].sort(),
    "Sitemap must contain each indexable canonical once",
  );
  assert.equal((sitemap.match(/<loc>/g) || []).length, urls.size);
  assert.ok(!sitemap.includes("/selection/") && !sitemap.includes("/404.html"));
});

test("19 French product pages expose honest Product+Book data, prices and listings before JavaScript", async () => {
  for (const b of books) {
    const path = `/livres/${b.slug}/`;
    const html = await readFile(distFile(path), "utf8");
    const nodes = structured(html);
    assert.equal(canonical(html), site.url + path);
    assert.ok(
      nodes.some((n) => hasType(n, "Product")),
      `${b.id}: Product`,
    );
    assert.ok(
      nodes.some((n) => hasType(n, "Book")),
      `${b.id}: Book`,
    );
    if (b.availability === "unknown")
      assert.ok(
        !nodes.some((n) =>
          /\/(?:InStock|LimitedAvailability)$/.test(n.availability || ""),
        ),
        `${b.id}: no invented stock`,
      );
    if (!["sold", "reserved"].includes(b.availability)) {
      const offer = nodes.find((n) => hasType(n, "Offer"));
      assert.ok(offer, `${b.id}: Offer`);
      assert.equal(Number(offer.price), b.price);
      assert.equal(offer.priceCurrency, "EUR");
      assert.ok(html.includes(b.lb_url));
    } else if (b.availability === "sold")
      assert.ok(
        nodes.every(
          (n) =>
            !n.availability || n.availability === "https://schema.org/SoldOut",
        ),
      );
  }
});

test("three English pilots retain own canonicals and reciprocal language links", async () => {
  for (const id of enIds) {
    const b = books.find((b) => b.id === id);
    const fr = site.url + `/livres/${b.slug}/`,
      en = site.url + `/en/books/${b.slug}/`;
    for (const [language, url] of [
      ["fr", fr],
      ["en", en],
    ]) {
      const html = await readFile(distFile(url), "utf8");
      assert.match(html, new RegExp(`<html[^>]*lang=["']${language}["']`));
      assert.equal(canonical(html), url);
      const alternates = links(html).filter((a) => a.rel === "alternate");
      assert.ok(alternates.some((a) => a.hreflang === "fr" && a.href === fr));
      assert.ok(alternates.some((a) => a.hreflang === "en" && a.href === en));
      const nodes = structured(html);
      assert.ok(nodes.some((n) => hasType(n, "Product")));
      const offer = nodes.find((n) => hasType(n, "Offer"));
      assert.equal(Number(offer?.price), b.price);
      assert.equal(offer?.priceCurrency, "EUR");
    }
  }
});
