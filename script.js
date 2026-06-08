const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const mobileMenu = document.querySelector("[data-mobile-menu]");
const servicesToggle = document.querySelector("[data-services-toggle]");
const servicesMenu = document.querySelector("[data-services-menu]");
const servicesShowcase = document.querySelector("[data-services-showcase]");
const servicePanels = document.querySelectorAll("[data-service-panel]");
const serviceImages = document.querySelectorAll("[data-service-image]");
const testimonialSection = document.querySelector("[data-testimonials]");
const testimonialFloatCards = document.querySelectorAll(".testimonial-float-card");
const benefitsSection = document.querySelector("[data-benefits]");
const benefitImages = document.querySelectorAll(".benefit-img");
const projectCarousel = document.querySelector("[data-project-carousel]");
const homeProjectGrid = document.querySelector("[data-home-project-grid]");
const homeProjectEmpty = document.querySelector("[data-home-project-empty]");
const workTrack = document.querySelector("[data-work-track]");
const workCards = [...document.querySelectorAll("[data-work-card]")];
const workDots = [...document.querySelectorAll("[data-work-dot]")];
const workProgressFill = document.querySelector("[data-work-progress-fill]");
const projectModal = document.querySelector("[data-project-modal]");
const projectTriggers = document.querySelectorAll("[data-project-trigger]");
const projectModalCloseButtons = document.querySelectorAll("[data-project-modal-close]");
const leadModal = document.querySelector("[data-lead-modal]");
const openLeadModalButtons = document.querySelectorAll("[data-open-lead-modal]");
const closeLeadModalButtons = document.querySelectorAll("[data-close-lead-modal]");
const leadForm = document.querySelector("[data-lead-form]");
const leadStatus = document.querySelector("[data-lead-status]");
const leadStartedInput = document.querySelector("[data-form-started-at]");
const revealSections = document.querySelectorAll("main > section:not(.hero), .site-footer");

let lastLeadTrigger = null;
let leadFormStartedAt = "";

function updateHeader() {
  if (!header) return;
  header.classList.toggle("is-scrolled", window.scrollY > 24);
}

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

function setLeadStatus(message, type = "") {
  if (!leadStatus) return;
  leadStatus.textContent = message;
  leadStatus.classList.toggle("is-error", type === "error");
  leadStatus.classList.toggle("is-success", type === "success");
}

function markLeadFormStarted() {
  leadFormStartedAt = new Date().toISOString();
  if (leadStartedInput) {
    leadStartedInput.value = leadFormStartedAt;
  }
}

function openLeadModal(trigger) {
  if (!leadModal) return;
  lastLeadTrigger = trigger || document.activeElement;
  markLeadFormStarted();
  leadModal.classList.add("is-open");
  leadModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("lead-modal-open");
  setLeadStatus("");

  window.setTimeout(() => {
    leadModal.querySelector('input[name="name"]')?.focus();
  }, 180);
}

function closeLeadModal() {
  if (!leadModal) return;
  leadModal.classList.remove("is-open");
  leadModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("lead-modal-open");
  lastLeadTrigger?.focus?.({ preventScroll: true });
}

