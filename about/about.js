const revealItems = document.querySelectorAll("[data-reveal], [data-stagger]");
const statSection = document.querySelector("[data-stats]");
const statNumbers = document.querySelectorAll("[data-count]");
const parallaxImages = document.querySelectorAll("[data-parallax]");
const teamGrid = document.querySelector("[data-team-grid]");
const supabaseConfig = window.KEDIAMANKU_SUPABASE || {};
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function revealElement(element) {
  element.classList.add("is-visible");
}

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
