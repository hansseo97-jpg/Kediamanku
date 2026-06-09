const supabaseConfig = window.KEDIAMANKU_SUPABASE || {};

const titleElement = document.querySelector("[data-project-title]");
const kickerElement = document.querySelector("[data-project-kicker]");
const categoryLabel = document.querySelector("[data-project-category-label]");
const typeLabel = document.querySelector("[data-project-type-label]");
const heroImage = document.querySelector("[data-hero-image]");
const metadataList = document.querySelector("[data-metadata-list]");
const narrativeCopy = document.querySelector("[data-narrative-copy]");
const scopeList = document.querySelector("[data-scope-list]");
const materialTags = document.querySelector("[data-material-tags]");
const testimonialMetric = document.querySelector("[data-testimonial-metric]");
const testimonialMetricLabel = document.querySelector("[data-testimonial-metric-label]");
const testimonialQuote = document.querySelector("[data-testimonial-quote]");
const testimonialClient = document.querySelector("[data-testimonial-client]");
const testimonialRole = document.querySelector("[data-testimonial-role]");
const testimonialImage = document.querySelector("[data-testimonial-image]");

const categoryDefaults = {
  "Kitchen Set": {
    image: "../../assets/images/hero-kitchen-living.webp",
    description: "Kediamanku designed this kitchen set as a refined daily-living space that balances warm material tones, efficient storage, and clean cabinet composition.",
    scope: ["Design Direction", "Custom Furniture", "Production", "Installation"],
    materials: ["HPL", "Plywood", "Premium Hardware", "LED Lighting", "Soft-close System"],
  },
  "Lemari Custom": {
    image: "../../assets/images/custom-wardrobe.webp",
    description: "This wardrobe project is shaped around measured storage, calm bedroom integration, display lighting, and a made-to-measure system that keeps daily routines organized.",
    scope: ["Storage Mapping", "Wardrobe System", "Drawer Planning", "Installation"],
    materials: ["Plywood", "HPL", "Smoked Glass", "Mirror", "Soft-close System"],
  },
  "Kamar Interior": {
    image: "../../assets/images/bedroom-interior.webp",
    description: "A calm bedroom interior designed with warm proportions, soft lighting, integrated furniture, and refined details for everyday comfort.",
    scope: ["Layout Direction", "Headboard Wall", "Lighting Plan", "Custom Furniture"],
    materials: ["Wall Panel", "HPL", "Fabric Texture", "Warm LED", "Premium Hardware"],
  },
  "Kamar Anak": {
    image: "../../assets/images/kids-bedroom.webp",
    description: "A kids bedroom project designed to feel playful, safe, functional, and long-lasting through custom storage, study support, and child-friendly proportions.",
    scope: ["Room Zoning", "Study Desk", "Storage System", "Safe Furniture"],
    materials: ["Plywood", "HPL", "Rounded Detail", "Warm LED", "Soft-close System"],
  },
};

const fallbackImages = [
  "../../assets/images/hero-kitchen-living.webp",
  "../../assets/images/custom-wardrobe.webp",
  "../../assets/images/bedroom-interior.webp",
  "../../assets/images/kids-bedroom.webp",
];

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
  const projectsIndex = parts.lastIndexOf("projects");
  if (projectsIndex === -1) return "";

  const next = parts[projectsIndex + 1];
  const afterDetail = parts[projectsIndex + 2];
  if (next === "detail" && afterDetail && afterDetail !== "index.html") return afterDetail;
  if (next && next !== "index.html" && next !== "detail") return next;
  return "";
}

function isSafeUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}

function compactText(value, fallback = "-") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function resolveImagePath(path) {
  const value = String(path || "").trim();
  if (!value || /^(javascript|data|vbscript):/i.test(value)) return fallbackImages[0];
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("../../") || value.startsWith("./")) return value;
  if (value.startsWith("../assets/")) return `../../${value.slice(3)}`;
  if (value.startsWith("/")) return `../..${value}`;
  return `../../${value.replace(/^\/+/, "")}`;
}

function splitTitle(title) {
  const words = compactText(title, "Kediamanku Project").split(" ");
  if (words.length <= 2) return [words.join(" ")];
  const midpoint = Math.ceil(words.length / 2);
  return [words.slice(0, midpoint).join(" "), words.slice(midpoint).join(" ")];
}