function keepLeadModalFocus(event) {
  if (!leadModal?.classList.contains("is-open") || event.key !== "Tab") return;

  const focusable = [...leadModal.querySelectorAll("button, a, input, select, textarea")]
    .filter((element) => !element.disabled && element.tabIndex !== -1 && element.offsetParent !== null);
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (!first || !last) return;

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function hasSupabaseLeadConfig() {
  const supabaseConfig = window.KEDIAMANKU_SUPABASE || {};
  return Boolean(
    supabaseConfig.restUrl &&
    supabaseConfig.anonKey &&
    !supabaseConfig.anonKey.includes("PASTE_SUPABASE_ANON_PUBLIC_KEY_HERE")
  );
}

if (leadForm) {
  leadForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!hasSupabaseLeadConfig()) {
      setLeadStatus("Supabase belum dikonfigurasi. Hubungi Kediamanku lewat kontak utama dulu.", "error");
      return;
    }

    const supabaseConfig = window.KEDIAMANKU_SUPABASE;
    const formData = new FormData(leadForm);
    const startedAt = formData.get("form_started_at") || leadFormStartedAt;
    const honeypot = String(formData.get("website") || "").trim();

    if (honeypot) {
      setLeadStatus("Thank you. Your inquiry has been received.", "success");
      window.setTimeout(closeLeadModal, 900);
      return;
    }

    if (!startedAt || Date.now() - Date.parse(startedAt) < 3000) {
      setLeadStatus("Please wait a moment before submitting.", "error");
      return;
    }

    const payload = {
      name: String(formData.get("name") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      email: formData.get("email") ? String(formData.get("email")).trim() : null,
      service_interest: formData.get("service_interest"),
      message: String(formData.get("message") || "").trim(),
      source: "homepage",
      website: honeypot,
      form_started_at: startedAt,
      user_agent: navigator.userAgent.slice(0, 240),
    };

    try {
      setLeadStatus("Sending your project inquiry...");
      const response = await fetch(`${supabaseConfig.restUrl}/leads`, {
        method: "POST",
        headers: {
          apikey: supabaseConfig.anonKey,
          Authorization: `Bearer ${supabaseConfig.anonKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Lead request failed: ${response.status}`);
      }

      leadForm.reset();
      markLeadFormStarted();
      setLeadStatus("Thank you. Your inquiry has been saved and will be reviewed.", "success");
      window.setTimeout(closeLeadModal, 1300);
    } catch (error) {
      console.warn(error);
      setLeadStatus("Inquiry could not be saved yet. Please try again later.", "error");
    }
  });
}

openLeadModalButtons.forEach((button) => {
  button.addEventListener("click", () => openLeadModal(button));
});

document.addEventListener("click", (event) => {
  const link = event.target.closest('a[href="#contact"], a[href$="index.html#contact"]');
  if (!link || !leadModal) return;

  try {
    const url = new URL(link.getAttribute("href"), window.location.href);
    const samePage = url.pathname === window.location.pathname || url.pathname.endsWith("/index.html");
    if (samePage && url.hash === "#contact") {
      event.preventDefault();
      history.replaceState(null, "", "#contact");
      document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => openLeadModal(link), 260);
    }
  } catch (error) {
    console.warn(error);
  }
});

closeLeadModalButtons.forEach((button) => {
  button.addEventListener("click", closeLeadModal);
});

if (window.location.hash === "#contact" && leadModal) {
  window.setTimeout(() => openLeadModal(), 450);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && leadModal?.classList.contains("is-open")) {
    closeLeadModal();
  }

  keepLeadModalFocus(event);
});

if (menuToggle && mobileMenu) {
  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.classList.toggle("is-open");
    mobileMenu.classList.toggle("is-open", isOpen);
    document.body.classList.toggle("menu-open", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
  });

  mobileMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menuToggle.classList.remove("is-open");
      mobileMenu.classList.remove("is-open");
      document.body.classList.remove("menu-open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open menu");
    });
  });
}

if (servicesToggle && servicesMenu) {
  servicesToggle.addEventListener("click", () => {
    const isOpen = servicesMenu.classList.toggle("is-open");
    servicesToggle.setAttribute("aria-expanded", String(isOpen));
  });

  document.addEventListener("click", (event) => {
    if (!servicesMenu.contains(event.target) && !servicesToggle.contains(event.target)) {
      servicesMenu.classList.remove("is-open");
      servicesToggle.setAttribute("aria-expanded", "false");
    }
  });
}

function activateServicePanel(panelToActivate, shouldFocus = false) {
  servicePanels.forEach((panel) => {
    const isActive = panel === panelToActivate;
    panel.classList.toggle("is-active", isActive);
    panel.setAttribute("aria-expanded", String(isActive));
  });

  if (shouldFocus) {
    panelToActivate.focus({ preventScroll: true });
  }
}

servicePanels.forEach((panel, index) => {
  panel.addEventListener("click", (event) => {
    if (event.target.closest("a")) return;
    activateServicePanel(panel);
  });

  panel.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activateServicePanel(panel);
    }

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      activateServicePanel(servicePanels[(index + 1) % servicePanels.length], true);
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      activateServicePanel(servicePanels[(index - 1 + servicePanels.length) % servicePanels.length], true);
    }
  });
});

