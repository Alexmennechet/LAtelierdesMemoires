import { card, gallery, bookInfo, bookPath } from "../src/views.mjs";
import { escapeHtml as e, marketUrl } from "../src/model.mjs";

export async function buildEnglish({ page, site, books, translations }) {
  if (
    typeof page !== "function" ||
    !Array.isArray(books) ||
    !Array.isArray(translations?.books)
  ) {
    throw new Error(
      "English pages require a page writer, catalogue and translations.books.",
    );
  }
  const ids = new Set();
  const englishBooks = translations.books.map((translation) => {
    const source = books.find((book) => book.id === translation.id);
    if (
      !source ||
      ids.has(translation.id) ||
      !translation.description ||
      !translation.metaDescription
    ) {
      throw new Error(`Missing or duplicate English book: ${translation.id}`);
    }
    ids.add(translation.id);
    return {
      ...source,
      ...translation,
      id: source.id,
      slug: source.slug,
      title: source.title,
      price: source.price,
      lb_url: source.lb_url,
      availability: source.availability,
      language: source.language,
      pageLanguage: "en",
      images: source.images.map((image, index) => ({
        ...image,
        alt: `${source.title} — photograph ${index + 1} of ${source.images.length}`,
      })),
    };
  });
  const profileUrl = marketUrl(site.seller?.profileUrl);
  const contact = translations.contact || {};
  const shipping = translations.shipping || {};
  const profileLink = profileUrl
    ? `<a class="button market" href="${e(profileUrl)}" target="_blank" rel="noopener noreferrer">${e(contact.profileCta || "View the seller’s Leboncoin profile")}<span class="sr-only"> (new tab)</span> ↗</a>`
    : "";
  const shippingNotice =
    shipping.description ||
    "Purchases are completed through Leboncoin. Its integrated delivery services are defined for mainland France. International delivery has not been confirmed for this shop.";

  await page({
    lang: "en",
    path: "/en/",
    title: "French-language illustrated books",
    description:
      "French-language illustrated books with English descriptions, photographs and edition notes. Contact the seller through the individual Leboncoin listings.",
    alternates: [],
    body: `<section class="container section" aria-labelledby="english-books-title">
      <div class="page-heading">
        <p class="eyebrow">L’Atelier des Mémoires</p>
        <h1 id="english-books-title">French-language books</h1>
        <p>Explore these copies with English descriptions, photographs and edition notes. The books themselves are in French.</p>
        <p><a class="text-link" href="/en/contact-shipping/">Collection, delivery and contact →</a></p>
      </div>
      <h2 class="sr-only">Books with English descriptions</h2>
      <div class="book-grid">${englishBooks.map(card).join("")}</div>
      <p class="small muted">Prices are stated in EUR, excluding delivery. Confirm availability and arrangements with the seller on Leboncoin.</p>
      <p><a class="text-link" href="/boutique/" lang="fr">Voir tous les ouvrages en français →</a></p>
    </section>`,
  });

  await page({
    lang: "en",
    path: "/en/contact-shipping/",
    title: "Collection, delivery and contact",
    description:
      "Contact the seller on Leboncoin about French-language books. Collection in Paris must be arranged; integrated delivery is for mainland France.",
    alternates: [],
    body: `<article class="prose section">
      <p class="eyebrow">L’Atelier des Mémoires</p>
      <h1>Collection, delivery and contact</h1>
      <p class="lead">Ask the seller about the copy you are interested in before making arrangements.</p>
      <h2>${e(contact.heading || "Ask about this copy")}</h2>
      <p>${e(contact.description || "For questions about a book, its condition or collection and delivery, use its Leboncoin listing to contact the seller.")}</p>
      ${profileLink ? `<p>${profileLink}</p>` : ""}
      <ul>${englishBooks
        .map((book) => {
          const url = marketUrl(book.lb_url);
          return url
            ? `<li><a class="text-link" href="${e(url)}" target="_blank" rel="noopener noreferrer">${e(book.title)}<span class="sr-only"> (Leboncoin listing, new tab)</span> ↗</a></li>`
            : "";
        })
        .join("")}</ul>
      <h2>${e(shipping.heading || "Collection & delivery")}</h2>
      ${site.seller?.city ? `<p>The seller is based in ${e(site.seller.city)}. Collection arrangements must be confirmed through Leboncoin.</p>` : ""}
      <p>${e(shippingNotice)}</p>
      <p>${e(shipping.internationalRequest || "For a request to deliver outside mainland France, ask the seller through the relevant Leboncoin listing about your destination, possible arrangements and costs before proceeding.")}</p>
      <p>${e(shipping.priceNotice || "Book prices are stated in EUR and exclude delivery.")}</p>
      <p>${e(shipping.collectionNotice || "Collection and delivery arrangements must be confirmed with the seller on Leboncoin.")}</p>
      <p><a class="text-link" href="/en/">Back to the book selection →</a></p>
    </article>`,
  });

  for (const book of englishBooks) {
    await page({
      lang: "en",
      path: bookPath(book),
      title: book.title,
      description: book.metaDescription,
      book,
      alternates: [
        { lang: "fr", path: `/livres/${book.slug}/` },
        { lang: "en", path: bookPath(book) },
      ],
      body: `<div class="container section">
        <nav class="breadcrumbs" aria-label="Breadcrumb">
          <a href="/en/">Books</a><span aria-hidden="true">/</span><span>${e(book.title)}</span>
        </nav>
        <article class="product-layout">
          <div>${gallery(book, true)}<p class="small muted">Select a thumbnail to open the full-size photograph. Use your browser’s Back button to return to this page.</p></div>
          <div class="product-info">${bookInfo(book)}<p><a class="text-link" href="/en/contact-shipping/">Collection, delivery and contact →</a></p></div>
        </article>
        <section class="related-section" aria-labelledby="related-title">
          <h2 id="related-title">Other books with English descriptions</h2>
          <div class="book-grid">${englishBooks
            .filter((other) => other.id !== book.id)
            .map(card)
            .join("")}</div>
        </section>
      </div>`,
    });
  }
  return englishBooks;
}