function normalizeMaterials(project) {
  const defaults = categoryDefaults[project.category]?.materials || categoryDefaults["Kitchen Set"].materials;
  const raw = [project.materials, ...(Array.isArray(project.tags) ? project.tags : [])]
    .filter(Boolean)
    .join(",")
    .split(/[,;/|]/)
    .map((item) => compactText(item, ""))
    .filter(Boolean);

  return [...new Set([...raw, ...defaults])].slice(0, 8);
}

function projectImages(project) {
  const defaultImage = categoryDefaults[project.category]?.image || fallbackImages[0];
  const primary = resolveImagePath(project.image_url || defaultImage);
  return [...new Set([primary, defaultImage, ...fallbackImages].map(resolveImagePath))].slice(0, 4);
}

function siteOrigin() {
  if (/^https?:\/\//i.test(window.location.origin)) return window.location.origin;
  return "https://kediamanku.id";
}

function absoluteUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return new URL(path, `${siteOrigin()}/projects/detail/`).href;
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

function updateProjectSeo(project, image) {
  const url = `${siteOrigin()}/projects/${encodeURIComponent(project.slug || project.id)}/`;
  const title = `${project.title} | Kediamanku Project`;
  const description = compactText(
    `${project.category || "Interior"} project in ${project.location || "a refined home"} by Kediamanku. ${project.area_scope || ""}`,
    "Kediamanku interior design and build project with refined materials and precise execution."
  ).slice(0, 160);

  document.title = title;
  setMeta('meta[name="description"]', "content", description);
  setCanonical(url);
  setMeta('meta[property="og:type"]', "content", "article");
  setMeta('meta[property="og:title"]', "content", title);
  setMeta('meta[property="og:description"]', "content", description);
  setMeta('meta[property="og:url"]', "content", url);
  setMeta('meta[property="og:image"]', "content", absoluteUrl(image));
  setMeta('meta[name="twitter:card"]', "content", "summary_large_image");
}

function renderDefinitionList(rows) {
  metadataList.replaceChildren();
  rows.forEach(([label, value]) => {
    const group = document.createElement("div");
    const term = document.createElement("dt");
    const detail = document.createElement("dd");
    term.textContent = label;
    detail.textContent = compactText(value);
    group.append(term, detail);
    metadataList.append(group);
  });
}

function renderTitle(title) {
  titleElement.replaceChildren();
  splitTitle(title).forEach((line) => {
    const span = document.createElement("span");
    span.textContent = line;
    titleElement.append(span);
  });
}

function renderScope(project) {
  const defaults = categoryDefaults[project.category] || categoryDefaults["Kitchen Set"];
  const scope = defaults.scope;
  const descriptions = {
    "Design Direction": "Mood, layout, proportions, storage rhythm, and overall interior expression are shaped before production.",
    "Custom Furniture": "Built-in furniture is planned around the room size, usage pattern, and preferred finishing direction.",
    Production: "Furniture components are produced with material control, measured detailing, and refined finishing.",
    Installation: "The final installation is aligned, checked, adjusted, and handed over with practical quality control.",
    "Storage Mapping": "Storage needs are translated into hanging zones, drawers, shelves, and display access.",
    "Wardrobe System": "Wardrobe panels, doors, and inner accessories are composed into one clean custom system.",
    "Room Zoning": "Sleeping, studying, storing, and play zones are balanced to keep the room practical and calm.",
  };

  scopeList.replaceChildren();
  scope.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "scope-item";
    card.style.transitionDelay = `${Math.min(index * 90, 320)}ms`;
    card.innerHTML = `
      <span>${escapeHtml(String(index + 1).padStart(2, "0"))}</span>
      <div>
        <h3>${escapeHtml(item)}</h3>
        <p>${escapeHtml(descriptions[item] || "This work phase is coordinated as part of Kediamanku's end-to-end design and build process.")}</p>
      </div>
    `;
    scopeList.append(card);
  });
}

function renderMaterials(project) {
  materialTags.replaceChildren();
  normalizeMaterials(project).forEach((material, index) => {
    const tag = document.createElement("span");
    tag.className = "material-tag";
    tag.style.transitionDelay = `${Math.min(index * 65, 360)}ms`;
    tag.textContent = material;
    materialTags.append(tag);
  });
}

function projectNarrative(project) {
  const defaults = categoryDefaults[project.category] || categoryDefaults["Kitchen Set"];
  const location = project.location ? ` in ${project.location}` : "";
  const materialLine = normalizeMaterials(project).slice(0, 4).join(", ");

  if (project.area_scope && project.area_scope.length > 90) return project.area_scope;
  return `${defaults.description} For this ${compactText(project.category, "interior")} project${location}, the design direction focuses on thoughtful storage, calm visual composition, and finishing details using ${materialLine}.`;
}