if ("IntersectionObserver" in window) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          sectionObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -10% 0px",
    }
  );

  revealSections.forEach((section, index) => {
    section.classList.add("reveal-section");
    section.style.transitionDelay = `${Math.min(index * 55, 220)}ms`;
    sectionObserver.observe(section);
  });
} else {
  revealSections.forEach((section) => {
    section.classList.add("reveal-section", "is-visible");
  });
}

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const desktopPointer = window.matchMedia("(min-width: 821px) and (hover: hover)");

const projectDetails = {};

function hasSupabaseContentConfig() {
  const supabaseConfig = window.KEDIAMANKU_SUPABASE || {};
  return Boolean(
    supabaseConfig.restUrl &&
    supabaseConfig.anonKey &&
    !supabaseConfig.anonKey.includes("PASTE_SUPABASE_ANON_PUBLIC_KEY_HERE")
  );
}

function resolveHomeImagePath(path) {
  if (!path) return "assets/images/hero-kitchen-living.webp";
  if (/^(https?:)?\/\//.test(path) || path.startsWith("data:")) return path;
  if (path.startsWith("../")) return path.replace("../", "");
  if (path.startsWith("./")) return path.replace("./", "");
  if (path.startsWith("/")) return path.slice(1);
  return path;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function mapHomeProject(row) {
  const id = row.slug || row.id;
  return {
    id,
    title: row.title,
    category: row.category || "Interior Project",
    description: row.area_scope || "Custom interior project by Kediamanku.",
    type: row.category || "Custom Interior",
    size: row.area_scope || "Custom scope",
    color: "Custom material direction",
    location: row.location || "-",
    materials: row.materials || "-",
    image: resolveHomeImagePath(row.image_url),
    alt: row.image_alt || `${row.title} project by Kediamanku`,
    features: [
      row.area_scope || "Designed around the homeowner's space and daily function.",
      row.materials || "Material and finishing direction selected with care.",
      "Built through Kediamanku's design and build process.",
    ],
  };
}

async function fetchHomeProjects() {
  if (!hasSupabaseContentConfig()) return [];

  const supabaseConfig = window.KEDIAMANKU_SUPABASE;
  const query = new URLSearchParams({
    select: "id,slug,title,category,location,area_scope,materials,image_url,image_alt,is_featured,sort_order,created_at",
    is_published: "eq.true",
    order: "is_featured.desc,sort_order.asc,created_at.desc",
    limit: "2",
  });

  const response = await fetch(`${supabaseConfig.restUrl}/projects?${query}`, {
    headers: {
      apikey: supabaseConfig.anonKey,
      Authorization: `Bearer ${supabaseConfig.anonKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase homepage projects request failed: ${response.status}`);
  }

  const rows = await response.json();
  return rows.map(mapHomeProject);
}

function createHomeProjectCard(project) {
  const article = document.createElement("article");
  article.className = "project-showcase-card";
  article.innerHTML = `
    <button class="project-card-button" type="button" data-project-trigger="${escapeHtml(project.id)}" aria-label="Open ${escapeHtml(project.title)} project details">
      <img src="${escapeHtml(project.image)}" alt="${escapeHtml(project.alt)}" loading="lazy" width="1200" height="900">
      <div class="project-info-bar">
        <div>
          <h3>${escapeHtml(project.title)}</h3>
          <p>${escapeHtml(project.description)}</p>
        </div>
        <span class="project-arrow" aria-hidden="true">&nearr;</span>
      </div>
    </button>
  `;
  return article;
}

async function renderHomeProjects() {
  if (!homeProjectGrid) return;

  try {
    const projects = await fetchHomeProjects();
    homeProjectGrid.innerHTML = "";

    if (!projects.length) {
      if (homeProjectEmpty) {
        homeProjectGrid.append(homeProjectEmpty);
        homeProjectEmpty.hidden = false;
      }
      return;
    }

    projects.forEach((project) => {
      projectDetails[project.id] = project;
      homeProjectGrid.append(createHomeProjectCard(project));
    });
  } catch (error) {
    console.warn(error);
    if (homeProjectEmpty) {
      homeProjectEmpty.hidden = false;
    }
  }
}

renderHomeProjects();

if (servicesShowcase && serviceImages.length && !reduceMotion.matches && desktopPointer.matches) {
  servicesShowcase.addEventListener("mousemove", (event) => {
    const activePanel = document.querySelector("[data-service-panel].is-active");
    const activeImage = activePanel?.querySelector("[data-service-image]");
    if (!activeImage) return;

    const rect = activePanel.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    activeImage.style.setProperty("--service-parallax-x", `${(x * 12).toFixed(2)}px`);
    activeImage.style.setProperty("--service-parallax-y", `${(y * 8).toFixed(2)}px`);
  });

  servicesShowcase.addEventListener("mouseleave", () => {
    serviceImages.forEach((image) => {
      image.style.setProperty("--service-parallax-x", "0px");
      image.style.setProperty("--service-parallax-y", "0px");
    });
  });
}

if (testimonialSection && testimonialFloatCards.length && !reduceMotion.matches && desktopPointer.matches) {
  testimonialSection.addEventListener("mousemove", (event) => {
    const rect = testimonialSection.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    testimonialFloatCards.forEach((card) => {
      const strength = Number(card.dataset.parallax || 4);
      card.style.setProperty("--parallax-x", `${(x * strength).toFixed(2)}px`);
      card.style.setProperty("--parallax-y", `${(y * strength).toFixed(2)}px`);
    });
  });

  testimonialSection.addEventListener("mouseleave", () => {
    testimonialFloatCards.forEach((card) => {
      card.style.setProperty("--parallax-x", "0px");
      card.style.setProperty("--parallax-y", "0px");
    });
  });
}

if (benefitsSection && benefitImages.length && !reduceMotion.matches && desktopPointer.matches) {
  benefitsSection.addEventListener("mousemove", (event) => {
    const rect = benefitsSection.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    benefitImages.forEach((image) => {
      const strength = Number(image.dataset.parallax || 4);
      image.style.setProperty("--benefit-parallax-x", `${(x * strength).toFixed(2)}px`);
      image.style.setProperty("--benefit-parallax-y", `${(y * strength).toFixed(2)}px`);
    });
  });

  benefitsSection.addEventListener("mouseleave", () => {
    benefitImages.forEach((image) => {
      image.style.setProperty("--benefit-parallax-x", "0px");
      image.style.setProperty("--benefit-parallax-y", "0px");
    });
  });
}

if (projectCarousel) {
  let isDragging = false;
  let startX = 0;
  let startScrollLeft = 0;
  let dragged = false;

  projectCarousel.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest("a:focus-visible")) return;
    isDragging = true;
    dragged = false;
    startX = event.clientX;
    startScrollLeft = projectCarousel.scrollLeft;
    projectCarousel.classList.add("is-dragging");
    projectCarousel.setPointerCapture(event.pointerId);
  });

  projectCarousel.addEventListener("pointermove", (event) => {
    if (!isDragging) return;
    const delta = event.clientX - startX;

    if (Math.abs(delta) > 6) {
      dragged = true;
    }

    projectCarousel.scrollLeft = startScrollLeft - delta;
  });

  function endProjectDrag(event) {
    if (!isDragging) return;
    isDragging = false;
    projectCarousel.classList.remove("is-dragging");

    if (projectCarousel.hasPointerCapture(event.pointerId)) {
      projectCarousel.releasePointerCapture(event.pointerId);
    }
  }

  projectCarousel.addEventListener("pointerup", endProjectDrag);
  projectCarousel.addEventListener("pointercancel", endProjectDrag);
  projectCarousel.addEventListener("click", (event) => {
    if (!dragged) return;
    event.preventDefault();
    event.stopPropagation();
    dragged = false;
  }, true);
}

