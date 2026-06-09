const supabaseConfig = window.KEDIAMANKU_SUPABASE || {};
const grid = document.querySelector("[data-blog-archive]");
const emptyState = document.querySelector("[data-empty-state]");

function hasSupabaseConfig() {
  return Boolean(
    supabaseConfig.restUrl &&
      supabaseConfig.anonKey &&
      !supabaseConfig.anonKey.includes("PASTE_SUPABASE_ANON_PUBLIC_KEY_HERE")
  );
}

function resolveImagePath(path) {
  const value = String(path || "").trim();
  if (!value || /^(javascript|data|vbscript):/i.test(value)) return "../assets/images/hero-kitchen-living.webp";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("../") || value.startsWith("./")) return value;
  if (value.startsWith("/")) return `..${value}`;
  return `../${value.replace(/^\/+/, "")}`;
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function articleCard(post, index) {
  const article = createElement("article", "archive-card is-visible");
  const link = document.createElement("a");
  link.href = `detail/index.html?slug=${encodeURIComponent(post.slug)}`;

  const figure = document.createElement("figure");
  const image = document.createElement("img");
  image.src = resolveImagePath(post.featured_image);
  image.alt = `${post.title} article by Kediamanku`;
  image.loading = "lazy";
  figure.append(image);

  const meta = createElement("div", "archive-meta");
  meta.append(createElement("span", "project-no", `BLOG-${String(index + 1).padStart(2, "0")}`));
  const copy = document.createElement("div");
  copy.append(createElement("h2", "", post.title));
  const dl = document.createElement("dl");
  [
    ["Category", post.category],
    ["Published", post.published_at ? new Date(post.published_at).getFullYear() : "Published"],
    ["Read", `${post.read_time_minutes || 4} min`],
  ].forEach(([label, value]) => {
    const row = document.createElement("div");
    row.append(createElement("dt", "", label), createElement("dd", "", value));
    dl.append(row);
  });
  copy.append(dl);
  meta.append(copy);

  link.append(figure, meta);
  article.append(link);
  return article;
}

async function loadArchive() {
  if (!hasSupabaseConfig()) {
    emptyState.hidden = false;
    emptyState.textContent = "Supabase configuration is not active yet.";
    return;
  }

  const query = new URLSearchParams({
    select: "slug,title,category,featured_image,published_at,read_time_minutes",
    status: "eq.published",
    order: "published_at.desc",
  });

  const response = await fetch(`${supabaseConfig.restUrl}/blog_posts?${query}`, {
    headers: {
      apikey: supabaseConfig.anonKey,
      Authorization: `Bearer ${supabaseConfig.anonKey}`,
    },
  });

  if (!response.ok) {
    emptyState.hidden = false;
    emptyState.textContent = "Blog archive could not be loaded.";
    return;
  }

  const posts = await response.json();
  grid.replaceChildren();
  emptyState.hidden = posts.length > 0;
  posts.forEach((post, index) => grid.append(articleCard(post, index)));
}

document.querySelectorAll("[data-reveal]").forEach((item) => item.classList.add("is-visible"));
loadArchive();
