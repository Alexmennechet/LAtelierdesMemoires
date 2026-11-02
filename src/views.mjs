import { escapeHtml as e, price, marketUrl, isPurchasable } from "./model.mjs";
const english = (book) => book.pageLanguage === "en";
export const bookPath = (book) =>
  `${english(book) ? "/en/books" : "/livres"}/${book.slug}/`;
export const srcset = (image) =>
  image.variants.map((v) => `${v.src} ${v.width}w`).join(", ");
export function imageTag(
  image,
  {
    alt = image.alt,
    sizes = "100vw",
    loading = "lazy",
    className = "",
    main = false,
  } = {},
) {
  const largest = image.variants.at(-1);
  return `<img ${main ? "data-gallery-image" : ""} src="${e(largest.src)}" srcset="${e(srcset(image))}" sizes="${e(sizes)}" width="${largest.width}" height="${largest.height}" alt="${e(alt)}" loading="${loading}" decoding="async" class="${e(className)}">`;
}
export function card(book) {
  const en = english(book),
    active = isPurchasable(book);
  return `<article class="book-card" data-book-card="${book.id}"><a href="${bookPath(book)}" class="cover-link" tabindex="-1" aria-hidden="true">${imageTag(book.images[0], { alt: "", sizes: "(max-width: 599px) 92vw, (max-width: 999px) 44vw, 280px" })}</a><div class="card-copy"><p class="eyebrow">${e(book.category)}</p><h3><a href="${bookPath(book)}">${e(book.title)}</a></h3><p class="book-author">${e(book.author)}${book.year ? ` · ${e(book.year)}` : ""}</p><p class="price">${price(book.price, en ? "en" : "fr")}</p>${!active ? `<p class="stock-status">${stockText(book)}</p>` : ""}${en ? "" : `<div class="card-actions"><button class="button secondary" data-quick="${book.id}" aria-label="Aperçu de ${e(book.title)}" hidden>Aperçu</button>${active ? `<button class="button" data-add="${book.id}" aria-label="Ajouter ${e(book.title)} à ma sélection" hidden>Ajouter</button>` : ""}</div>`}</div></article>`;
}
export function gallery(book, eager = false) {
  const en = english(book),
    label = en ? "Photograph" : "Photographie";
  return `<div class="gallery" data-gallery="${book.id}">${imageTag(book.images[0], { alt: book.images[0].alt || `${book.title} — ${label.toLowerCase()} 1 / ${book.images.length}`, sizes: "(max-width: 699px) 92vw, 600px", loading: eager ? "eager" : "lazy", main: true, className: "gallery-main" })}<div class="thumbnails" role="group" aria-label="${en ? "Photographs" : "Photographies"} : ${e(book.title)}">${book.images.map((image, i) => `<a href="${e(image.variants.at(-1).src)}" class="thumbnail" data-photo="${i}" aria-label="${en ? "View photograph" : "Afficher la photographie"} ${i + 1} / ${book.images.length}" ${i === 0 ? 'aria-current="true"' : ""}>${imageTag(image, { alt: "", sizes: "72px" })}</a>`).join("")}</div><p class="gallery-caption" data-gallery-caption aria-live="polite">${label} 1 / ${book.images.length}</p></div>`;
}
export function description(book) {
  return book.description
    .split(/\n\n/)
    .map((p) => `<p>${e(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}
export function stockText(book) {
  const en = english(book);
  if (book.availability === "sold")
    return en
      ? "Sold — this copy is no longer offered."
      : "Vendu — cet exemplaire n’est plus proposé à l’achat.";
  if (book.availability === "reserved")
    return en
      ? "Reserved — please ask about availability."
      : "Réservé — disponibilité à reconfirmer auprès du vendeur.";
  return en
    ? "Availability and delivery costs must be confirmed on the listing."
    : "Disponibilité et frais de livraison à confirmer sur l’annonce.";
}
export function marketLink(book, label) {
  if (!isPurchasable(book))
    return `<p class="stock-status" role="status">${stockText(book)}</p>`;
  const en = english(book),
    href = marketUrl(book.lb_url);
  return href
    ? `<a class="button market" href="${e(href)}" target="_blank" rel="noopener noreferrer" data-market="${book.id}">${e(label || (en ? "Ask the seller on Leboncoin" : "Consulter l’annonce Leboncoin"))}<span class="sr-only"> ${en ? "(new tab)" : "(nouvel onglet)"}</span><span aria-hidden="true"> ↗</span></a>`
    : `<p>${en ? "Listing link unavailable." : "Lien de l’annonce indisponible."}</p>`;
}
export function bookInfo(book, heading = "h1") {
  const en = english(book),
    active = isPurchasable(book);
  return `<p class="eyebrow">${e(book.category)} · ${en ? "Ref." : "Réf."} ADM-${book.id}</p><${heading}>${e(book.title)}</${heading}><p class="book-author">${e(book.author)} · ${book.year ? e(book.year) : en ? "Publication year to be confirmed" : "Date d’édition à confirmer"}</p><p class="price product-price">${price(book.price, en ? "en" : "fr")}</p><p class="muted">${en ? "Asking price, excluding delivery. " : "Prix proposé, hors livraison. "}${stockText(book)}</p><div class="product-actions">${!en && active ? `<button class="button" data-add="${book.id}" hidden>Ajouter à ma sélection</button>` : ""}${marketLink(book)}</div><p class="small muted">${en ? "This is a French-language book. Purchases take place on Leboncoin; international delivery is not currently arranged." : "La sélection ne réserve pas l’ouvrage. La prise de contact et la transaction se font sur Leboncoin."}</p><div class="description">${description(book)}</div>${book.edition ? `<p class="small"><strong>${en ? "Edition" : "Édition"} :</strong> ${e(book.edition)}</p>` : ""}`;
}
