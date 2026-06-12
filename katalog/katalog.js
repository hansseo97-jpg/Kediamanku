let products = [];

const searchInput = document.querySelector("[data-search]");
const sortSelect = document.querySelector("[data-sort]");
const filterButtons = [...document.querySelectorAll("[data-filter]")];
const categoryCards = [...document.querySelectorAll("[data-category-card]")];
const productGrid = document.querySelector("[data-product-grid]");
const recommendedGrid = document.querySelector("[data-recommended]");
const productCount = document.querySelector("[data-product-count]");
const emptyState = document.querySelector("[data-empty-state]");
const modal = document.querySelector("[data-modal]");
const closeButtons = document.querySelectorAll("[data-close-modal]");
const revealItems = document.querySelectorAll("[data-reveal], [data-stagger]");

let state = {
  query: "",
  category: "All",
  sort: "featured",
};
let lastFocused = null;

function hasSupabaseConfig() {
  const supabaseConfig = window.KEDIAMANKU_SUPABASE || {};
  return Boolean(
    supabaseConfig.restUrl &&
    supabaseConfig.anonKey &&
    !supabaseConfig.anonKey.includes("PASTE_SUPABASE_ANON_PUBLIC_KEY_HERE")
  );
}

function slugifyService(service) {
  const map = {
    "Kitchen Set": "kitchen-set",
    "Lemari Custom": "lemari-custom",
    "Kamar Interior": "kamar-interior",
    "Kamar Anak": "kamar-anak",
  };
  return map[service] || "index";
}

