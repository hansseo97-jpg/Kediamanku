const supabaseConfig = window.KEDIAMANKU_SUPABASE || {};
const shell = document.querySelector("[data-project-shell]");
const categoryElement = document.querySelector("[data-project-category]");
const labelElement = document.querySelector("[data-project-label]");
const titleElement = document.querySelector("[data-project-title]");
const descriptionElement = document.querySelector("[data-project-description]");
const imageElement = document.querySelector("[data-project-image]");
const specList = document.querySelector("[data-project-specs]");
const tagList = document.querySelector("[data-project-tags]");

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

function compactText(value, fallback = "-") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text || fallback;
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

function renderSpecs(project) {
  const specs = [
    ["Category", project.category],
    ["Location", project.location],
    ["Year", project.project_year],
    ["Area / scope", project.area_scope],
    ["Materials / finishing", project.materials],
  ];

  specList.replaceChildren();
  specs.forEach(([label, value]) => {
    const group = document.createElement("div");
    const term = document.createElement("dt");
    const detail = document.createElement("dd");
    term.textContent = label;
    detail.textContent = compactText(value);
    group.append(term, detail);
    specList.append(group);
  });
}

function renderTags(project) {
  const tags = [project.category, ...(Array.isArray(project.tags) ? project.tags : [])].filter(Boolean);
  tagList.replaceChildren();
  tags.forEach((tag) => {
    const pill = document.createElement("span");
    pill.textContent = tag;
    tagList.append(pill);
  });
}

function renderProject(project) {
  const image = resolveImagePath(project.image_url);
  const description = compactText(
    project.area_scope || project.materials,
    "A refined Kediamanku interior project designed around daily function, warm material direction, and precise installation."
  );

  categoryElement.textContent = project.category || "Project";
  labelElement.textContent = project.category || "Selected Project";
  titleElement.textContent = project.title || "Kediamanku Project";
  descriptionElement.textContent = description;
  imageElement.src = image;
  imageElement.alt = project.image_alt || `${project.title} project by Kediamanku`;
  renderSpecs(project);
  renderTags(project);
  updateProjectSeo(project, image);

  document.querySelectorAll("[data-reveal]").forEach((item) => item.classList.add("is-visible"));
}

function renderError(message) {
  shell.replaceChildren();
  const error = document.createElement("p");
  error.className = "project-detail-error";
  error.textContent = message;
  shell.append(error);
}

async function fetchProject(slug) {
  const query = new URLSearchParams({
    select: "id,slug,title,category,location,project_year,area_scope,materials,image_url,image_alt,tags,created_at",
    is_published: "eq.true",
    limit: "1",
  });

  if (isSafeUuid(slug)) {
    query.set("id", `eq.${slug}`);
  } else {
    query.set("slug", `eq.${slug}`);
  }

  const response = await fetch(`${supabaseConfig.restUrl}/projects?${query}`, {
    headers: {
      apikey: supabaseConfig.anonKey,
      Authorization: `Bearer ${supabaseConfig.anonKey}`,
    },
  });

  if (!response.ok) throw new Error("Project could not be loaded.");
  const rows = await response.json();
  return rows[0] || null;
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
