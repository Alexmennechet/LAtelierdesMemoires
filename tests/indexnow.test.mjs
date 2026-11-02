import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { notificationPlan, notify } from "../scripts/indexnow.mjs";

const site = "https://example.org";
const key = "0123456789abcdef0123456789abcdef";
const sitemap = `<urlset><url><loc>${site}/guides/</loc></url><url><loc>${site}/guides/nouveau/</loc></url></urlset>`;
const html =
  '<html><head><link rel="canonical" href="https://example.org/guides/nouveau/"></head><body>Nouveau guide</body></html>';
async function fixture(t) {
  const base = await mkdtemp(join(tmpdir(), "atelier-indexnow-"));
  t.after(async () => {
    if (!base.startsWith(join(tmpdir(), "atelier-indexnow-")))
      throw Error("Unsafe test directory");
    await rm(base, { recursive: true, force: true });
  });
  await mkdir(join(base, "data"));
  await mkdir(join(base, "dist/guides/nouveau"), { recursive: true });
  await writeFile(join(base, "data/site.json"), JSON.stringify({ url: site }));
  await writeFile(join(base, "data/indexnow.json"), JSON.stringify({ key }));
  await writeFile(join(base, "dist/sitemap.xml"), sitemap);
  await writeFile(join(base, "dist/guides/nouveau/index.html"), html);
  return base;
}
function engine(status = 200, liveHtml = html) {
  const calls = [];
  const request = async (url, options) => {
    calls.push({ url, options });
    if (options.method === "POST")
      return new Response(null, { status, headers: { "retry-after": "3600" } });
    if (url.endsWith(`${key}.txt`)) return new Response(key);
    return new Response(liveHtml, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  };
  return { calls, request };
}
test("IndexNow excludes other origins, traversal, noncanonical and nonindexable paths", () => {
  for (const path of [
    "https://evil.test/",
    "//evil.test/",
    "/../",
    "/selection/",
    "/404.html",
    "/guides/?x=1",
  ])
    assert.throws(() => notificationPlan(site, key, sitemap, [path]));
  assert.throws(() => notificationPlan(site, key, sitemap, []));
  assert.throws(() => notificationPlan(site, "invalid", sitemap, ["/guides/"]));
  assert.deepEqual(
    notificationPlan(site, key, sitemap, ["/guides/", "/guides/"]).urlList,
    [`${site}/guides/`],
  );
});
test("IndexNow dry run makes no network request and writes no submission journal", async (t) => {
  const base = await fixture(t);
  const result = await notify({
    base,
    paths: ["/guides/nouveau/"],
    request: () => {
      throw Error("Network forbidden");
    },
  });
  assert.equal(result.mode, "dry-run");
  assert.equal(result.urlList.length, 1);
  await assert.rejects(readFile(join(base, ".indexnow/submissions.json")), {
    code: "ENOENT",
  });
});
test("IndexNow refuses a build not yet live before any POST", async (t) => {
  const base = await fixture(t);
  const api = engine(200, "Old deployed page");
  await assert.rejects(
    notify({
      base,
      submit: true,
      paths: ["/guides/nouveau/"],
      request: api.request,
    }),
    /Production differs/,
  );
  assert.equal(
    api.calls.filter((call) => call.options.method === "POST").length,
    0,
  );
});
test("IndexNow refuses missing ownership proof and noindex pages", async (t) => {
  const base = await fixture(t);
  await assert.rejects(
    notify({
      base,
      submit: true,
      paths: ["/guides/nouveau/"],
      request: async () => new Response("wrong key"),
    }),
    /key not yet verified/,
  );
  await writeFile(
    join(base, "dist/guides/nouveau/index.html"),
    '<meta name="robots" content="noindex">',
  );
  await assert.rejects(
    notify({
      base,
      submit: true,
      paths: ["/guides/nouveau/"],
      request: () => {
        throw Error("Network forbidden");
      },
    }),
    /noindex/,
  );
});
for (const status of [200, 202])
  test(`IndexNow HTTP ${status} records receipt and skips an identical subsequent publication`, async (t) => {
    const base = await fixture(t);
    const api = engine(status);
    const result = await notify({
      base,
      submit: true,
      paths: ["/guides/nouveau/"],
      request: api.request,
    });
    assert.equal(result.status, status);
    const posts = api.calls.filter((call) => call.options.method === "POST");
    assert.equal(posts.length, 1);
    assert.deepEqual(JSON.parse(posts[0].options.body).urlList, [
      `${site}/guides/nouveau/`,
    ]);
    const repeated = await notify({
      base,
      submit: true,
      paths: ["/guides/nouveau/"],
      request: () => {
        throw Error("No duplicate requests");
      },
    });
    assert.equal(repeated.skippedUnchanged, 1);
    assert.equal(repeated.urlList.length, 0);
  });
test("IndexNow HTTP 429 stops without retry and observes Retry-After across invocations", async (t) => {
  const base = await fixture(t);
  const api = engine(429);
  await assert.rejects(
    notify({
      base,
      submit: true,
      paths: ["/guides/nouveau/"],
      request: api.request,
    }),
    /HTTP 429/,
  );
  assert.equal(
    api.calls.filter((call) => call.options.method === "POST").length,
    1,
  );
  const journal = JSON.parse(
    await readFile(join(base, ".indexnow/submissions.json"), "utf8"),
  );
  assert.deepEqual(journal.accepted, {});
  assert.ok(journal.attempts[0].retryAt > Date.now());
  await assert.rejects(
    notify({
      base,
      submit: true,
      paths: ["/guides/nouveau/"],
      request: () => {
        throw Error("Cooldown must prevent requests");
      },
    }),
    /cooldown/,
  );
});
