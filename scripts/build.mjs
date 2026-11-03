import { readFile, writeFile, mkdir, cp, rm, readdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { escapeHtml as e, marketUrl } from "../src/model.mjs";
import { card, gallery, bookInfo, bookPath } from "../src/views.mjs";
import { buildEnglish } from "./english.mjs";
import { pageGraph } from "../src/seo.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "dist");
if (dirname(out) !== root || out === root)
  throw Error("Unsafe output directory");
const readJson = async (path) =>
  JSON.parse(await readFile(join(root, path), "utf8"));
export const site = await readJson("data/site.json");
const sourceBooks = await readJson("data/books.json");
const media = await readJson("data/media.json");
const translations = await readJson("data/en.json");
const indexNow = await readJson("data/indexnow.json");
if (!/^[a-f0-9]{32}$/.test(indexNow.key)) throw Error("Invalid IndexNow key");
const statuses = new Set(["unknown", "available", "reserved", "sold"]);
for (const book of sourceBooks) {
  if (
    !Number.isInteger(book.id) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(book.slug) ||
    !statuses.has(book.availability)
  )
    throw Error(`Invalid identity or status: ${book.id}`);
  if (!Array.isArray(media[book.id]) || !media[book.id].length)
    throw Error(`Missing gallery: ${book.id}`);
  if (
    book.listingStatus !== undefined &&
    !["inactive", "published", "unverified"].includes(book.listingStatus)
  )
    throw Error(`Invalid listing status: ${book.id}`);
  if (book.listingStatus === "inactive" && !marketUrl(book.inquiry_url))
    throw Error(`Missing safe seller contact: ${book.id}`);
  for (const image of media[book.id]) {
    if (!Array.isArray(image.variants) || !image.variants.length)
      throw Error(`Missing image variants: ${book.id}`);
    let previousWidth = 0;
    for (const variant of image.variants) {
      if (
        !/^\/(?:assets\/|PRODUITS\/Catalogue-2026-11\/)/.test(variant.src) ||
        variant.src.includes("..") ||
        variant.src.includes("?") ||
        !(variant.width > previousWidth) ||
        !(variant.height > 0)
      )
        throw Error(`Invalid image: ${book.id}`);
      previousWidth = variant.width;
      if (
        !resolve(root, "." + variant.src).startsWith(root + "/") &&
        !resolve(root, "." + variant.src).startsWith(root + "\\")
      )
        throw Error("Unsafe media path");
      await readFile(resolve(root, "." + variant.src));
    }
  }
}
export const books = sourceBooks.map(({ sources, ...book }) => ({
  ...book,
  images: media[book.id].map((image, i) => ({
    ...image,
    alt:
      image.alt ||
      `${book.title} — photographie ${i + 1} sur ${media[book.id].length}`,
  })),
}));
if (
  new Set(books.map((b) => b.id)).size !== books.length ||
  new Set(books.map((b) => b.slug)).size !== books.length
)
  throw Error("Duplicate book ID or slug");
for (const book of books) {
  if (
    (!marketUrl(book.lb_url) && book.availability !== "sold") ||
    !book.title ||
    !book.author ||
    !Number.isFinite(book.price) ||
    book.price < 0 ||
    !book.images.length
  )
    throw Error(`Invalid book ${book.id}`);
}
if (site.seller.profileUrl && !marketUrl(site.seller.profileUrl))
  throw Error("Invalid seller profile URL");
const sourceFiles = ["app.mjs", "styles.css", "model.mjs", "views.mjs"];
const source = await Promise.all(
  sourceFiles.map((f) => readFile(join(root, "src", f), "utf8")),
);
const version = createHash("sha256")
  .update(
    source.join("") +
      JSON.stringify(books) +
      JSON.stringify(site) +
      JSON.stringify(translations),
  )
  .digest("hex")
  .slice(0, 12);
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await writeFile(join(out, `${indexNow.key}.txt`), indexNow.key, "utf8");
await cp(join(root, "assets"), join(out, "assets"), { recursive: true });
// Preserve the exact published WebP bytes and URLs of the 100 new photographs.
for (const src of new Set(
  books
    .flatMap((book) =>
      book.images.flatMap((image) => image.variants.map((v) => v.src)),
    )
    .filter((src) => src.startsWith("/PRODUITS/")),
)) {
  const destination = resolve(out, "." + src);
  await mkdir(dirname(destination), { recursive: true });
  await cp(resolve(root, "." + src), destination);
}
for (const [i, file] of sourceFiles.entries()) {
  const content = source[i]
    .replaceAll("./model.mjs", `./model.js?v=${version}`)
    .replaceAll("./views.mjs", `./views.js?v=${version}`)
    .replaceAll("./catalog.js", `./catalog.js?v=${version}`);
  await writeFile(join(out, "assets", file.replace(".mjs", ".js")), content);
}
await writeFile(
  join(out, "assets/catalog.js"),
  `export default ${JSON.stringify(books).replaceAll("<", "\\u003c")};\n`,
);
await cp(
  join(root, "google6ad3f1d304551d3d.html"),
  join(out, "google6ad3f1d304551d3d.html"),
);
const nav = [
  ["/", "Accueil"],
  ["/boutique/", "Boutique"],
  ["/a-propos/", "À propos"],
  ["/faq/", "FAQ"],
];
function layout({
  title,
  description,
  path,
  body,
  active = path,
  book,
  guide,
  noindex = false,
  lang = "fr",
  alternates,
}) {
  const en = lang === "en";
  const fullTitle = `${title}${en && book ? " — French-language copy" : ""} | ${site.name}`;
  const canonical = site.url + path;
  const image =
    site.url +
    (guide
      ? guide.image.variants.at(-1).src
      : book
        ? book.images[0].variants.at(-1).src
        : "/assets/images/banniere-1280.webp");
  const graph = pageGraph({
    site,
    title,
    description,
    path,
    lang,
    book,
    guide,
  });
  if (!alternates) {
    const translated = book && translations.books.some((b) => b.id === book.id);
    alternates = translated
      ? [
          { lang: "fr", path: `/livres/${book.slug}/` },
          { lang: "en", path: `/en/books/${book.slug}/` },
        ]
      : [];
  }
  const currentNav = en
    ? [
        ["/en/", "Books"],
        ["/en/contact-shipping/", "Contact & delivery"],
        ["/boutique/", "Français"],
      ]
    : nav;
  const languageLinks = alternates.length
    ? alternates
    : [{ lang: en ? "fr" : "en", path: en ? "/" : "/en/" }];
  return /* HTML */ `<!doctype html>
    <html lang="${lang}">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${e(fullTitle)}</title>
        <meta name="description" content="${e(description)}" />
        <meta
          name="robots"
          content="${noindex ? "noindex, follow" : "index, follow"}"
        />
        <link rel="canonical" href="${e(canonical)}" />
        ${alternates.map((a) => `<link rel="alternate" hreflang="${a.lang}" href="${e(site.url + a.path)}">`).join("")}
        <meta property="og:locale" content="${en ? "en_GB" : "fr_FR"}" />
        <meta property="og:site_name" content="${e(site.name)}" />
        <meta
          property="og:type"
          content="${guide ? "article" : book ? "book" : "website"}"
        />
        <meta property="og:title" content="${e(fullTitle)}" />
        <meta property="og:description" content="${e(description)}" />
        <meta property="og:url" content="${e(canonical)}" />
        <meta property="og:image" content="${e(image)}" />
        <meta
          property="og:image:alt"
          content="${e(guide?.image.alt || book?.title || "Livres anciens de L’Atelier des Mémoires")}"
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${e(fullTitle)}" />
        <meta name="twitter:description" content="${e(description)}" />
        <meta name="twitter:image" content="${e(image)}" />
        <meta name="theme-color" content="#fdfbf7" />
        <meta
          name="google-site-verification"
          content="7ZdHeXYTZ7DiZU_PRpscocvn8qMrSu4fiRd5KLbLF90"
        />
        ${site.verification?.bing ? `<meta name="msvalidate.01" content="${e(site.verification.bing)}">` : ""}
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/assets/images/logo-32.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/assets/images/logo-180.png"
        />
        <link rel="stylesheet" href="/assets/fonts/fonts.css" />
        <link rel="stylesheet" href="/assets/styles.css?v=${version}" />
        <script type="application/ld+json">
          ${JSON.stringify(graph).replaceAll("<", "\\u003c")}
        </script>
        ${en ? "" : `<script type="module" src="/assets/app.js?v=${version}"></script>`}
      </head>
      <body>
        <a class="skip-link" href="#contenu"
          >${en ? "Skip to content" : "Aller au contenu"}</a
        >
        <header class="site-header">
          <div class="header-inner">
            <a
              class="brand"
              href="${en ? "/en/" : "/"}"
              aria-label="${e(site.name)} — ${en ? "Home" : "Accueil"}"
              ><img
                src="/assets/images/logo-80.png"
                alt=""
                width="40"
                height="40"
              /><span>L’Atelier des Mémoires</span></a
            >
            <nav
              aria-label="${en ? "Main navigation" : "Navigation principale"}"
            >
              ${currentNav.map(([href, label]) => `<a href="${href}" ${href === active ? 'aria-current="page"' : ""}>${label}</a>`).join("")}
            </nav>
            ${
              en
                ? '<a class="selection-link" href="/en/contact-shipping/">Ask about a book</a>'
                : `
            <a
              class="selection-link"
              href="/selection/"
              data-open-selection
              aria-label="Ma sélection"
              ><span>Sélection</span
              ><span class="badge" data-count aria-hidden="true">0</span></a
            >
            `
            }
          </div>
        </header>
        <nav
          class="language-nav container"
          aria-label="${en ? "Languages" : "Langues"}"
        >
          ${languageLinks.map((a) => `<a href="${a.path}" lang="${a.lang}" hreflang="${a.lang}">${a.lang === "fr" ? "Français" : "English"}</a>`).join(" · ")}
        </nav>
        <main id="contenu" tabindex="-1">${body}</main>
        <footer class="site-footer">
          <div class="container footer-inner">
            <a class="footer-brand" href="/">${e(site.name)}</a>
            <p>
              ${en ? "French books, stories to pass on." : "Livres anciens, histoires à transmettre."}
            </p>
            <nav aria-label="Informations">
              ${
                en
                  ? '<a href="/en/contact-shipping/">Contact & delivery</a><a href="/conditions/" lang="fr">Privacy information (French)</a><a href="/mentions-legales/" lang="fr">Site information (French)</a>'
                  : `
              <a href="/mentions-legales/">Mentions légales</a
              ><a href="/conditions/">Achat & confidentialité</a
              ><a href="/contact/">Contact</a><a href="/livraison/">Livraison</a><a href="/guides/">Guides</a>
              `
              }
            </nav>
            <p class="small">
              © ${new Date().getUTCFullYear()} ${e(site.name)}
            </p>
          </div>
        </footer>
        ${
          en
            ? ""
            : `
        <div
          class="sr-only"
          id="announcements"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        ></div>
        <dialog
          id="quick-dialog"
          class="quick-dialog"
          aria-labelledby="quick-title"
        >
          <div class="dialog-bar">
            <span>Aperçu de l’ouvrage</span
            ><button
              class="close-button"
              data-close
              aria-label="Fermer l’aperçu"
              autofocus
            >
              Fermer <span aria-hidden="true">×</span>
            </button>
          </div>
          <div id="quick-content"></div>
        </dialog>
        <dialog
          id="selection-dialog"
          class="selection-dialog"
          aria-labelledby="selection-title"
        >
          <div class="dialog-bar">
            <h2 id="selection-title">Ma sélection</h2>
            <button
              class="close-button"
              data-close
              aria-label="Fermer la sélection"
              autofocus
            >
              Fermer <span aria-hidden="true">×</span>
            </button>
          </div>
          <div class="selection-content" data-selection-list></div>
          <div class="selection-footer">
            <p class="small muted">La sélection ne réserve pas les ouvrages.</p>
            <a class="button" href="/selection/">Voir ma sélection</a>
          </div>
        </dialog>
        `
        }
      </body>
    </html>`;
}
const pages = [];
async function page(config) {
  const filename =
    config.path === "/404.html"
      ? join(out, "404.html")
      : join(out, config.path, "index.html");
  await mkdir(dirname(filename), { recursive: true });
  await writeFile(filename, layout(config));
  if (!config.noindex)
    pages.push({
      path: config.path,
      lastmod:
        config.lastmod ||
        config.guide?.updated ||
        config.book?.updated ||
        site.updated,
      book: config.book,
    });
}
const profile = site.seller.profileUrl
  ? `<p><a class="text-link" href="${e(marketUrl(site.seller.profileUrl))}" target="_blank" rel="noopener noreferrer">Voir le profil vendeur et ses évaluations sur Leboncoin <span class="sr-only">(nouvel onglet)</span>↗</a></p>`
  : "";
await page({
  path: "/",
  title: "Livres anciens et illustrés de collection",
  description:
    "Découvrez les livres anciens et manuscrits de L’Atelier des Mémoires : photographies, descriptions et annonces Leboncoin pour échanger avec le vendeur.",
  body: /* HTML */ `<section class="hero" aria-labelledby="hero-title">
      <picture class="hero-picture"
        ><source
          srcset="
            /assets/images/banniere-640.webp   640w,
            /assets/images/banniere-1280.webp 1280w,
            /assets/images/banniere-1536.webp 1536w
          "
          sizes="100vw"
          type="image/webp" />
        <img
          src="/assets/images/banniere-1280.webp"
          alt=""
          width="1536"
          height="1024"
          fetchpriority="high" /></picture
      ><video
        class="hero-video"
        muted
        loop
        playsinline
        preload="none"
        aria-hidden="true"
        tabindex="-1"
      ></video>
      <div class="hero-shade"></div>
      <div class="hero-content">
        <p class="eyebrow">Le goût des belles pages</p>
        <h1 id="hero-title">
          Livres anciens,<br /><em>illustrés & de collection</em>
        </h1>
        <p>Des ouvrages à découvrir, des histoires à transmettre.</p>
        <a class="button gold" href="/boutique/">Explorer la collection</a>
      </div>
      <button class="video-toggle" data-video aria-pressed="false" hidden>
        Lire la vidéo d’ambiance
      </button>
    </section>
    <section class="container section" aria-labelledby="featured-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">La collection</p>
          <h2 id="featured-title">À découvrir à l’Atelier</h2>
        </div>
        <a class="text-link" href="/boutique/">Voir tous les ouvrages →</a>
      </div>
      <div class="book-grid">${books.slice(0, 4).map(card).join("")}</div>
    </section>
    <section class="trust-section">
      <div class="container">
        <p class="eyebrow">De la découverte à la rencontre</p>
        <h2>Chaque ouvrage a son histoire.</h2>
        <div class="trust-grid">
          <div>
            <h3>Observer les détails</h3>
            <p>
              Reliures, gravures, pages de titre : les photographies vous aident
              à examiner chaque exemplaire.
            </p>
          </div>
          <div>
            <h3>Préparer sa sélection</h3>
            <p>
              Retrouvez vos ouvrages favoris dans une sélection personnelle,
              conservée sur cet appareil.
            </p>
          </div>
          <div>
            <h3>Échanger sur Leboncoin</h3>
            <p>
              Consultez l’annonce pour confirmer le prix, la disponibilité et
              les modalités avec le vendeur.
            </p>
            ${profile}
          </div>
        </div>
      </div>
    </section>`,
});
const catalogEditorialDate = "2026-11-03";
const editorial = new Map([
  [
    101,
    {
      title:
        "Carnet manuscrit illustré de 1918 – croquis militaires et de mode",
      photos: [0, 3, 6],
    },
  ],
  [
    102,
    {
      title: "Notre Belle Patrie – J. Monnier, Hachette 1911, 104 gravures",
      photos: [1, 0],
    },
  ],
  [
    104,
    {
      title: "Contes bleus – Édouard Laboulaye, illustrés par Yan’ Dargent",
      photos: [3, 2, 4],
    },
  ],
  [
    108,
    {
      title: "Berthe ou Le Devoir accompli – Pierre Dartois, Mégard 1893",
      photos: [2, 0, 4],
    },
  ],
  [
    113,
    {
      title:
        "Nils Holgersson – Selma Lagerlöf, Delagrave 1949, Roger Reboussin",
      photos: [2, 1, 6],
    },
  ],
  [
    118,
    {
      title: "Quentin Durward – Armand Colin 1934, illustré par Albert Robida",
      photos: [4, 5, 0],
    },
  ],
]);
const illustratedIds = [104, 107, 113, 118, 119, 121];
const prizeIds = [110, 111, 112, 117, 118];
const cartonnageGuide = "/guides/cartonnages-illustres/";
const catalogLinks = (ids) =>
  ids
    .map((id) => {
      const book = books.find((entry) => entry.id === id);
      return `<li><a href="${bookPath(book)}">${e(book.title)}</a></li>`;
    })
    .join("");
const categories = [...new Set(books.map((b) => b.category))];
await page({
  path: "/boutique/",
  title: "Livres anciens à vendre",
  lastmod: catalogEditorialDate,
  description:
    "Catalogue de livres anciens, romans illustrés, cartonnages et manuscrits. Consultez les photos, les éditions et les prix avant d’ouvrir l’annonce Leboncoin.",
  body: /* HTML */ `<section class="container section">
    <div class="page-heading">
      <p class="eyebrow">Livres & manuscrits</p>
      <h1>Catalogue de livres anciens</h1>
      <p>
        Parcourez des romans et contes illustrés, des cartonnages d’éditeur, des
        livres de prix et des documents manuscrits. Chaque fiche présente les
        photographies de l’exemplaire, les indications d’édition et son prix
        hors livraison.
      </p>
      <p>
        Pour acheter, ouvrez l’annonce Leboncoin depuis la fiche et vérifiez la
        disponibilité et les modalités de remise.
      </p>
      <p>
        <a href="#livres-anciens-illustres">Livres anciens illustrés</a> ·
        <a href="#livres-de-prix">Livres de prix anciens</a>
      </p>
    </div>
    <form class="catalog-controls" id="catalog-form" role="search" hidden>
      <div>
        <label for="search">Rechercher un ouvrage</label
        ><input
          type="search"
          id="search"
          name="q"
          placeholder="Titre, auteur, année…"
          autocomplete="off"
        />
      </div>
      <div>
        <label for="category">Catégorie</label
        ><select id="category" name="categorie">
          <option value="all">Tous les ouvrages</option>
          ${categories.map((c) => `<option>${e(c)}</option>`).join("")}
        </select>
      </div>
      <button class="button secondary" type="reset">Réinitialiser</button>
    </form>
    <p class="muted" id="result-count" role="status" aria-live="polite">
      ${books.length} ouvrages dans la collection
    </p>
    <h2 class="sr-only">Les ouvrages de la collection</h2>
    <div class="book-grid" id="catalog-grid">${books.map(card).join("")}</div>
    <div class="empty-state" id="no-results" hidden>
      <h2>Aucun ouvrage ne correspond à votre recherche</h2>
      <p>Essayez un autre titre, un auteur ou une catégorie.</p>
      <button class="button" data-reset>Afficher tous les ouvrages</button>
    </div>
    <section class="related-section" aria-labelledby="livres-anciens-illustres">
      <h2 id="livres-anciens-illustres">Livres anciens illustrés</h2>
      <p>
        Comparez les illustrations, les pages de titre et les reliures de ces
        romans et recueils. Les fiches indiquent les détails relevés pour chaque
        édition.
      </p>
      <ul>
        ${catalogLinks(illustratedIds)}
      </ul>
    </section>
    <section class="related-section" aria-labelledby="livres-de-prix">
      <h2 id="livres-de-prix">Livres de prix anciens</h2>
      <p>
        Les exemplaires ci-dessous portent une étiquette ou une inscription de
        récompense scolaire. Consultez le
        <a href="${cartonnageGuide}">guide des cartonnages illustrés</a> pour
        distinguer le décor de la reliure et les marques d’attribution.
      </p>
      <ul>
        ${catalogLinks(prizeIds)}
      </ul>
    </section>
  </section>`,
});
for (const book of books) {
  const detail = editorial.get(book.id);
  await page({
    path: bookPath(book),
    active: "/boutique/",
    title: detail?.title || book.title,
    lastmod: detail && [catalogEditorialDate, book.updated].sort().at(-1),
    description: detail
      ? book.edition
      : `${book.title}. ${book.description.split("\n")[0]}`
          .slice(0, 157)
          .replace(/\s+\S*$/, "") + "…",
    book,
    body: /* HTML */ `<div class="container section">
      <nav class="breadcrumbs" aria-label="Fil d’Ariane">
        <a href="/">Accueil</a><span aria-hidden="true">/</span
        ><a href="/boutique/">Boutique</a><span aria-hidden="true">/</span
        ><span>${e(book.title)}</span>
      </nav>
      <article class="product-layout" data-product-id="${book.id}">
        ${gallery(book, true)}
        <div class="product-info">${bookInfo(book)}</div>
      </article>
      ${
        detail
          ? `<section class="related-section" aria-labelledby="photo-details">
        <h2 id="photo-details">Détails visibles sur les photographies</h2>
        <ul>${detail.photos
          .map((index) => {
            const photo = book.images[index];
            return `<li><a href="${e(photo.variants.at(-1).src)}">${e(photo.alt)}</a></li>`;
          })
          .join("")}</ul>
      </section>`
          : ""
      }
      ${illustratedIds.includes(book.id) ? '<p><a href="/boutique/#livres-anciens-illustres">Voir les livres anciens illustrés</a></p>' : ""}
      ${prizeIds.includes(book.id) ? '<p><a href="/boutique/#livres-de-prix">Voir les livres de prix anciens</a></p>' : ""}
      <section class="related-section" aria-labelledby="related-title">
        <h2 id="related-title">Poursuivre la découverte</h2>
        <div class="book-grid">
          ${books
            .filter(
              (b) =>
                b.id !== book.id &&
                !["sold", "reserved"].includes(b.availability),
            )
            .sort(
              (a, b) =>
                Number(b.category === book.category) -
                Number(a.category === book.category),
            )
            .slice(0, 3)
            .map(card)
            .join("")}
        </div>
      </section>
    </div>`,
  });
}
await page({
  path: "/a-propos/",
  title: "À propos de l’Atelier",
  description:
    "L’Atelier des Mémoires présente une collection de livres anciens et de manuscrits. Découvrez notre démarche et comment examiner les ouvrages avant de contacter le vendeur.",
  body: /* HTML */ `<article class="prose section">
    <p class="eyebrow">Notre démarche</p>
    <h1>Transmettre les mémoires</h1>
    <p class="lead">
      Une reliure patinée, une note manuscrite, une gravure oubliée : les livres
      anciens racontent aussi l’histoire de ceux qui les ont ouverts.
    </p>
    <p>
      L’Atelier des Mémoires est un espace de découverte consacré aux livres
      anciens, aux ouvrages illustrés et aux manuscrits. Chaque fiche rassemble
      les informations disponibles et les photographies de l’exemplaire
      présenté.
    </p>
    <h2>Prendre le temps de regarder</h2>
    <p>
      Les éditions et les reliures varient d’un exemplaire à l’autre. Les dates
      confirmées sont indiquées sur les fiches ; les informations incertaines
      sont signalées. Pour toute précision sur l’état ou la provenance, échangez
      avec le vendeur avant l’achat.
    </p>
    <h2>Rencontrer le vendeur</h2>
    <p>
      La prise de contact et la transaction ont lieu sur Leboncoin. Chaque fiche
      propose un accès direct à l’annonce correspondante.
    </p>
    ${profile}<a class="button" href="/boutique/">Découvrir la collection</a>
  </article>`,
});
await page({
  path: "/faq/",
  title: "Questions fréquentes & contact",
  description:
    "Comment consulter un livre ancien, utiliser la sélection et contacter le vendeur sur Leboncoin : les réponses aux questions fréquentes.",
  body: /* HTML */ `<article class="prose section">
    <p class="eyebrow">Vous accompagner</p>
    <h1>Questions fréquentes</h1>
    <details open>
      <summary>Comment acquérir un ouvrage ?</summary>
      <p>
        Ouvrez sa fiche puis utilisez « Consulter l’annonce Leboncoin ».
        Confirmez le prix, la disponibilité et l’état auprès du vendeur avant de
        convenir de la transaction.
      </p>
    </details>
    <details>
      <summary>À quoi sert ma sélection ?</summary>
      <p>
        Elle permet de retrouver les ouvrages qui vous intéressent. Ajouter un
        livre ne le réserve pas et ne constitue pas une commande. Un même
        exemplaire ne peut être ajouté qu’une fois.
      </p>
    </details>
    <details>
      <summary>Où se font le paiement et la livraison ?</summary>
      <p>
        Le site n’encaisse aucun paiement. Les modalités de paiement, d’envoi ou
        de remise en main propre, les frais et les éventuelles protections sont
        à consulter sur Leboncoin et à convenir avec le vendeur.
      </p>
    </details>
    <details>
      <summary>Comment vérifier une édition ou l’état d’un livre ?</summary>
      <p>
        Examinez les photographies de la reliure et de la page de titre. Vous
        pouvez demander au vendeur des précisions ou d’autres vues dans la
        messagerie de l’annonce.
      </p>
    </details>
    <details>
      <summary>Comment contacter le vendeur ?</summary>
      <p>Utilisez la messagerie de l’annonce du livre concerné.</p>
      ${profile}${site.seller.contactEmail ? `<p>Contact : <a href="mailto:${e(site.seller.contactEmail)}">${e(site.seller.contactEmail)}</a></p>` : ""}
    </details>
    <details>
      <summary>Ma sélection est-elle conservée ?</summary>
      <p>
        Si votre navigateur l’autorise, la sélection est enregistrée localement
        sur cet appareil. Aucun compte n’est nécessaire. Si le stockage est
        indisponible, elle reste utilisable pendant la visite.
      </p>
    </details>
  </article>`,
});
await page({
  path: "/selection/",
  title: "Ma sélection",
  description:
    "Retrouvez vos ouvrages sélectionnés et leurs annonces Leboncoin.",
  noindex: true,
  body: /* HTML */ `<section class="container section selection-page">
    <p class="eyebrow">Vos découvertes</p>
    <h1>Ma sélection</h1>
    <p>
      Retrouvez ici les ouvrages qui vous intéressent, puis consultez chaque
      annonce pour échanger avec le vendeur.
    </p>
    <p class="muted">
      Cette sélection ne réserve pas les livres. Prix, disponibilité et frais
      sont à confirmer sur Leboncoin.
    </p>
    <h2 class="sr-only">Ouvrages sélectionnés</h2>
    <div data-full-selection>
      <noscript
        ><p>
          La sélection personnelle nécessite JavaScript. Toutes les fiches et
          leurs annonces restent consultables dans la boutique.
        </p></noscript
      >
    </div>
    <a class="text-link" href="/boutique/"
      >← Continuer à explorer la boutique</a
    >
  </section>`,
});
const seller = site.seller;
const legalDetails = [
  ["Éditeur", seller.publicName],
  ["Statut", seller.status],
  ["Contact", seller.contactEmail],
  ["Adresse de publication", seller.publicAddress],
  ["Immatriculation", seller.registration],
  ["Responsable de publication", seller.publicationDirector],
].filter(([, v]) => v);
await page({
  path: "/mentions-legales/",
  title: "Mentions légales",
  description:
    "Informations de publication et d’hébergement du site L’Atelier des Mémoires.",
  body: /* HTML */ `<article class="prose section">
    <h1>Mentions légales</h1>
    <h2>Publication et contact</h2>
    <p>Localisation : Paris.</p>
    ${profile}
    ${legalDetails.length ? `<dl>${legalDetails.map(([k, v]) => `<dt>${e(k)}</dt><dd>${e(v)}</dd>`).join("")}</dl>` : "<p>L’Atelier des Mémoires présente ce catalogue depuis Paris. Pour une question sur un ouvrage ou sur le site, contactez le vendeur via son profil ou son annonce Leboncoin.</p>"}${seller.legalText ? `<p>${e(seller.legalText).replaceAll("\n", "<br>")}</p>` : ""}
    <h2>Hébergement</h2>
    <p>
      Le site est hébergé par Netlify.
      <a
        href="https://www.netlify.com/"
        target="_blank"
        rel="noopener noreferrer"
        >Informations sur l’hébergeur
        <span class="sr-only">(nouvel onglet)</span>↗</a
      >
    </p>
    <h2>Contenu du catalogue</h2>
    <p>
      Les photographies et les descriptions concernent les exemplaires
      présentés. Les prix sont indicatifs et la disponibilité doit être
      confirmée sur les annonces. Les liens vers Leboncoin mènent à un service
      distinct.
    </p>
    <p>
      <a href="/conditions/"
        >Consulter les informations d’achat et de confidentialité</a
      >
    </p>
  </article>`,
});
await page({
  path: "/conditions/",
  title: "Achat & confidentialité",
  description:
    "Fonctionnement de la sélection, transactions sur Leboncoin et stockage local des données sur L’Atelier des Mémoires.",
  body: /* HTML */ `<article class="prose section">
    <h1>Achat & confidentialité</h1>
    <h2>Consulter et contacter</h2>
    <p>
      Ce site présente des ouvrages et permet de constituer une sélection. Il ne
      propose ni compte client, ni commande, ni paiement. Les annonces Leboncoin
      servent à contacter le vendeur et à convenir des modalités de la
      transaction.
    </p>
    <p>
      Vérifiez sur l’annonce le prix, la disponibilité, l’état, les frais et les
      modalités applicables avant tout achat. La sélection ne vaut ni
      réservation ni engagement d’achat.
    </p>
    ${seller.termsText ? `<p>${e(seller.termsText).replaceAll("\n", "<br>")}</p>` : ""}
    <h2>Votre sélection sur cet appareil</h2>
    <p>
      Seuls les identifiants des ouvrages sélectionnés sont enregistrés dans le
      stockage local du navigateur, lorsque vous utilisez cette fonctionnalité.
      Ils ne sont pas envoyés à un serveur. Vous pouvez les effacer avec le
      bouton ci-dessous ou en supprimant les données du site dans votre
      navigateur.
    </p>
    <button class="button secondary" data-clear-storage hidden>
      Effacer ma sélection enregistrée
    </button>
    <h2>Services externes</h2>
    <p>
      Les photographies, polices et vidéos du site sont hébergées avec ses
      pages. Aucun outil de collecte d’audience ou de publicité n’est ajouté au
      site. L’hébergeur peut traiter les données techniques nécessaires à la
      fourniture du service. Lorsque vous ouvrez une annonce, les conditions et
      la politique de confidentialité de Leboncoin s’appliquent sur son service.
    </p>
  </article>`,
});
await page({
  path: "/contact/",
  title: "Contact à Paris",
  description:
    "Contactez L’Atelier des Mémoires à Paris via le profil vendeur ou l’annonce du livre sur Leboncoin.",
  body: `<article class="prose section"><p class="eyebrow">L’Atelier des Mémoires · Paris</p><h1>Parlons de votre prochain livre</h1><p>Pour connaître l’état d’un exemplaire, demander une photographie ou confirmer ses modalités de remise, contactez le vendeur depuis l’annonce du livre sur Leboncoin.</p>${profile}<h2>Une question sur un ouvrage</h2><p>Indiquez son titre ou sa référence ADM. La réponse sur la disponibilité, le prix et les modalités de remise fait foi avant la transaction.</p><a class="button" href="/boutique/">Retrouver le livre et son annonce</a><h2>Un projet depuis l’étranger</h2><p>Les expéditions internationales ne sont pas actuellement organisées. Vous pouvez demander des renseignements ; aucune livraison hors de France métropolitaine n’est annoncée disponible.</p><p><a href="/livraison/">Consulter les informations de remise et de livraison</a></p></article>`,
});
await page({
  path: "/livraison/",
  title: "Remise à Paris et livraison",
  description:
    "Remise en main propre à Paris et livraison selon l’annonce Leboncoin. Vérifiez les frais et la disponibilité avant l’achat.",
  body: `<article class="prose section"><p class="eyebrow">Préparer votre achat</p><h1>Remise et livraison</h1><h2>Remise en main propre à Paris</h2><p>Le lieu et le rendez-vous sont à convenir avec le vendeur dans la messagerie Leboncoin. Aucun rendez-vous n’est réservé par la sélection du site.</p><h2>Livraison en France métropolitaine</h2><p>Consultez les options réellement proposées sur l’annonce. Le prix affiché dans ce catalogue est le prix du livre ou du lot, hors frais de livraison. Le transporteur, les frais, les délais et les protections applicables sont à vérifier avant le paiement sur Leboncoin.</p><h2>Demandes internationales</h2><p>Les expéditions internationales ne sont pas actuellement organisées. Une demande de renseignements ne constitue ni une confirmation d’expédition ni une commande. Aucune livraison vers les États-Unis, la Chine ou un autre pays étranger n’est garantie.</p><h2>Avant de confirmer</h2><p>Vérifiez le contenu du lot, l’état de l’exemplaire et sa disponibilité. Si un point n’apparaît pas dans la galerie, demandez une vérification au vendeur.</p><a class="button" href="/contact/">Contacter le vendeur</a><p><a href="https://www.leboncoin.fr/dc/cgu" target="_blank" rel="noopener noreferrer">Conditions des services Leboncoin ↗</a></p></article>`,
});
const guides = await readJson("data/guides.json");
const inline = (text) =>
  e(text)
    .replace(
      /\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    )
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
function markdown(source) {
  return source
    .split(/\r?\n\s*\r?\n/)
    .filter((block) => !block.startsWith("# "))
    .map((block) => {
      if (block.startsWith("## "))
        return `<h2>${inline(block.slice(3).trim())}</h2>`;
      return `<p>${inline(block.trim())}</p>`;
    })
    .join("");
}
await page({
  path: "/guides/",
  title: "Guides pour découvrir les livres anciens",
  description:
    "Comprendre les dates, les éditions et l’état des livres anciens à partir d’exemples du catalogue.",
  body: `<article class="prose section"><p class="eyebrow">Regarder et comprendre</p><h1>Les guides de l’Atelier</h1><p>Des repères pour examiner un exemplaire et poser les bonnes questions avant l’achat.</p>${guides.map((g) => `<section><h2><a href="/guides/${g.slug}/">${e(g.title)}</a></h2><p>${e(g.description)}</p></section>`).join("")}</article>`,
});
for (const guide of guides) {
  if (!/^[a-z0-9-]+$/.test(guide.slug) || !/^[a-z0-9-]+\.md$/.test(guide.file))
    throw Error("Invalid guide path");
  for (const date of [guide.published, guide.updated]) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      new Date(date).toISOString().slice(0, 10) !== date
    )
      throw Error(`Invalid guide date: ${guide.slug}`);
  }
  if (guide.updated < guide.published)
    throw Error(`Guide updated before publication: ${guide.slug}`);
  const example = books.find((book) => book.id === guide.illustration?.bookId);
  const image = example?.images[guide.illustration?.imageIndex];
  if (
    !image ||
    !guide.relatedBookIds.includes(example.id) ||
    !guide.illustration.caption
  )
    throw Error(`Invalid guide illustration: ${guide.slug}`);
  const largest = image.variants.at(-1);
  const dateLabel = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  }).format(new Date(guide.published));
  await page({
    path: `/guides/${guide.slug}/`,
    title: guide.title,
    description: guide.description,
    guide: { ...guide, image },
    body: `<article class="prose section"><nav class="breadcrumbs" aria-label="Fil d’Ariane"><a href="/guides/">Guides</a><span aria-hidden="true">/</span><span>${e(guide.title)}</span></nav><h1>${e(guide.title)}</h1><p class="muted">Un guide de <a href="/a-propos/">${e(site.name)}</a> · Publié le <time datetime="${guide.published}">${e(dateLabel)}</time></p><figure class="guide-illustration"><a href="${bookPath(example)}"><img src="${e(largest.src)}" srcset="${image.variants.map((variant) => `${e(variant.src)} ${variant.width}w`).join(", ")}" sizes="(max-width: 760px) 100vw, 800px" width="${largest.width}" height="${largest.height}" alt="${e(image.alt)}" decoding="async"></a><figcaption>${e(guide.illustration.caption)} <a href="${bookPath(example)}">Voir la fiche de cet exemplaire</a>.</figcaption></figure>${markdown(await readFile(join(root, "content", guide.file), "utf8"))}<h2>Examiner les exemplaires cités</h2><ul>${guide.relatedBookIds
      .map((id) => books.find((b) => b.id === id))
      .filter(Boolean)
      .map((b) => `<li><a href="${bookPath(b)}">${e(b.title)}</a></li>`)
      .join(
        "",
      )}</ul>${guide.slug === "cartonnages-illustres" ? '<p><a href="/boutique/#livres-de-prix">Voir les livres de prix du catalogue</a> · <a href="/boutique/#livres-anciens-illustres">Voir les livres anciens illustrés</a></p>' : ""}</article>`,
  });
}
await buildEnglish({ page, site, books, translations });
await page({
  path: "/404.html",
  title: "Page introuvable",
  description:
    "Cette page est introuvable. Retrouvez les livres anciens dans la boutique.",
  noindex: true,
  body: '<section class="prose section"><p class="eyebrow">Erreur 404</p><h1>Cette page a tourné…</h1><p>Le lien demandé ne correspond à aucune page de la collection.</p><a class="button" href="/boutique/">Retrouver la boutique</a></section>',
});
await writeFile(
  join(out, "robots.txt"),
  `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`,
);
await writeFile(
  join(out, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${pages.map((p) => `<url><loc>${e(site.url + p.path)}</loc><lastmod>${e(p.lastmod)}</lastmod>${p.book ? p.book.images.map((i) => `<image:image><image:loc>${e(site.url + i.variants.at(-1).src)}</image:loc></image:image>`).join("") : ""}</url>`).join("")}</urlset>\n`,
);
await writeFile(
  join(out, "_redirects"),
  "/index.html / 301!\n/shop /boutique/ 301\n/about /a-propos/ 301\n/cart-page /selection/ 301\n",
);
console.log(
  `Built ${pages.length + 2} pages and ${books.length} book records into ${out}`,
);
