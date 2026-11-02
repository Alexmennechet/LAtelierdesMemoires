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

export function pageGraph({
  site,
  title,
  description,
  path,
  lang = "fr",
  book,
  guide,
}) {
  const canonical = site.url + path;
  const organizationId = site.url + "/#organization";
  const websiteId = site.url + "/#website";
  const pageId = canonical + "#webpage";
  const en = lang === "en";
  const pageType = book
    ? "ItemPage"
    : ["/boutique/", "/guides/", "/en/"].includes(path)
      ? "CollectionPage"
      : path === "/a-propos/"
        ? "AboutPage"
        : ["/contact/", "/en/contact-shipping/"].includes(path)
          ? "ContactPage"
          : "WebPage";
  const graph = [
    {
      "@type": "Organization",
      "@id": organizationId,
      name: site.name,
      url: site.url + "/",
      logo: site.url + "/assets/images/logo-180.png",
      sameAs: [site.seller.profileUrl].filter(Boolean),
    },
    {
      "@type": "WebSite",
      "@id": websiteId,
      name: site.name,
      url: site.url + "/",
      publisher: { "@id": organizationId },
    },
    {
      "@type": pageType,
      "@id": pageId,
      url: canonical,
      name: title,
      description,
      inLanguage: lang,
      isPartOf: { "@id": websiteId },
      ...(book || guide
        ? {
            mainEntity: { "@id": canonical + (book ? "#book" : "#article") },
            breadcrumb: { "@id": canonical + "#breadcrumb" },
          }
        : {}),
    },
  ];
  if (book) graph.push(productSchema(book, site, canonical));
  if (guide)
    graph.push({
      "@type": "Article",
      "@id": canonical + "#article",
      headline: title,
      description,
      inLanguage: lang,
      url: canonical,
      mainEntityOfPage: { "@id": pageId },
      author: { "@id": organizationId },
      publisher: { "@id": organizationId },
      datePublished: guide.published,
      dateModified: guide.updated,
      image: site.url + guide.image.variants.at(-1).src,
    });
  if (book || guide)
    graph.push({
      "@type": "BreadcrumbList",
      "@id": canonical + "#breadcrumb",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: guide ? "Guides" : en ? "Books" : "Boutique",
          item: site.url + (guide ? "/guides/" : en ? "/en/" : "/boutique/"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: guide ? title : book.title,
          item: canonical,
        },
      ],
    });
  return { "@context": "https://schema.org", "@graph": graph };
}