function renderProjectTestimonial(project) {
  const title = compactText(project.title, "this Kediamanku project");
  testimonialMetric.textContent = compactText(project.testimonial_metric, "5/5");
  testimonialMetricLabel.textContent = compactText(project.testimonial_metric_label, "Client project satisfaction");
  testimonialQuote.textContent = compactText(
    project.testimonial_quote,
    `Kediamanku helped us make ${title} feel calmer, more functional, and beautifully finished. The process was clear from design direction to installation, and the final result feels truly personal.`
  );
  testimonialClient.textContent = compactText(project.testimonial_client_name, "Private Homeowner");
  testimonialRole.textContent = compactText(project.testimonial_client_role, `${project.category || "Interior"} Project Client`);
  testimonialImage.src = project.testimonial_image_url ? resolveImagePath(project.testimonial_image_url) : "../../kediamanku-monogram.svg";
  testimonialImage.alt = `${testimonialClient.textContent} testimonial for ${title}`;
}

function renderProject(project) {
  const defaults = categoryDefaults[project.category] || categoryDefaults["Kitchen Set"];
  const images = projectImages(project);
  const title = compactText(project.title, "Kediamanku Project");

  renderTitle(title);
  kickerElement.textContent = `${project.category || "Interior"} Project`;
  categoryLabel.textContent = compactText(project.category, "Interior Project");
  typeLabel.textContent = "Design + Build Interior";
  heroImage.src = images[0];
  heroImage.alt = project.image_alt || `${title} project by Kediamanku`;
  narrativeCopy.textContent = projectNarrative(project);

  renderDefinitionList([
    ["Client", "Private Homeowner"],
    ["Category", project.category || "Interior"],
    ["Project Type", "Design + Build Interior"],
    ["Location", project.location || "Kediamanku Project"],
    ["Year", project.project_year || "2026"],
    ["Scope", project.area_scope || defaults.scope.join(", ")],
  ]);

  renderScope(project);
  renderMaterials(project);
  renderProjectTestimonial(project);
  updateProjectSeo(project, images[0]);
  setupReveal();
}

function renderError(message) {
  document.querySelector(".project-hero .container").innerHTML = `<p class="project-detail-error">${escapeHtml(message)}</p>`;
}

async function fetchProject(slug) {
  const baseSelect = "id,slug,title,category,location,project_year,area_scope,materials,image_url,image_alt,tags,sort_order,created_at";
  const testimonialSelect = "testimonial_metric,testimonial_metric_label,testimonial_quote,testimonial_client_name,testimonial_client_role,testimonial_image_url";
  const query = new URLSearchParams({
    select: `${baseSelect},${testimonialSelect}`,
    is_published: "eq.true",
    limit: "1",
  });

  if (isSafeUuid(slug)) query.set("id", `eq.${slug}`);
  else query.set("slug", `eq.${slug}`);

  let response = await fetch(`${supabaseConfig.restUrl}/projects?${query}`, {
    headers: {
      apikey: supabaseConfig.anonKey,
      Authorization: `Bearer ${supabaseConfig.anonKey}`,
    },
  });

  if (!response.ok) {
    const fallbackQuery = new URLSearchParams(query);
    fallbackQuery.set("select", baseSelect);
    response = await fetch(`${supabaseConfig.restUrl}/projects?${fallbackQuery}`, {
      headers: {
        apikey: supabaseConfig.anonKey,
        Authorization: `Bearer ${supabaseConfig.anonKey}`,
      },
    });
  }

  if (!response.ok) throw new Error("Project could not be loaded.");
  const rows = await response.json();
  return rows[0] || null;
}

function setupReveal() {
  const revealItems = [...document.querySelectorAll("[data-reveal], .scope-item, .material-tag")];
  if (!("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );

  revealItems.forEach((item) => observer.observe(item));
}

async function initProjectDetail() {
  const slug = getSlug();
  if (!slug) {
    renderError("Project slug is missing.");
    return;
  }

  if (!hasSupabaseConfig()) {
    renderError("Supabase is not configured yet.");
    return;
  }

  try {
    const project = await fetchProject(slug);
    if (!project) {
      renderError("Project not found or not published.");
      return;
    }
    renderProject(project);
  } catch (error) {
    console.warn(error);
    renderError("Project could not be loaded yet.");
  }
}

initProjectDetail();
