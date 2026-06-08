let revealItems = [...document.querySelectorAll("[data-reveal]")];
let filterButtons = [...document.querySelectorAll("[data-filter]")];
let projectCards = [...document.querySelectorAll(".archive-card")];
const emptyState = document.querySelector("[data-empty-state]");
const projectGrid = document.querySelector("[data-project-grid]");

let revealObserver = null;
let activeFilter = "All";

function hasSupabaseConfig() {
  const supabaseConfig = window.KEDIAMANKU_SUPABASE || {};
  return Boolean(
    supabaseConfig.restUrl &&
    supabaseConfig.anonKey &&
    !supabaseConfig.anonKey.includes("PASTE_SUPABASE_ANON_PUBLIC_KEY_HERE")
  );
}

function resolveImagePath(path) {
  if (!path) return "../assets/images/hero-kitchen-living.webp";
  if (/^(https?:)?\/\//.test(path) || path.startsWith("data:")) return path;
  if (path.startsWith("../") || path.startsWith("./")) return path;
  if (path.startsWith("/")) return `..${path}`;
  return `../${path}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function projectDetailPath(project) {
  const slug = project.slug || project.id || "";
  return slug ? `detail/index.html?slug=${encodeURIComponent(slug)}` : "index.html";
}

function createProjectCard(project, index) {
  const categories = [project.category, ...(project.tags || [])].filter(Boolean).join(" ");
  const number = `.KDM-${String(index + 1).padStart(2, "0")}`;
  const article = document.createElement("article");
  article.className = "archive-card";
  article.dataset.reveal = "";
  article.dataset.categories = categories;
  article.innerHTML = `
    <a href="${escapeHtml(projectDetailPath(project))}" aria-label="View ${escapeHtml(project.title)} project">
      <figure>
        <img src="${escapeHtml(resolveImagePath(project.image_url))}" alt="${escapeHtml(project.image_alt || `${project.title} project by Kediamanku`)}" width="1200" height="900" loading="lazy">
      </figure>
      <div class="archive-meta">
        <span class="project-no">${escapeHtml(number)}</span>
        <div>
          <h2>${escapeHtml(project.title)}</h2>
          <dl>
            <div><dt>Category</dt><dd>${escapeHtml(project.category || "-")}</dd></div>
            <div><dt>Location</dt><dd>${escapeHtml(project.location || "-")}</dd></div>
            <div><dt>Year</dt><dd>${escapeHtml(project.project_year || "-")}</dd></div>
            <div><dt>Area / scope</dt><dd>${escapeHtml(project.area_scope || "-")}</dd></div>
            <div><dt>Materials / finishing</dt><dd>${escapeHtml(project.materials || "-")}</dd></div>
          </dl>
        </div>
      </div>
    </a>
  `;
  return article;
}

function setupReveal() {
  revealItems = [...document.querySelectorAll("[data-reveal]")];

  if (revealObserver) {
    revealObserver.disconnect();
  }

  if ("IntersectionObserver" in window) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -8% 0px",
      }
    );

    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }
}

function refreshCards() {
  projectCards = [...document.querySelectorAll(".archive-card")];
}

function filterProjects(filter) {
  activeFilter = filter;
  let visibleCount = 0;

  refreshCards();
  projectCards.forEach((card, index) => {
    const categories = card.dataset.categories || "";
    const shouldShow = filter === "All" || categories.includes(filter);
    card.hidden = !shouldShow;
    card.classList.remove("is-filtering");

    if (shouldShow) {
      visibleCount += 1;
      window.setTimeout(() => {
        card.classList.add("is-visible", "is-filtering");
        card.style.animationDelay = `${Math.min(index * 35, 180)}ms`;
      }, 0);
    }
  });

  if (emptyState) {
    emptyState.hidden = visibleCount > 0;
  }
}

function setupFilters() {
  filterButtons = [...document.querySelectorAll("[data-filter]")];

  filterButtons.forEach((button, index) => {
    button.style.transitionDelay = `${Math.min(index * 35, 180)}ms`;

    button.addEventListener("click", () => {
      filterButtons.forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      filterProjects(button.dataset.filter || "All");
    });
  });
}

async function fetchSupabaseProjects() {
  if (!hasSupabaseConfig()) return [];

  const supabaseConfig = window.KEDIAMANKU_SUPABASE;
  const query = new URLSearchParams({
    select: "id,slug,title,category,location,project_year,area_scope,materials,image_url,image_alt,tags,sort_order,created_at",
    is_published: "eq.true",
    order: "sort_order.asc,created_at.desc",
  });

  const response = await fetch(`${supabaseConfig.restUrl}/projects?${query}`, {
    headers: {
      apikey: supabaseConfig.anonKey,
      Authorization: `Bearer ${supabaseConfig.anonKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase projects request failed: ${response.status}`);
  }

  return response.json();
}

async function initProjects() {
  setupReveal();
  setupFilters();
  filterProjects(activeFilter);

  try {
    const liveProjects = await fetchSupabaseProjects();
    if (Array.isArray(liveProjects) && liveProjects.length) {
      projectGrid.innerHTML = "";
      liveProjects.forEach((project, index) => {
        projectGrid.append(createProjectCard(project, index));
      });
      setupReveal();
      filterProjects(activeFilter);
    }
  } catch (error) {
    console.warn(error);
    filterProjects(activeFilter);
  }
}

initProjects();
