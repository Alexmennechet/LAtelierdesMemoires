export const price = (value) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
export const normalizeText = (value) =>
  String(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("fr")
    .replace(/[’']/g, " ")
    .trim();
export function filterBooks(books, query = "", category = "all") {
  const words = normalizeText(query).split(/\s+/).filter(Boolean);
  return books.filter(
    (book) =>
      (category === "all" || book.category === category) &&
      words.every((word) =>
        normalizeText(
          [
            book.title,
            book.author,
            book.year || "",
            book.category,
            book.description,
          ].join(" "),
        ).includes(word),
      ),
  );
}
export function normalizeSelection(value, books) {
  if (!Array.isArray(value)) return [];
  const valid = new Set(books.map((book) => book.id));
  return [
    ...new Set(
      value
        .map((item) =>
          typeof item === "object" && item !== null ? item.id : item,
        )
        .filter((id) => Number.isInteger(id) && valid.has(id)),
    ),
  ];
}
export function marketUrl(value) {
  try {
    const url = new URL(value);
    if (
      url.protocol === "https:" &&
      ["leboncoin.fr", "www.leboncoin.fr"].includes(url.hostname) &&
      !url.username &&
      !url.password &&
      !url.port
    )
      return url.href;
  } catch {
    /* Invalid external links are never rendered. */
  }
  return null;
}
export const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
