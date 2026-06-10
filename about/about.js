const revealItems = document.querySelectorAll("[data-reveal], [data-stagger]");
const statSection = document.querySelector("[data-stats]");
const statNumbers = document.querySelectorAll("[data-count]");
const parallaxImages = document.querySelectorAll("[data-parallax]");
const teamGrid = document.querySelector("[data-team-grid]");
const leadModal = document.querySelector("[data-lead-modal]");
const openLeadModalButtons = document.querySelectorAll("[data-open-lead-modal]");
const closeLeadModalButtons = document.querySelectorAll("[data-close-lead-modal]");
const leadForm = document.querySelector("[data-lead-form]");
const leadStatus = document.querySelector("[data-lead-status]");
const leadStartedInput = document.querySelector("[data-form-started-at]");
const supabaseConfig = window.KEDIAMANKU_SUPABASE || {};
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let lastLeadTrigger = null;
let leadFormStartedAt = "";

function revealElement(element) {
  element.classList.add("is-visible");
}

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
      service_interest: formData.get("service_interest"),
      message: String(formData.get("message") || "").trim(),
      source: "about-page",
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
  const link = event.target.closest('a[href="#contact"]');
  if (!link || !leadModal) return;

  event.preventDefault();
  history.replaceState(null, "", "#contact");
  document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => openLeadModal(link), 260);
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

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          revealElement(entry.target);
          revealObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.16,
      rootMargin: "0px 0px -8% 0px",
    }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach(revealElement);
}

function animateCount(element) {
  const target = Number(element.dataset.count || 0);
  const duration = 1300;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = Math.round(target * eased).toLocaleString("en-US");

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);
}

if (statSection && statNumbers.length) {
  if (reduceMotion || !("IntersectionObserver" in window)) {
    statNumbers.forEach((number) => {
      number.textContent = Number(number.dataset.count || 0).toLocaleString("en-US");
    });
  } else {
    const statObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            statNumbers.forEach(animateCount);
            statObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.45 }
    );

    statObserver.observe(statSection);
  }
}

function updateParallax() {
  if (reduceMotion || !parallaxImages.length || window.innerWidth < 900) return;

  parallaxImages.forEach((wrap) => {
    const image = wrap.querySelector("img");
    if (!image) return;

    const rect = wrap.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    const viewportCenter = window.innerHeight / 2;
    const strength = Number(wrap.dataset.parallax || 8);
    const offset = ((center - viewportCenter) / window.innerHeight) * strength;

    image.style.transform = `translateY(${offset.toFixed(2)}px) scale(1.035)`;
  });
}

if (parallaxImages.length && !reduceMotion) {
  updateParallax();
  window.addEventListener("scroll", updateParallax, { passive: true });
  window.addEventListener("resize", updateParallax);
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function isConfigured() {
  return Boolean(
    supabaseConfig.restUrl &&
    supabaseConfig.anonKey &&
    !supabaseConfig.anonKey.includes("PASTE_SUPABASE_ANON_PUBLIC_KEY_HERE")
  );
}

function resolveImageUrl(value) {
  const url = String(value || "").trim();
  if (!url || /^(javascript|data|vbscript):/i.test(url)) {
    return "../assets/images/logo-kediamanku-transparent.png";
  }

  if (/^https?:\/\//i.test(url) || url.startsWith("../") || url.startsWith("./") || url.startsWith("/")) {
    return url;
  }

  return `../${url.replace(/^\/+/, "")}`;
}

function renderTeamMessage(message) {
  if (!teamGrid) return;
  teamGrid.replaceChildren();
  teamGrid.append(createElement("p", "team-empty", message));
}

function renderTeamMembers(members) {
  if (!teamGrid) return;

  if (!members.length) {
    renderTeamMessage("Team members will appear here after they are added from the admin dashboard.");
    return;
  }

  teamGrid.replaceChildren();
  members.forEach((member) => {
    const card = createElement("article", "team-card");
    const image = document.createElement("img");
    image.src = resolveImageUrl(member.image_url);
    image.alt = member.image_alt || `Portrait of ${member.name} from Kediamanku`;
    image.width = 640;
    image.height = 820;
    image.loading = "lazy";
    image.addEventListener("error", () => {
      image.src = "../assets/images/logo-kediamanku-transparent.png";
    }, { once: true });

    const copy = document.createElement("div");
    copy.append(createElement("span", "", member.role || "Kediamanku Team"));
    copy.append(createElement("h3", "", member.name || "Team Member"));
    copy.append(createElement("p", "", member.bio || "Part of the Kediamanku design and build team."));

    card.append(image, copy);
    teamGrid.append(card);
  });
}

async function loadTeamMembers() {
  if (!teamGrid) return;
  if (!isConfigured()) {
    renderTeamMessage("Team data is ready to connect after Supabase configuration is active.");
    return;
  }

  try {
    const endpoint = `${supabaseConfig.restUrl}/team_members?select=slug,name,role,bio,image_url,image_alt,sort_order,created_at&is_published=eq.true&order=sort_order.asc,created_at.asc`;
    const response = await fetch(endpoint, {
      headers: {
        apikey: supabaseConfig.anonKey,
        Authorization: `Bearer ${supabaseConfig.anonKey}`,
      },
    });

    if (!response.ok) {
      throw new Error("Team data could not be loaded yet.");
    }

    const members = await response.json();
    renderTeamMembers(Array.isArray(members) ? members : []);
  } catch (error) {
    renderTeamMessage(error.message);
  }
}

loadTeamMembers();
