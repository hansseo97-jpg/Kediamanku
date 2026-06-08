const supabaseConfig = window.KEDIAMANKU_SUPABASE || {};
const shell = document.querySelector("[data-product-shell]");
const categoryLabel = document.querySelector("[data-product-category]");
const codeLabel = document.querySelector("[data-product-code]");
const titleElement = document.querySelector("[data-product-title]");
const descriptionElement = document.querySelector("[data-product-description]");
const priceElement = document.querySelector("[data-product-price]");
const overviewElement = document.querySelector("[data-product-overview]");
const specList = document.querySelector("[data-spec-list]");
const mainImage = document.querySelector("[data-main-image]");
const mainButton = document.querySelector("[data-open-gallery]");
const thumbnailRow = document.querySelector("[data-thumbnails]");
const relatedGrid = document.querySelector("[data-related-products]");
const fullscreenGallery = document.querySelector("[data-fullscreen-gallery]");
const fullscreenImage = document.querySelector("[data-fullscreen-image]");
const closeGalleryButtons = document.querySelectorAll("[data-close-gallery]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let galleryImages = [];
let selectedImage = "";
let selectedAlt = "";

function siteOrigin() {
  if (/^https?:\/\//i.test(window.location.origin)) return window.location.origin;
  return "https://kediamanku.id";
}

function productUrl(slug) {
  return `${siteOrigin()}/katalog/${encodeURIComponent(slug)}/`;
}

function absoluteUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return new URL(path, `${siteOrigin()}/katalog/product/`).href;
}

function setMeta(selector, attribute, value) {
  if (!value) return;

  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    const nameMatch = selector.match(/\[name="([^"]+)"\]/);
    const propertyMatch = selector.match(/\[property="([^"]+)"\]/);
    if (nameMatch) element.setAttribute("name", nameMatch[1]);
    if (propertyMatch) element.setAttribute("property", propertyMatch[1]);
    document.head.append(element);
  }
  element.setAttribute(attribute, value);
}

function setCanonical(url) {
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.append(link);
  }
  link.href = url;
}

function updateProductSeo(product, image) {
  const title = `${product.name} | ${product.category || "Katalog"} Kediamanku`;
  const description = compactText(
    product.description,
    `${product.name} custom interior by Kediamanku with premium material direction and refined finishing.`
  ).slice(0, 160);
  const url = productUrl(product.slug);

  document.title = title;
  setMeta('meta[name="description"]', "content", description);
  setCanonical(url);
  setMeta('meta[property="og:type"]', "content", "product");
  setMeta('meta[property="og:title"]', "content", title);
  setMeta('meta[property="og:description"]', "content", description);
  setMeta('meta[property="og:url"]', "content", url);
  setMeta('meta[property="og:image"]', "content", absoluteUrl(image));
  setMeta('meta[name="twitter:card"]', "content", "summary_large_image");
  setMeta('meta[name="twitter:title"]', "content", title);
  setMeta('meta[name="twitter:description"]', "content", description);
  setMeta('meta[name="twitter:image"]', "content", absoluteUrl(image));
}

function hasSupabaseConfig() {
  return Boolean(
    supabaseConfig.restUrl &&
    supabaseConfig.anonKey &&
    !supabaseConfig.anonKey.includes("PASTE_SUPABASE_ANON_PUBLIC_KEY_HERE")
  );
}

function getSlug() {
  const querySlug = new URLSearchParams(window.location.search).get("slug");
  if (querySlug) return querySlug;

  const parts = window.location.pathname.split("/").filter(Boolean);
  const katalogIndex = parts.lastIndexOf("katalog");
  if (katalogIndex === -1) return "";

  const next = parts[katalogIndex + 1];
  const afterProduct = parts[katalogIndex + 2];

  if (next === "product" && afterProduct && afterProduct !== "index.html") return afterProduct;
  if (next && next !== "index.html" && next !== "product") return next;
  return "";
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function resolveImagePath(path) {
  const value = String(path || "").trim();
  if (!value || /^(javascript|data|vbscript):/i.test(value)) {
    return "../../assets/images/hero-kitchen-living.webp";
  }
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("../../") || value.startsWith("./")) return value;
  if (value.startsWith("../assets/")) return `../../${value.slice(3)}`;
  if (value.startsWith("/")) return `../..${value}`;
  return `../../${value.replace(/^\/+/, "")}`;
}

function productGallery(product) {
  const images = Array.isArray(product.images) && product.images.length
    ? product.images
    : product.image_url
      ? [product.image_url]
      : ["../../assets/images/hero-kitchen-living.webp"];

  return [...new Set(images.map(resolveImagePath).filter(Boolean))];
}

function compactText(value, fallback = "-") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function setSpecRows(product) {
  const specs = [
    ["Material", product.material],
    ["Size", product.size],
    ["Finishing", product.finishing],
    ["Production Time", product.production_time],
    ["Packaging / Installation", product.packaging_installation],
  ];

  specList.replaceChildren();
  specs.forEach(([label, value], index) => {
    const row = document.createElement("div");
    row.style.transitionDelay = `${Math.min(index * 70, 360)}ms`;
    row.append(createElement("dt", "", label));
    row.append(createElement("dd", "", compactText(value)));
    specList.append(row);
  });
}

