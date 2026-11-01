import { readFile, writeFile, mkdir, cp, rm, readdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { escapeHtml as e, marketUrl } from "../src/model.mjs";
import { card, gallery, bookInfo, bookPath } from "../src/views.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "dist");
if (dirname(out) !== root || out === root)
  throw Error("Unsafe output directory");
const readJson = async (path) =>
  JSON.parse(await readFile(join(root, path), "utf8"));
export const site = await readJson("data/site.json");
const sourceBooks = await readJson("data/books.json");
const media = await readJson("data/media.json");
export const books = sourceBooks.map(({ sources, ...book }) => ({
  ...book,
  images: media[book.id].map((image, i) => ({
    ...image,
    alt: `${book.title} — photographie ${i + 1} sur ${media[book.id].length}`,
  })),
}));
if (
  new Set(books.map((b) => b.id)).size !== books.length ||
  new Set(books.map((b) => b.slug)).size !== books.length
)
  throw Error("Duplicate book ID or slug");
for (const book of books) {
  if (
    !marketUrl(book.lb_url) ||
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
  .update(source.join("") + JSON.stringify(books))
  .digest("hex")
  .slice(0, 12);
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(join(root, "assets"), join(out, "assets"), { recursive: true });
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
  noindex = false,
}) {
  const fullTitle = `${title} | ${site.name}`;
  const canonical = site.url + path;
  const image =
    site.url +
    (book
      ? book.images[0].variants.at(-1).src
      : "/assets/images/banniere-1280.webp");
  const schema = book
    ? {
        "@context": "https://schema.org",
        "@type": "Book",
        "@id": canonical + "#book",
        name: book.title,
        author: { "@type": "Person", name: book.author },
        ...(book.year ? { datePublished: book.year } : {}),
        inLanguage: "fr",
        image: book.images.map((i) => site.url + i.variants.at(-1).src),
        description: book.description,
        url: canonical,
      }
    : {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: site.name,
        url: site.url + "/",
      };
  return /* HTML */ `<!doctype html>
    <html lang="fr">
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
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:site_name" content="${e(site.name)}" />
        <meta property="og:type" content="${book ? "book" : "website"}" />
        <meta property="og:title" content="${e(fullTitle)}" />
        <meta property="og:description" content="${e(description)}" />
        <meta property="og:url" content="${e(canonical)}" />
        <meta property="og:image" content="${e(image)}" />
        <meta
          property="og:image:alt"
          content="${e(book?.title || "Livres anciens de L’Atelier des Mémoires")}"
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
          ${JSON.stringify(schema).replaceAll("<", "\\u003c")}
        </script>
        <script type="module" src="/assets/app.js?v=${version}"></script>
      </head>
      <body>
        <a class="skip-link" href="#contenu">Aller au contenu</a>
        <header class="site-header">
          <div class="header-inner">
            <a class="brand" href="/" aria-label="${e(site.name)} — Accueil"
              ><img
                src="/assets/images/logo-80.png"
                alt=""
                width="40"
                height="40"
              /><span>L’Atelier des Mémoires</span></a
            >
            <nav aria-label="Navigation principale">
              ${nav.map(([href, label]) => `<a href="${href}" ${href === active ? 'aria-current="page"' : ""}>${label}</a>`).join("")}
            </nav>
            <a
              class="selection-link"
              href="/selection/"
              data-open-selection
              aria-label="Ma sélection"
              ><span>Sélection</span
              ><span class="badge" data-count aria-hidden="true">0</span></a
            >
          </div>
        </header>
        <main id="contenu" tabindex="-1">${body}</main>
        <footer class="site-footer">
          <div class="container footer-inner">
            <a class="footer-brand" href="/">${e(site.name)}</a>
            <p>Livres anciens, histoires à transmettre.</p>
            <nav aria-label="Informations">
              <a href="/mentions-legales/">Mentions légales</a
              ><a href="/conditions/">Achat & confidentialité</a
              ><a href="/faq/">Aide & contact</a>
            </nav>
            <p class="small">
              © ${new Date().getUTCFullYear()} ${e(site.name)}
            </p>
          </div>
        </footer>
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
  if (!config.noindex) pages.push(config.path);
}
const profile = site.seller.profileUrl
  ? `<p><a class="text-link" href="${e(marketUrl(site.seller.profileUrl))}" target="_blank" rel="noopener noreferrer">Voir le profil vendeur et ses évaluations sur Leboncoin <span class="sr-only">(nouvel onglet)</span>↗</a></p>`
  : "";
await page({
  path: "/",
  title: "Livres anciens, grimoires & manuscrits",
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
          Livres anciens,<br /><em>grimoires & manuscrits</em>
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
const categories = [...new Set(books.map((b) => b.category))];
await page({
  path: "/boutique/",
  title: "La boutique de livres anciens",
  description:
    "Parcourez les ouvrages de la collection : histoire, documents, contes, romans et biographies. Recherchez un titre ou un auteur et consultez les photographies.",
  body: /* HTML */ `<section class="container section">
    <div class="page-heading">
      <p class="eyebrow">Livres & manuscrits</p>
      <h1>La Boutique</h1>
      <p>Un titre, une époque, une découverte.</p>
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
  </section>`,
});
for (const book of books)
  await page({
    path: bookPath(book),
    active: "/boutique/",
    title: `${book.title} — ${book.author}`,
    description: `${book.title}, ${book.author}${book.year ? " (" + book.year + ")" : ""}. Découvrez les photographies et la description de cet exemplaire ancien, puis consultez son annonce.`,
    book,
    body: /* HTML */ `<div class="container section">
      <nav class="breadcrumbs" aria-label="Fil d’Ariane">
        <a href="/">Accueil</a><span aria-hidden="true">/</span
        ><a href="/boutique/">Boutique</a><span aria-hidden="true">/</span
        ><span>${e(book.title)}</span>
      </nav>
      <article class="product-layout">
        ${gallery(book, true)}
        <div class="product-info">${bookInfo(book)}</div>
      </article>
      <section class="related-section" aria-labelledby="related-title">
        <h2 id="related-title">Poursuivre la découverte</h2>
        <div class="book-grid">
          ${books
            .filter((b) => b.id !== book.id)
            .slice(0, 3)
            .map(card)
            .join("")}
        </div>
      </section>
    </div>`,
  });
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
    <h2>Publication</h2>
    ${legalDetails.length ? `<dl>${legalDetails.map(([k, v]) => `<dt>${e(k)}</dt><dd>${e(v)}</dd>`).join("")}</dl>` : "<p>Les informations d’identification et le contact de l’éditeur doivent être complétés. Pour une question concernant un ouvrage, contactez le vendeur via son annonce Leboncoin.</p>"}${seller.legalText ? `<p>${e(seller.legalText).replaceAll("\n", "<br>")}</p>` : ""}
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
      pages. Aucun outil de mesure d’audience ou de publicité n’est ajouté au
      site. L’hébergeur peut traiter les données techniques nécessaires à la
      fourniture du service. Lorsque vous ouvrez une annonce, les conditions et
      la politique de confidentialité de Leboncoin s’appliquent sur son service.
    </p>
  </article>`,
});
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
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map((p) => `<url><loc>${e(site.url + p)}</loc></url>`).join("")}</urlset>\n`,
);
await writeFile(
  join(out, "_redirects"),
  "/shop /boutique/ 301\n/about /a-propos/ 301\n/cart-page /selection/ 301\n",
);
console.log(
  `Built ${pages.length + 2} pages and ${books.length} book records into ${out}`,
);
