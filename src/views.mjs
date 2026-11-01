import { escapeHtml as e, price, marketUrl } from "./model.mjs";
export const bookPath = (book) => `/livres/${book.slug}/`;
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
  return `<article class="book-card" data-book-card="${book.id}"><a href="${bookPath(book)}" class="cover-link" tabindex="-1" aria-hidden="true">${imageTag(book.images[0], { alt: "", sizes: "(max-width: 599px) 92vw, (max-width: 999px) 44vw, 280px" })}</a><div class="card-copy"><p class="eyebrow">${e(book.category)}</p><h3><a href="${bookPath(book)}">${e(book.title)}</a></h3><p class="book-author">${e(book.author)}${book.year ? ` · ${e(book.year)}` : ""}</p><p class="price">${price(book.price)}</p><div class="card-actions"><button class="button secondary" data-quick="${book.id}" aria-label="Aperçu de ${e(book.title)}" hidden>Aperçu</button><button class="button" data-add="${book.id}" aria-label="Ajouter ${e(book.title)} à ma sélection" hidden>Ajouter</button></div></div></article>`;
}
export function gallery(book, eager = false) {
  return `<div class="gallery" data-gallery="${book.id}">${imageTag(book.images[0], { alt: `${book.title} — photographie 1 sur ${book.images.length}`, sizes: "(max-width: 699px) 92vw, 600px", loading: eager ? "eager" : "lazy", main: true, className: "gallery-main" })}<div class="thumbnails" role="group" aria-label="Photographies de ${e(book.title)}">${book.images.map((image, i) => `<a href="${e(image.variants.at(-1).src)}" class="thumbnail" data-photo="${i}" aria-label="Afficher la photographie ${i + 1} sur ${book.images.length}" ${i === 0 ? 'aria-current="true"' : ""}>${imageTag(image, { alt: "", sizes: "72px" })}</a>`).join("")}</div><p class="gallery-caption" data-gallery-caption aria-live="polite">Photographie 1 sur ${book.images.length}</p></div>`;
}
export function description(book) {
  return book.description
    .split(/\n\n/)
    .map((p) => `<p>${e(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}
export function marketLink(book, label = "Consulter l’annonce Leboncoin") {
  const href = marketUrl(book.lb_url);
  return href
    ? `<a class="button market" href="${e(href)}" target="_blank" rel="noopener noreferrer">${e(label)}<span class="sr-only"> (nouvel onglet)</span><span aria-hidden="true"> ↗</span></a>`
    : "<p>Annonce indisponible.</p>";
}
export function bookInfo(book, heading = "h1") {
  return `<p class="eyebrow">${e(book.category)} · Réf. ADM-${book.id}</p><${heading}>${e(book.title)}</${heading}><p class="book-author">${e(book.author)} · ${book.year ? e(book.year) : "Date d’édition à confirmer"}</p><p class="price product-price">${price(book.price)}</p><p class="muted">Prix indicatif. Disponibilité et frais à confirmer sur l’annonce.</p><div class="description">${description(book)}</div><div class="product-actions"><button class="button" data-add="${book.id}" hidden>Ajouter à ma sélection</button>${marketLink(book)}</div><p class="small muted">La sélection ne réserve pas l’ouvrage. La prise de contact et la transaction se font sur Leboncoin.</p>`;
}