function setSelectedImage(image, index = 0) {
  selectedImage = image;

  const applyImage = () => {
    mainImage.src = image;
    mainImage.alt = selectedAlt;
    fullscreenImage.src = image;
    fullscreenImage.alt = selectedAlt;
    mainButton.classList.remove("is-changing");
  };

  if (reduceMotion) {
    applyImage();
  } else {
    mainButton.classList.add("is-changing");
    window.setTimeout(applyImage, 150);
  }

  [...thumbnailRow.querySelectorAll("button")].forEach((button, buttonIndex) => {
    button.classList.toggle("is-active", buttonIndex === index);
    button.setAttribute("aria-current", buttonIndex === index ? "true" : "false");
  });
}

function renderThumbnails(images, alt) {
  thumbnailRow.replaceChildren();
  images.forEach((image, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", `View image ${index + 1}`);
    button.style.transitionDelay = `${Math.min(index * 55, 360)}ms`;

    const thumb = document.createElement("img");
    thumb.src = image;
    thumb.alt = "";
    thumb.loading = "lazy";

    button.append(thumb);
    button.addEventListener("click", () => setSelectedImage(image, index));
    thumbnailRow.append(button);
  });

  selectedAlt = alt;
  setSelectedImage(images[0], 0);
}

function renderProduct(product) {
  const alt = product.image_alt || `${product.name} by Kediamanku`;
  galleryImages = productGallery(product);
  updateProductSeo(product, galleryImages[0]);

  categoryLabel.textContent = product.category || "Katalog";
  codeLabel.textContent = product.product_code || product.category || "Custom Interior";
  titleElement.textContent = product.name || "Kediamanku Product";
  descriptionElement.textContent = compactText(product.description, "Custom interior product by Kediamanku.");
  overviewElement.textContent = compactText(product.description, "This Kediamanku catalog piece can be tailored to your room dimensions, preferred material direction, storage needs, and installation plan.");
  priceElement.textContent = product.price_range || "By quotation";

  setSpecRows(product);
  renderThumbnails(galleryImages, alt);

  document.querySelectorAll("[data-reveal]").forEach((item) => item.classList.add("is-visible"));
}

function renderError(message) {
  shell.replaceChildren();
  shell.append(createElement("p", "product-error", message));
}

async function fetchProduct(slug) {
  const query = new URLSearchParams({
    select: "id,slug,name,product_code,category,description,material,size,finishing,production_time,packaging_installation,price_range,price_value,image_url,images,image_alt,featured,sort_order,created_at",
    slug: `eq.${slug}`,
    is_published: "eq.true",
    limit: "1",
  });

  const response = await fetch(`${supabaseConfig.restUrl}/catalog_products?${query}`, {
    headers: {
      apikey: supabaseConfig.anonKey,
      Authorization: `Bearer ${supabaseConfig.anonKey}`,
    },
  });

  if (!response.ok) throw new Error("Product could not be loaded.");
  const rows = await response.json();
  return rows[0] || null;
}

function relatedCard(product) {
  const images = productGallery(product);
  const link = `index.html?slug=${encodeURIComponent(product.slug)}`;
  const card = document.createElement("a");
  card.className = "related-card";
  card.href = link;

  const image = document.createElement("img");
  image.src = images[0];
  image.alt = product.image_alt || `${product.name} by Kediamanku`;
  image.loading = "lazy";

  const copy = document.createElement("div");
  copy.append(createElement("span", "", product.category || "Katalog"));
  copy.append(createElement("h3", "", product.name || "Kediamanku Product"));
  copy.append(createElement("p", "", product.price_range || "By quotation"));

  card.append(image, copy);
  return card;
}

async function fetchRelated(product) {
  const query = new URLSearchParams({
    select: "id,slug,name,category,price_range,image_url,images,image_alt,sort_order,created_at",
    category: `eq.${product.category}`,
    is_published: "eq.true",
    order: "sort_order.asc,created_at.desc",
    limit: "4",
  });

  const response = await fetch(`${supabaseConfig.restUrl}/catalog_products?${query}`, {
    headers: {
      apikey: supabaseConfig.anonKey,
      Authorization: `Bearer ${supabaseConfig.anonKey}`,
    },
  });

  if (!response.ok) return;
  const rows = await response.json();
  const related = rows.filter((row) => row.slug !== product.slug).slice(0, 3);
  relatedGrid.replaceChildren();

  if (!related.length) {
    relatedGrid.append(createElement("p", "product-error", "Related products will appear after more catalog items are added."));
    return;
  }

  related.forEach((row) => relatedGrid.append(relatedCard(row)));
}

function openFullscreen() {
  fullscreenImage.src = selectedImage || galleryImages[0];
  fullscreenImage.alt = selectedAlt;
  fullscreenGallery.classList.add("is-open");
  fullscreenGallery.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeFullscreen() {
  fullscreenGallery.classList.remove("is-open");
  fullscreenGallery.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

closeGalleryButtons.forEach((button) => button.addEventListener("click", closeFullscreen));
mainButton.addEventListener("click", openFullscreen);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && fullscreenGallery.classList.contains("is-open")) {
    closeFullscreen();
  }
});

async function initProductPage() {
  const slug = getSlug();

  if (!slug) {
    renderError("Product slug is missing. Open this page from a catalog product card.");
    return;
  }

  if (!hasSupabaseConfig()) {
    renderError("Supabase configuration is not active yet.");
    return;
  }

  try {
    const product = await fetchProduct(slug);
    if (!product) {
      renderError("Product not found or not published.");
      return;
    }

    renderProduct(product);
    fetchRelated(product);
  } catch (error) {
    renderError(error.message);
  }
}

initProductPage();
