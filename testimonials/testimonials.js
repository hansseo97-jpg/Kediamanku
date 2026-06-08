let testimonials = [];

const rows = [...document.querySelectorAll("[data-row]")];
const filterButtons = [...document.querySelectorAll("[data-filter]")];
const modal = document.querySelector("[data-modal]");
const closeButtons = document.querySelectorAll("[data-modal-close]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let activeFilter = "All";
let activeCardButton = null;

function formatDisplayDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function resolveImagePath(value) {
  if (!value) return "../assets/images/hero-kitchen-living.webp";
  if (/^(https?:)?\/\//.test(value) || value.startsWith("../") || value.startsWith("/")) {
    return value;
  }
  return `../${value}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeCssUrl(value) {
  const url = String(value || "").replace(/["\\\n\r]/g, "");
  if (/^(javascript|vbscript):/i.test(url)) return "../assets/images/hero-kitchen-living.webp";
  return url;
}

function mapSupabaseTestimonial(row) {
  return {
    id: row.slug || row.id,
    title: row.title,
    service: row.service,
    date: formatDisplayDate(row.testimonial_date || row.created_at),
    excerpt: row.excerpt,
    detail: row.detail,
    client: row.client_name,
    location: row.location || "",
    project: row.project_name || "",
    image: resolveImagePath(row.image_url),
    alt: row.image_alt || `${row.service} testimonial by Kediamanku`,
  };
}

async function fetchSupabaseTestimonials() {
  const config = window.KEDIAMANKU_SUPABASE;
  const anonKey = config?.anonKey;
  const restUrl = config?.restUrl;
  const hasUsableKey = anonKey && !anonKey.includes("PASTE_SUPABASE_ANON_PUBLIC_KEY_HERE");

  if (!restUrl || !hasUsableKey) {
    return [];
  }

  const query = [
    "select=slug,title,service,rating,testimonial_date,excerpt,detail,client_name,location,project_name,image_url,image_alt,created_at",
    "is_published=eq.true",
    "order=sort_order.asc,testimonial_date.desc",
  ].join("&");

  const response = await fetch(`${restUrl}/testimonials?${query}`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase testimonials request failed: ${response.status}`);
  }

  const rows = await response.json();
  return rows.map(mapSupabaseTestimonial);
}

const cardObserver = "IntersectionObserver" in window
  ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          cardObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18 })
  : null;

function createCard(story, index, isDuplicate = false) {
  const article = document.createElement("article");
  article.className = `testimonial-card${isDuplicate ? " duplicate" : ""}`;
  article.style.transitionDelay = `${Math.min(index * 45, 420)}ms`;

  if (isDuplicate) {
    article.setAttribute("aria-hidden", "true");
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "testimonial-card-button";
  button.style.setProperty("--card-image", `url("${safeCssUrl(story.image)}")`);
  button.setAttribute("aria-label", `Read testimonial from ${story.client} for ${story.service}`);

  if (isDuplicate) {
    button.tabIndex = -1;
  }

  button.innerHTML = `
    <span class="service-tag">${escapeHtml(story.service)}</span>
    <h3>${escapeHtml(story.title)}</h3>
    <div class="card-stars" aria-label="Five star rating">
      <span aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
      <time datetime="${escapeHtml(story.date)}">${escapeHtml(story.date)}</time>
    </div>
    <p>${escapeHtml(story.excerpt)}</p>
    <span class="card-footer">
      <strong>${escapeHtml(story.client)}</strong>
      <span class="card-meta">${escapeHtml(story.location)} &middot; ${escapeHtml(story.project)}</span>
    </span>
    <span class="view-story">View Story &rarr;</span>
  `;

  button.addEventListener("click", () => openModal(story, button));
  article.append(button);

  if (reduceMotion || !cardObserver) {
    article.classList.add("is-visible");
  } else {
    cardObserver.observe(article);
  }

  return article;
}

function buildLoop(stories) {
  const minimumCards = 12;
  const copies = Math.max(4, Math.ceil(minimumCards / Math.max(stories.length, 1)));
  return Array.from({ length: copies }, () => stories).flat();
}

function renderTestimonials() {
  const filtered = activeFilter === "All"
    ? testimonials
    : testimonials.filter((story) => story.service === activeFilter);
  const source = filtered.length ? filtered : testimonials;

  if (!source.length) {
    rows.forEach((row, index) => {
      row.innerHTML = index === 0
        ? '<article class="testimonial-empty">No testimonials yet. Add real stories from the admin dashboard.</article>'
        : "";
    });
    return;
  }
  const rowSets = [[], [], []];

  source.forEach((story, index) => {
    rowSets[index % 3].push(story);
  });

  rows.forEach((row, rowIndex) => {
    row.innerHTML = "";
    const stories = rowSets[rowIndex].length ? rowSets[rowIndex] : source;
    const loop = buildLoop(stories);

    loop.forEach((story, index) => {
      row.append(createCard(story, index, index >= stories.length));
    });
  });
}

function setFilter(filter) {
  activeFilter = filter;
  filterButtons.forEach((button) => {
    const isActive = button.dataset.filter === filter;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
  renderTestimonials();
}

function openModal(story, trigger) {
  activeCardButton = trigger;
  const image = modal.querySelector("[data-modal-image]");
  image.src = story.image;
  image.alt = story.alt;
  modal.querySelector("[data-modal-tag]").textContent = story.service;
  modal.querySelector("[data-modal-title]").textContent = story.title;
  modal.querySelector("[data-modal-detail]").textContent = story.detail;
  modal.querySelector("[data-modal-client]").textContent = story.client;
  modal.querySelector("[data-modal-location]").textContent = story.location;
  modal.querySelector("[data-modal-project]").textContent = story.project;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  modal.querySelector(".modal-close").focus();
}

function closeModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  activeCardButton?.focus();
}

function keepFocusInModal(event) {
  if (event.key !== "Tab" || !modal.classList.contains("is-open")) {
    return;
  }

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

filterButtons.forEach((button) => {
  button.addEventListener("click", () => setFilter(button.dataset.filter));
});

closeButtons.forEach((button) => {
  button.addEventListener("click", closeModal);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal.classList.contains("is-open")) {
    closeModal();
  }

  keepFocusInModal(event);
});

async function initTestimonials() {
  renderTestimonials();

  try {
    const liveTestimonials = await fetchSupabaseTestimonials();

    if (Array.isArray(liveTestimonials) && liveTestimonials.length) {
      testimonials = liveTestimonials;
      renderTestimonials();
    }
  } catch (error) {
    console.error(error);
    testimonials = [];
    renderTestimonials();
  }
}

initTestimonials();