if (workTrack && workCards.length) {
  let isDragging = false;
  let startX = 0;
  let startScrollLeft = 0;
  let dragged = false;
  let scrollFrame = null;

  function setActiveWorkCard(activeIndex) {
    workCards.forEach((card, index) => {
      card.classList.toggle("is-active", index === activeIndex);
    });

    workDots.forEach((dot, index) => {
      dot.classList.toggle("is-active", index === activeIndex);
    });

    if (workProgressFill) {
      const progress = workCards.length > 1 ? (activeIndex + 1) / workCards.length : 1;
      workProgressFill.style.transform = `scaleX(${progress})`;
    }
  }

  function updateActiveWorkCard() {
    const trackRect = workTrack.getBoundingClientRect();
    const trackCenter = trackRect.left + trackRect.width / 2;
    let activeIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    workCards.forEach((card, index) => {
      const cardRect = card.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      const distance = Math.abs(trackCenter - cardCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        activeIndex = index;
      }
    });

    setActiveWorkCard(activeIndex);
  }

  function scheduleWorkUpdate() {
    if (scrollFrame) {
      cancelAnimationFrame(scrollFrame);
    }

    scrollFrame = requestAnimationFrame(updateActiveWorkCard);
  }

  workDots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      workCards[index]?.scrollIntoView({
        behavior: reduceMotion.matches ? "auto" : "smooth",
        block: "nearest",
        inline: "center",
      });
      setActiveWorkCard(index);
    });
  });

  workTrack.addEventListener("scroll", scheduleWorkUpdate, { passive: true });

  workTrack.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    isDragging = true;
    dragged = false;
    startX = event.clientX;
    startScrollLeft = workTrack.scrollLeft;
    workTrack.classList.add("is-dragging");
    workTrack.setPointerCapture(event.pointerId);
  });

  workTrack.addEventListener("pointermove", (event) => {
    if (!isDragging) return;
    const delta = event.clientX - startX;

    if (Math.abs(delta) > 6) {
      dragged = true;
    }

    workTrack.scrollLeft = startScrollLeft - delta;
  });

  function endWorkDrag(event) {
    if (!isDragging) return;
    isDragging = false;
    workTrack.classList.remove("is-dragging");
    scheduleWorkUpdate();

    if (workTrack.hasPointerCapture(event.pointerId)) {
      workTrack.releasePointerCapture(event.pointerId);
    }
  }

  workTrack.addEventListener("pointerup", endWorkDrag);
  workTrack.addEventListener("pointercancel", endWorkDrag);
  workTrack.addEventListener("click", (event) => {
    if (!dragged) return;
    event.preventDefault();
    event.stopPropagation();
    dragged = false;
  }, true);

  updateActiveWorkCard();
}

