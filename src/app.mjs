import books from "./catalog.js";
import {
  normalizeSelection,
  filterBooks,
  price,
  escapeHtml as e,
  isPurchasable,
} from "./model.mjs";
import {
  bookPath,
  gallery,
  bookInfo,
  marketLink,
  imageTag,
  srcset,
} from "./views.mjs";

const byId = (id) => books.find((book) => book.id === Number(id));
// Integration hook only: no storage, identifiers, network request or analytics provider.
function track(action, id) {
  const detail = { action, language: "fr" };
  if (Number.isInteger(id)) detail.bookId = id;
  window.dispatchEvent(new CustomEvent("atelier:interaction", { detail }));
}
const storageKey = "atelier_cart";
const quickDialog = document.querySelector("#quick-dialog");
const selectionDialog = document.querySelector("#selection-dialog");
let selection = [];
let storageFailed = false;
let quickReturn;
let selectionReturn;
const announce = (message) => {
  document.querySelector("#announcements").textContent = message;
};
try {
  selection = normalizeSelection(
    JSON.parse(localStorage.getItem(storageKey) || "[]"),
    books,
  );
} catch {
  storageFailed = true;
}

function persist() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(selection));
  } catch {
    if (!storageFailed)
      announce(
        "Le navigateur ne peut pas enregistrer votre sélection. Elle reste disponible pendant cette visite.",
      );
    storageFailed = true;
  }
}
function row(book, full = false) {
  return `<article class="selection-row">${imageTag(book.images[0], { alt: book.title, sizes: "80px" })}<div><h3><a href="${bookPath(book)}">${e(book.title)}</a></h3><p class="price">${price(book.price)}</p>${full ? marketLink(book) : ""}<button class="remove-button" data-remove="${book.id}" aria-label="Retirer ${e(book.title)} de ma sélection">Retirer</button></div></article>`;
}
function renderSelection() {
  document.querySelectorAll("[data-count]").forEach((el) => {
    el.textContent = selection.length;
  });
  document
    .querySelectorAll("[data-open-selection]")
    .forEach((el) =>
      el.setAttribute(
        "aria-label",
        `Ma sélection, ${selection.length} ouvrage${selection.length === 1 ? "" : "s"}`,
      ),
    );
  document.querySelectorAll("[data-add]").forEach((el) => {
    const added = selection.includes(Number(el.dataset.add));
    el.disabled = added || !isPurchasable(byId(el.dataset.add));
    el.textContent = added
      ? "Dans ma sélection"
      : el.closest(".card-actions")
        ? "Ajouter"
        : "Ajouter à ma sélection";
    el.setAttribute(
      "aria-label",
      `${byId(el.dataset.add).title} : ${added ? "déjà dans ma sélection" : "ajouter à ma sélection"}`,
    );
  });
  const empty =
    '<div class="empty-state"><p>Votre sélection est encore vide.</p><a class="button" href="/boutique/">Explorer la boutique</a></div>';
  document.querySelectorAll("[data-selection-list]").forEach((el) => {
    el.innerHTML = selection.length
      ? selection.map((id) => row(byId(id))).join("")
      : empty;
  });
  document.querySelectorAll("[data-full-selection]").forEach((el) => {
    el.innerHTML = selection.length
      ? selection.map((id) => row(byId(id), true)).join("")
      : empty;
  });
}
function syncDialogState() {
  document.documentElement.classList.toggle(
    "has-dialog",
    Boolean(document.querySelector("dialog[open]")),
  );
}
function closeDialog(dialog) {
  dialog.close();
  syncDialogState();
}
function openSelection(returnTo) {
  selectionReturn = returnTo;
  if (quickDialog.open) closeDialog(quickDialog);
  if (!selectionDialog.open) selectionDialog.showModal();
  syncDialogState();
}
function enhanceGalleries(scope = document) {
  scope.querySelectorAll("a[data-photo]").forEach((link) => {
    const button = document.createElement("button");
    button.type = "button";
    for (const { name, value } of [...link.attributes])
      if (name !== "href") button.setAttribute(name, value);
    button.innerHTML = link.innerHTML;
    button.setAttribute(
      "aria-pressed",
      link.hasAttribute("aria-current") ? "true" : "false",
    );
    button.removeAttribute("aria-current");
    link.replaceWith(button);
  });
}
function changePhoto(button) {
  const container = button.closest("[data-gallery]");
  const book = byId(container.dataset.gallery);
  const index = Number(button.dataset.photo);
  const image = book?.images[index];
  if (!image) return;
  track("view_photo", book.id);
  const main = container.querySelector("[data-gallery-image]");
  main.srcset = srcset(image);
  main.src = image.variants.at(-1).src;
  main.width = image.variants.at(-1).width;
  main.height = image.variants.at(-1).height;
  main.alt = `${book.title} — photographie ${index + 1} sur ${book.images.length}`;
  container
    .querySelectorAll("[data-photo]")
    .forEach((el) => el.setAttribute("aria-pressed", String(el === button)));
  container.querySelector("[data-gallery-caption]").textContent =
    `Photographie ${index + 1} sur ${book.images.length}`;
}
function openQuick(id, trigger) {
  const book = byId(id);
  if (!book) return;
  quickReturn = trigger;
  const content = document.querySelector("#quick-content");
  content.innerHTML = `<div class="product-layout">${gallery(book)}<div class="product-info">${bookInfo(book, "h2")}<a class="text-link" href="${bookPath(book)}">Ouvrir la fiche complète →</a></div></div>`;
  content.querySelector("h2").id = "quick-title";
  enhanceGalleries(content);
  content.querySelectorAll("[data-add]").forEach((el) => {
    el.hidden = false;
  });
  renderSelection();
  quickDialog.showModal();
  syncDialogState();
}
for (const dialog of [quickDialog, selectionDialog]) {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        closeDialog(dialog);
    }
  });
  dialog.addEventListener("close", () => {
    syncDialogState();
    const target = dialog === quickDialog ? quickReturn : selectionReturn;
    if (!document.querySelector("dialog[open]") && target?.isConnected)
      target.focus();
  });
}
document.addEventListener("click", (event) => {
  const target = event.target.closest("button, a");
  if (!target) return;
  if (target.matches("[data-market]"))
    track("outbound_listing", Number(target.dataset.market));
  if (
    target.matches("[data-open-selection]") &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !event.altKey &&
    event.button === 0
  ) {
    event.preventDefault();
    openSelection(target);
  } else if (target.matches("[data-close]")) {
    closeDialog(target.closest("dialog"));
  } else if (target.matches("[data-quick]")) {
    openQuick(target.dataset.quick, target);
  } else if (target.matches("[data-photo]")) {
    event.preventDefault();
    changePhoto(target);
  } else if (target.matches("[data-add]")) {
    const book = byId(target.dataset.add);
    if (!book || !isPurchasable(book) || selection.includes(book.id)) return;
    const returnTo = quickDialog.open
      ? quickReturn
      : target.closest("article")?.querySelector("h3 a") ||
        document.querySelector(".selection-link");
    selection.push(book.id);
    track("add_selection", book.id);
    persist();
    renderSelection();
    announce(
      `${book.title} ajouté à votre sélection.${storageFailed ? " Enregistrement indisponible : la sélection est conservée pendant cette visite." : ""}`,
    );
    openSelection(returnTo);
  } else if (target.matches("[data-remove]")) {
    const scope = target.closest(
      "[data-selection-list], [data-full-selection]",
    );
    const index = [...scope.querySelectorAll("[data-remove]")].indexOf(target);
    const book = byId(target.dataset.remove);
    selection = selection.filter((id) => id !== book.id);
    track("remove_selection", book.id);
    persist();
    renderSelection();
    const updated = scope.querySelectorAll("[data-remove]");
    (
      updated[Math.min(index, updated.length - 1)] ||
      scope.querySelector("a") ||
      document.querySelector(".selection-link")
    ).focus();
    announce(`${book.title} retiré de votre sélection.`);
  } else if (target.matches("[data-clear-storage]")) {
    selection = [];
    try {
      localStorage.removeItem(storageKey);
    } catch {
      storageFailed = true;
    }
    renderSelection();
    announce("Votre sélection a été effacée.");
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Tab") {
    const dialog = document.querySelector("dialog[open]");
    if (dialog) {
      const focusable = [
        ...dialog.querySelectorAll(
          'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]',
        ),
      ].filter((el) => el.getClientRects().length && !el.hidden);
      if (focusable.length) {
        const index = focusable.indexOf(document.activeElement);
        const next =
          index < 0
            ? event.shiftKey
              ? focusable.length - 1
              : 0
            : (index + (event.shiftKey ? -1 : 1) + focusable.length) %
              focusable.length;
        event.preventDefault();
        focusable[next].focus();
      }
    }
    return;
  }
  const button = event.target.closest("[data-photo]");
  if (
    !button ||
    !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
  )
    return;
  event.preventDefault();
  const siblings = [...button.parentElement.querySelectorAll("[data-photo]")];
  const index = siblings.indexOf(button);
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? siblings.length - 1
        : (index + (event.key === "ArrowRight" ? 1 : -1) + siblings.length) %
          siblings.length;
  siblings[next].focus();
  changePhoto(siblings[next]);
});

