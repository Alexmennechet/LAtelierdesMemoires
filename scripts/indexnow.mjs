import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const endpoint = "https://api.indexnow.org/indexnow";
const hash = (value) => createHash("sha256").update(value).digest("hex");
// Netlify inserts this non-rendered hosting notice after deployment. Keep all
// visible text, metadata, links and scripts in the comparison unchanged.
const publishedContentHash = (html) =>
  hash(
    html.replace(/<!-- This site is hosted on Netlify\.[\s\S]*?-->\r?\n/g, ""),
  );

// Only explicitly named, indexable canonical pages from our built sitemap.
export function notificationPlan(siteUrl, key, sitemap, paths) {
  const site = new URL(siteUrl);
  if (site.protocol !== "https:" || site.username || site.password || site.port)
    throw Error("Expected a public HTTPS origin");
  if (!/^[a-f0-9]{32}$/.test(key)) throw Error("Invalid IndexNow key");
  const allowed = new Set(
    [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
      m[1].replaceAll("&amp;", "&"),
    ),
  );
  if (!paths.length || paths.length > 10000)
    throw Error("Name 1–10000 recently changed paths");
  const urlList = [...new Set(paths)].map((path) => {
    if (!/^\/(?:[a-z0-9-]+\/)*$/.test(path))
      throw Error(`Invalid canonical path: ${path}`);
    const url = new URL(path, site.origin).href;
    if (!allowed.has(url)) throw Error(`Page absent from sitemap: ${path}`);
    return url;
  });
  return {
    host: site.host,
    key,
    keyLocation: `${site.origin}/${key}.txt`,
    urlList,
  };
}

export async function notify({
  paths,
  submit = false,
  request = fetch,
  base = root,
}) {
  const json = async (path) =>
    JSON.parse(await readFile(join(base, path), "utf8"));
  const site = await json("data/site.json");
  const { key } = await json("data/indexnow.json");
  const sitemap = await readFile(join(base, "dist/sitemap.xml"), "utf8");
  const plan = notificationPlan(site.url, key, sitemap, paths);
  const folder = join(base, ".indexnow");
  const journalFile = join(folder, "submissions.json");
  let journal;
  try {
    journal = await json(".indexnow/submissions.json");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    journal = { accepted: {}, attempts: [] };
  }
  const pages = await Promise.all(
    plan.urlList.map(async (url) => {
      const path = new URL(url).pathname;
      const html = await readFile(
        join(base, "dist", path, "index.html"),
        "utf8",
      );
      if (/name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html))
        throw Error(`Cannot submit noindex page: ${url}`);
      return { url, html, hash: hash(html) };
    }),
  );
  const changed = pages.filter(
    (page) => journal.accepted[page.url]?.hash !== page.hash,
  );
  const result = {
    mode: submit ? "submit" : "dry-run",
    urlList: changed.map((p) => p.url),
    skippedUnchanged: pages.length - changed.length,
  };
  if (!submit || !changed.length) return result;
  const fingerprint = hash(
    JSON.stringify(changed.map(({ url, hash }) => [url, hash])),
  );
  const lastAttempt = journal.attempts.at(-1);
  if (
    lastAttempt &&
    (Date.now() < (lastAttempt.retryAt || 0) ||
      (lastAttempt.fingerprint === fingerprint &&
        Date.now() - Date.parse(lastAttempt.at) < 600000))
  )
    throw Error("Previous attempt still in cooldown; no request sent");
  const get = (url) =>
    request(url, { redirect: "error", signal: AbortSignal.timeout(15000) });
  const proof = await get(plan.keyLocation);
  if (proof.status !== 200 || (await proof.text()).trim() !== key)
    throw Error(
      "IndexNow key not yet verified on production; no submission sent",
    );
  for (const page of changed) {
    const response = await get(page.url);
    if (
      response.status !== 200 ||
      !response.headers.get("content-type")?.includes("text/html") ||
      publishedContentHash(await response.text()) !==
        publishedContentHash(page.html)
    )
      throw Error(
        `Production differs from this build: ${page.url}; no submission sent`,
      );
  }
  // One batch, one endpoint, no automatic retry or parallel engine submissions.
  const payload = { ...plan, urlList: result.urlList };
  const attempt = {
    at: new Date().toISOString(),
    fingerprint,
    urlList: result.urlList,
    status: null,
  };
  journal.attempts.push(attempt);
  await mkdir(folder, { recursive: true });
  await writeFile(journalFile, JSON.stringify(journal, null, 2) + "\n");
  const response = await request(endpoint, {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(20000),
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });
  attempt.status = response.status;
  attempt.retryAfter = response.headers.get("retry-after");
  if (attempt.retryAfter) {
    const seconds = Number(attempt.retryAfter);
    const until = /^\d+$/.test(attempt.retryAfter)
      ? Date.now() + seconds * 1000
      : Date.parse(attempt.retryAfter);
    if (Number.isFinite(until)) attempt.retryAt = until;
  }
  if ([200, 202].includes(response.status)) {
    for (const page of changed)
      journal.accepted[page.url] = {
        hash: page.hash,
        at: attempt.at,
        status: response.status,
      };
  }
  await writeFile(journalFile, JSON.stringify(journal, null, 2) + "\n");
  if (![200, 202].includes(response.status))
    throw Error(
      `IndexNow HTTP ${response.status}; no automatic retry. See .indexnow/submissions.json`,
    );
  return {
    ...result,
    status: response.status,
    meaning:
      response.status === 202
        ? "Received; key validation pending. Indexing not guaranteed."
        : "Received. Indexing not guaranteed.",
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2);
  try {
    if (args.some((arg) => arg.startsWith("--") && arg !== "--submit"))
      throw Error("Only --submit is supported");
    console.log(
      JSON.stringify(
        await notify({
          paths: args.filter((arg) => arg !== "--submit"),
          submit: args.includes("--submit"),
        }),
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