if (projectModal) {
  let lastProjectTrigger = null;

  function setProjectModal(project) {
    projectModal.querySelector("[data-project-modal-category]").textContent = project.category;
    projectModal.querySelector("[data-project-modal-title]").textContent = project.title;
    projectModal.querySelector("[data-project-modal-description]").textContent = project.description;
    projectModal.querySelector("[data-project-modal-type]").textContent = project.type;
    projectModal.querySelector("[data-project-modal-size]").textContent = project.size;
    projectModal.querySelector("[data-project-modal-color]").textContent = project.color;
    projectModal.querySelector("[data-project-modal-location]").textContent = project.location;
    projectModal.querySelector("[data-project-modal-materials]").textContent = project.materials;

    const image = projectModal.querySelector("[data-project-modal-image]");
    image.src = project.image;
    image.alt = project.alt;

    const featureList = projectModal.querySelector("[data-project-modal-features]");
    featureList.innerHTML = "";
    project.features.forEach((feature) => {
      const item = document.createElement("li");
      item.textContent = feature;
      featureList.append(item);
    });
  }

  function openProjectModal(projectKey, trigger) {
    const project = projectDetails[projectKey];
    if (!project) return;

    lastProjectTrigger = trigger;
    setProjectModal(project);
    projectModal.classList.add("is-open");
    projectModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("project-modal-open");
    projectModal.querySelector(".project-modal-close").focus();
  }

  function closeProjectModal() {
    projectModal.classList.remove("is-open");
    projectModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("project-modal-open");
    lastProjectTrigger?.focus({ preventScroll: true });
  }

  function keepProjectModalFocus(event) {
    if (event.key !== "Tab" || !projectModal.classList.contains("is-open")) return;

    const focusable = [...projectModal.querySelectorAll("button, a")]
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

  projectTriggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      openProjectModal(trigger.dataset.projectTrigger, trigger);
    });
  });

  if (projectCarousel) {
    projectCarousel.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-project-trigger]");
      if (!trigger) return;
      openProjectModal(trigger.dataset.projectTrigger, trigger);
    });
  }

  projectModalCloseButtons.forEach((button) => {
    button.addEventListener("click", closeProjectModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && projectModal.classList.contains("is-open")) {
      closeProjectModal();
    }

    keepProjectModalFocus(event);
  });
}