const form = document.querySelector("#catalog-form");
if (form) {
  const search = form.querySelector("#search");
  const category = form.querySelector("#category");
  const params = new URLSearchParams(location.search);
  search.value = params.get("q") || "";
  category.value = [...category.options].some(
    (o) => o.value === params.get("categorie"),
  )
    ? params.get("categorie")
    : "all";
  function filter() {
    const visible = filterBooks(books, search.value, category.value);
    document.querySelectorAll("[data-book-card]").forEach((el) => {
      el.hidden = !visible.some(
        (book) => book.id === Number(el.dataset.bookCard),
      );
    });
    document.querySelector("#no-results").hidden = visible.length !== 0;
    document.querySelector("#result-count").textContent =
      `${visible.length} ouvrage${visible.length === 1 ? "" : "s"} trouvé${visible.length === 1 ? "" : "s"}`;
    const url = new URL(location.href);
    search.value.trim()
      ? url.searchParams.set("q", search.value.trim())
      : url.searchParams.delete("q");
    category.value === "all"
      ? url.searchParams.delete("categorie")
      : url.searchParams.set("categorie", category.value);
    history.replaceState(null, "", url);
  }
  function reset() {
    search.value = "";
    category.value = "all";
    filter();
    search.focus();
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    filter();
  });
  form.addEventListener("input", filter);
  form.addEventListener("change", filter);
  form.addEventListener("reset", (event) => {
    event.preventDefault();
    reset();
  });
  document.querySelector("[data-reset]").addEventListener("click", reset);
  filter();
  form.hidden = false;
}
const videoToggle = document.querySelector("[data-video]");
if (videoToggle) {
  const video = document.querySelector(".hero-video");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const stop = () => {
    video.pause();
    videoToggle.textContent = "Lire la vidéo d’ambiance";
    videoToggle.setAttribute("aria-pressed", "false");
  };
  videoToggle.addEventListener("click", async () => {
    if (!video.paused) {
      stop();
      return;
    }
    if (!video.getAttribute("src")) video.src = "/assets/ambiance.mp4";
    try {
      await video.play();
      videoToggle.textContent = "Mettre la vidéo en pause";
      videoToggle.setAttribute("aria-pressed", "true");
    } catch {
      stop();
      announce(
        "La vidéo ne peut pas être lue. La photographie reste disponible.",
      );
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
  });
  motion.addEventListener("change", () => {
    if (motion.matches) stop();
  });
  videoToggle.hidden = false;
}
enhanceGalleries();
document
  .querySelectorAll("[data-add],[data-quick],[data-clear-storage]")
  .forEach((el) => {
    el.hidden = false;
  });
renderSelection();
const viewedBook = Number(
  document.querySelector("[data-product-id]")?.dataset.productId,
);
if (byId(viewedBook)) track("view_book", viewedBook);
if (storageFailed)
  announce(
    "Votre sélection ne peut pas être restaurée. Vous pouvez constituer une nouvelle sélection pendant cette visite.",
  );
const oldRoutes = {
  "#shop": "/boutique/",
  "#about": "/a-propos/",
  "#faq": "/faq/",
  "#cart-page": "/selection/",
};
if (location.pathname === "/" && oldRoutes[location.hash])
  location.replace(oldRoutes[location.hash]);
