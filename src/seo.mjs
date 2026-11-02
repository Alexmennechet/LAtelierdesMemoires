export function productSchema(book, site, canonical) {
  const availability = {
    available: "InStock",
    sold: "SoldOut",
    reserved: "OutOfStock",
  }[book.availability];
  return {
    "@context": "https://schema.org",
    "@type": ["Product", "Book"],
    "@id": canonical + "#book",
    name: book.title,
    sku: `ADM-${book.id}`,
    ...(book.authorConfirmed
      ? { author: { "@type": "Person", name: book.author } }
      : {}),
    ...(book.yearConfirmed && book.year && book.id !== 101
      ? { datePublished: book.year }
      : {}),
    inLanguage: book.language || "fr",
    image: book.images.map((image) => site.url + image.variants.at(-1).src),
    description: book.description,
    url: canonical,
    offers: {
      "@type": "Offer",
      url: book.lb_url || canonical,
      price: book.price,
      priceCurrency: "EUR",
      itemCondition: "https://schema.org/UsedCondition",
      ...(availability
        ? { availability: "https://schema.org/" + availability }
        : {}),
      seller: { "@id": site.url + "/#organization" },
    },
  };
}