function resolveImagePath(path) {
  if (!path) return "../assets/images/hero-kitchen-living.webp";
  if (/^(javascript|data|vbscript):/i.test(path)) return "../assets/images/hero-kitchen-living.webp";
  if (/^(https?:)?\/\//.test(path)) return path;
  if (path.startsWith("../") || path.startsWith("./")) return path;
  if (path.startsWith("/")) return `..${path}`;
  return `../${path}`;
}

function resolveLinkPath(path) {
  if (!path) return "";
  if (/^(https?:)?\/\//.test(path) || path.startsWith("#")) return path;
  if (path.startsWith("../") || path.startsWith("./")) return path;
  if (path.startsWith("/")) return `..${path}`;
  return `../${path}`;
}

function mapSupabaseProduct(row) {
  const galleryImages = Array.isArray(row.images) && row.images.length
    ? row.images.map(resolveImagePath)
    : row.image_url
      ? [resolveImagePath(row.image_url)]
      : ["../assets/images/hero-kitchen-living.webp"];
  const catalogImage = galleryImages[0] || "../assets/images/hero-kitchen-living.webp";
  const detailLink = window.location.protocol === "file:"
    ? `product/index.html?slug=${encodeURIComponent(row.slug || row.id)}`
    : `${encodeURIComponent(row.slug || row.id)}/`;

  return {
    id: row.slug || row.id,
    slug: row.slug || row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    material: row.material,
    price: row.price_range || "By quotation",
    priceValue: Number(row.price_value || 0),
    image: catalogImage,
    images: galleryImages,
    alt: row.image_alt || `${row.name} catalog by Kediamanku`,
    link: detailLink,
    newest: Number(row.newest || 0),
    popular: Number(row.popular || 0),
    featured: Boolean(row.featured),
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeInfoText(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/\s+(Ukuran ruang\s*:)/gi, "\n$1")
    .replace(/\s+(Style\s*:)/gi, "\n$1")
    .replace(/\s+(Item\s*:)/gi, "\n$1")
    .replace(/\s+([a-z])\.\s+/gi, "\n$1. ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function splitNumberedItems(value) {
  return normalizeInfoText(value)
    .split(/\n|(?:^|\s)(?=[a-z]\.\s+)/gi)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatItemTitle(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^([a-z])/, (letter) => letter.toUpperCase());
}

function parseItemLine(value) {
  const clean = String(value || "").replace(/^([a-z])\.\s*/i, "").trim();
  const [title, ...rest] = clean.split(/\s*:\s*/);
  return {
    title: formatItemTitle(title),
    detail: rest.join(": ").trim(),
  };
}

function formatDescription(value) {
  const lines = normalizeInfoText(value).split("\n").filter(Boolean);
  const details = [];
  const items = [];
  const notes = [];

  lines.forEach((line) => {
    if (/^[a-z]\.\s+/i.test(line)) {
      items.push(parseItemLine(line));
      return;
    }

    const match = line.match(/^([^:]{2,32})\s*:\s*(.*)$/);

    if (match) {
      const label = match[1].trim();
      const content = match[2].trim();

      if (/^item$/i.test(label)) {
        items.push(...splitNumberedItems(content).map(parseItemLine));
      } else {
        details.push({ label, content });
      }
      return;
    }

    notes.push(line);
  });

  const detailsHtml = details.length
    ? `<div class="modal-detail-grid">${details.map((detail) => `
        <div>
          <span>${escapeHtml(detail.label)}</span>
          <strong>${escapeHtml(detail.content)}</strong>
        </div>
      `).join("")}</div>`
    : "";

  const itemsHtml = items.length
    ? `<div class="modal-item-section">
        <span>Item included</span>
        <div class="modal-item-list">${items.map((item, index) => `
          <div>
            <em>${String.fromCharCode(65 + index)}</em>
            <strong>${escapeHtml(item.title)}</strong>
            ${item.detail ? `<small>${escapeHtml(item.detail)}</small>` : ""}
          </div>
        `).join("")}</div>
      </div>`
    : "";

  const notesHtml = notes.length
    ? `<ul class="modal-clean-list">${notes.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "";

  return `${detailsHtml}${itemsHtml}${notesHtml}` || "<p>No description provided.</p>";
}

function formatList(value) {
  const items = splitNumberedItems(value)
    .flatMap((item) => item.split(/\s*,\s*/))
    .map((item) => item.trim())
    .filter(Boolean);

  if (!items.length) return "<span>-</span>";
  return `<ul class="modal-spec-list">${items.map((item) => `<li>${escapeHtml(item.replace(/^[a-z]\.\s*/i, ""))}</li>`).join("")}</ul>`;
}

function compactSummary(value, maxLength = 112) {
  const text = normalizeInfoText(value)
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

async function fetchSupabaseProducts() {
  if (!hasSupabaseConfig()) return [];

  const supabaseConfig = window.KEDIAMANKU_SUPABASE;
  const query = new URLSearchParams({
    select: "id,slug,name,category,description,material,price_range,price_value,image_url,images,image_alt,link_url,newest,popular,featured,sort_order,created_at",
    is_published: "eq.true",
    order: "sort_order.asc,created_at.desc",
  });

  const response = await fetch(`${supabaseConfig.restUrl}/catalog_products?${query}`, {
    headers: {
      apikey: supabaseConfig.anonKey,
      Authorization: `Bearer ${supabaseConfig.anonKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase catalog request failed: ${response.status}`);
  }

  const rows = await response.json();
  return rows.map(mapSupabaseProduct);
}

function matchesProduct(product) {
  const query = state.query.trim().toLowerCase();
  const queryMatch = !query || [
    product.name,
    product.category,
    product.description,
    product.material,
  ].some((value) => String(value || "").toLowerCase().includes(query));

  const categoryMatch = state.category === "All" || product.category === state.category;
  return queryMatch && categoryMatch;
}

function sortProducts(items) {
  return [...items].sort((a, b) => {
    if (state.sort === "newest") return b.newest - a.newest;
    if (state.sort === "popular") return b.popular - a.popular;
    if (state.sort === "az") return a.name.localeCompare(b.name);
    if (state.sort === "price-low") return a.priceValue - b.priceValue;
    if (state.sort === "price-high") return b.priceValue - a.priceValue;
    return Number(b.featured) - Number(a.featured) || b.popular - a.popular;
  });
}

function createProductCard(product, index) {
  const article = document.createElement("article");
  article.className = "product-card";
  article.style.transitionDelay = `${Math.min(index * 55, 420)}ms`;
  article.innerHTML = `
    <div class="product-image">
      <a class="product-image-link" href="${escapeHtml(product.link)}" aria-label="View ${escapeHtml(product.name)} product detail">
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.alt)}" loading="lazy" decoding="async">
      </a>
      <button class="quick-view" type="button" aria-label="Quick view ${escapeHtml(product.name)}">&#8599;</button>
    </div>
    <div class="product-body">
      <span>${escapeHtml(product.category)}</span>
      <h3>${escapeHtml(product.name)}</h3>
      <p>${escapeHtml(compactSummary(product.description))}</p>
      <div class="product-meta">
        <strong>${escapeHtml(product.price)}</strong>
        <em>${escapeHtml(String(product.material || "").split(",")[0])}</em>
      </div>
    </div>
  `;

  article.querySelector(".quick-view").addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openModal(product, article);
  });

  requestAnimationFrame(() => {
    article.classList.add("is-visible");
  });

  return article;
}

function renderProducts() {
  const visible = sortProducts(products.filter(matchesProduct));
  productGrid.innerHTML = "";
  productCount.textContent = visible.length;
  emptyState.hidden = visible.length > 0;

  visible.forEach((product, index) => {
    productGrid.append(createProductCard(product, index));
  });
}

function setCategory(category) {
  state.category = category;
  filterButtons.forEach((button) => {
    const isActive = button.dataset.filter === category;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
  renderProducts();
}

function renderRecommended() {
  const recommended = products.filter((product) => product.featured).slice(0, 4);
  recommendedGrid.innerHTML = "";
  recommended.forEach((product, index) => {
    recommendedGrid.append(createProductCard(product, index));
  });
}

function openModal(product, trigger) {
  lastFocused = trigger;
  modal.querySelector("[data-modal-image]").src = product.image;
  modal.querySelector("[data-modal-image]").alt = product.alt;
  modal.querySelector("[data-modal-category]").textContent = product.category;
  modal.querySelector("[data-modal-title]").textContent = product.name;
  modal.querySelector("[data-modal-description]").innerHTML = formatDescription(product.description);
  modal.querySelector("[data-modal-material]").innerHTML = formatList(product.material);
  modal.querySelector("[data-modal-price]").textContent = product.price;
  modal.querySelector("[data-modal-link]").href = product.link;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  modal.querySelector(".modal-close").focus();
}

function closeModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  lastFocused?.focus({ preventScroll: true });
}

function keepFocusInModal(event) {
  if (event.key !== "Tab" || !modal.classList.contains("is-open")) return;

  const focusable = [...modal.querySelectorAll("button, a")]
    .filter((element) => !element.disabled && element.offsetParent !== null);
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderProducts();
});

sortSelect.addEventListener("change", (event) => {
  state.sort = event.target.value;
  renderProducts();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => setCategory(button.dataset.filter));
});

categoryCards.forEach((card) => {
  const activateCard = () => {
    setCategory(card.dataset.categoryCard);
    document.querySelector(".catalog-toolbar-section").scrollIntoView({ behavior: "smooth" });
  };

  card.addEventListener("click", activateCard);
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activateCard();
    }
  });
});

closeButtons.forEach((button) => button.addEventListener("click", closeModal));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal.classList.contains("is-open")) {
    closeModal();
  }
  keepFocusInModal(event);
});

async function initCatalog() {
  renderProducts();
  renderRecommended();

  try {
    const liveProducts = await fetchSupabaseProducts();
    if (Array.isArray(liveProducts) && liveProducts.length) {
      products = liveProducts;
      renderProducts();
      renderRecommended();
    }
  } catch (error) {
    console.warn(error);
    products = [];
    renderProducts();
    renderRecommended();
  }
}

initCatalog();
