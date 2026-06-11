(function () {
  const config = window.KEDIAMANKU_SUPABASE || {};
  const serviceNames = ["Kitchen Set", "Lemari Custom", "Kamar Interior", "Kamar Anak", "General Consultation"];
  const whatsappNumber = window.KEDIAMANKU_WHATSAPP || "6281234567890";
  const fallbackOrigin = "https://kediamanku.id";
  let lastLeadTrigger = null;
  let formStartedAt = "";

  function hasSupabaseLeadConfig() {
    return Boolean(
      config.restUrl &&
        config.anonKey &&
        !String(config.anonKey).includes("PASTE_SUPABASE_ANON_PUBLIC_KEY_HERE")
    );
  }

  function siteOrigin() {
    return /^https?:\/\//i.test(window.location.origin) ? window.location.origin : fallbackOrigin;
  }

  function cleanText(value, fallback = "") {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim() || fallback;
  }

  function currentContext() {
    const heading = document.querySelector("h1");
    const title = cleanText(
      document.body.dataset.prefillTitle ||
        heading?.textContent ||
        document.title.replace(/\|.*$/, ""),
      "Kediamanku project"
    );
    const path = window.location.pathname;
    const service = serviceNames.find((name) => new RegExp(name.replace(/\s+/g, "[-\\s]+"), "i").test(title + " " + path)) || "General Consultation";
    const type = path.includes("/katalog") ? "product" : path.includes("/projects") ? "project" : path.includes("/services") ? "service" : "page";
    return { title, service, type };
  }

  function whatsappUrl(context = currentContext()) {
    const message = [
      "Halo Kediamanku, saya ingin konsultasi interior.",
      `Kebutuhan: ${context.service}`,
      context.title ? `Referensi: ${context.title}` : "",
      `Halaman: ${siteOrigin()}${window.location.pathname}`,
    ].filter(Boolean).join("\n");
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
  }

  function rootLink(path) {
    if (/^https?:\/\//i.test(window.location.origin)) return path;
    const parts = window.location.pathname.split("/").filter(Boolean);
    const repoIndex = parts.findIndex((part) => part.toLowerCase() === "kediamanku");
    const localParts = repoIndex >= 0 ? parts.slice(repoIndex + 1) : parts;
    const depth = Math.max(0, localParts.length - 1);
    const prefix = depth > 0 ? "../".repeat(depth) : "";
    return `${prefix}${path.replace(/^\/+/, "") || "index.html"}`;
  }

  function setStatus(message, type = "") {
    const status = document.querySelector("[data-global-lead-status]") || document.querySelector("[data-lead-status]");
    if (!status) return;
    status.textContent = message || "";
    status.classList.toggle("is-error", type === "error");
    status.classList.toggle("is-success", type === "success");
  }

  function ensureModal() {
    let modal = document.querySelector("[data-lead-modal]");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.className = "global-lead-modal";
    modal.setAttribute("aria-hidden", "true");
    modal.dataset.leadModal = "";
    modal.innerHTML = `
      <button class="global-lead-modal-backdrop" type="button" aria-label="Close consultation form" data-close-lead-modal></button>
      <article class="global-lead-panel" role="dialog" aria-modal="true" aria-labelledby="global-lead-title" aria-describedby="global-lead-copy">
        <button class="global-lead-close" type="button" aria-label="Close consultation form" data-close-lead-modal>&times;</button>
        <div class="global-lead-grid">
          <div class="global-lead-copy">
            <span>Start Your Interior Project</span>
            <h2 id="global-lead-title">Tell us about your home.</h2>
            <p id="global-lead-copy">Share your room, service needs, and contact details. Kediamanku will review your inquiry and guide the next step.</p>
          </div>
          <form class="global-lead-form" data-lead-form>
            <label class="global-honeypot">Website<input name="website" tabindex="-1" autocomplete="off"></label>
            <input type="hidden" name="form_started_at" data-form-started-at>
            <input type="hidden" name="source_context" data-source-context>
            <div class="global-lead-form-row">
              <label><span>Name</span><input name="name" placeholder="Your name" maxlength="140" required></label>
              <label><span>Phone / WhatsApp</span><input name="phone" placeholder="+62..." maxlength="80" required></label>
            </div>
            <div class="global-lead-form-row">
              <label><span>Email</span><input name="email" type="email" placeholder="Optional email" maxlength="160"></label>
              <label><span>Service</span><select name="service_interest" required>${serviceNames.map((item) => `<option>${item}</option>`).join("")}</select></label>
            </div>
            <label><span>Message</span><textarea name="message" placeholder="Tell us about your room" maxlength="1600" required></textarea></label>
            <div class="global-lead-actions">
              <button type="submit">Book Consultation <span aria-hidden="true">&rarr;</span></button>
              <a href="${rootLink("/projects/")}" data-projects-link>View Projects</a>
              <p class="global-lead-status" data-global-lead-status role="status"></p>
            </div>
          </form>
        </div>
      </article>
    `;
    document.body.append(modal);
    return modal;
  }

  function markStarted(modal) {
    formStartedAt = new Date().toISOString();
    const input = modal.querySelector("[data-form-started-at]");
    if (input) input.value = formStartedAt;
  }

  function prefillModal(modal, trigger) {
    const context = currentContext();
    const requestedService = trigger?.dataset?.service || trigger?.dataset?.prefillService || context.service;
    const subject = trigger?.dataset?.prefillTitle || context.title;
    const serviceSelect = modal.querySelector('[name="service_interest"]');
    const message = modal.querySelector('[name="message"]');
    const source = modal.querySelector("[data-source-context]");

    if (serviceSelect && requestedService) {
      const option = [...serviceSelect.options].find((item) => item.value === requestedService);
      serviceSelect.value = option ? requestedService : "General Consultation";
    }

    if (message && !message.value.trim()) {
      const lead = context.type === "product"
        ? `Saya tertarik dengan produk ${subject}.`
        : context.type === "project"
          ? `Saya ingin membuat desain serupa dengan project ${subject}.`
          : context.type === "service"
            ? `Saya ingin konsultasi layanan ${requestedService}.`
            : "Saya ingin konsultasi interior untuk rumah saya.";
      message.value = `${lead} Mohon dibantu untuk estimasi dan langkah berikutnya.`;
    }

    if (source) source.value = `${context.type}:${subject}`.slice(0, 160);
  }

  function openLeadModal(trigger) {
    const modal = ensureModal();
    lastLeadTrigger = trigger || document.activeElement;
    markStarted(modal);
    prefillModal(modal, trigger);
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("lead-modal-open");
    setStatus("");
    window.setTimeout(() => modal.querySelector('input[name="name"]')?.focus(), 160);
  }

  function closeLeadModal() {
    const modal = document.querySelector("[data-lead-modal]");
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("lead-modal-open");
    lastLeadTrigger?.focus?.({ preventScroll: true });
  }

  async function submitLead(form) {
    if (!hasSupabaseLeadConfig()) {
      setStatus("Supabase belum siap. Silakan hubungi Kediamanku lewat WhatsApp.", "error");
      return;
    }

    const formData = new FormData(form);
    const startedAt = formData.get("form_started_at") || formStartedAt;
    const honeypot = cleanText(formData.get("website"));

    if (honeypot) {
      setStatus("Thank you. Your inquiry has been received.", "success");
      window.setTimeout(closeLeadModal, 900);
      return;
    }

    if (!startedAt || Date.now() - Date.parse(startedAt) < 3000) {
      setStatus("Please wait a moment before submitting.", "error");
      return;
    }

    const context = currentContext();
    const payload = {
      name: cleanText(formData.get("name")).slice(0, 140),
      phone: cleanText(formData.get("phone")).slice(0, 80),
      email: cleanText(formData.get("email")).slice(0, 160) || null,
      service_interest: formData.get("service_interest") || context.service,
      message: cleanText(formData.get("message")).slice(0, 1600),
      source: cleanText(formData.get("source_context"), context.type).slice(0, 80),
      website: honeypot,
      form_started_at: startedAt,
      user_agent: navigator.userAgent.slice(0, 240),
    };

    try {
      setStatus("Sending your project inquiry...");
      const response = await fetch(`${config.restUrl}/leads`, {
        method: "POST",
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`Lead request failed: ${response.status}`);
      form.reset();
      markStarted(document.querySelector("[data-lead-modal]"));
      setStatus("Thank you. Your inquiry has been saved.", "success");
      window.setTimeout(closeLeadModal, 1200);
    } catch (error) {
      console.warn(error);
      setStatus("Inquiry could not be saved yet. Please try again or use WhatsApp.", "error");
    }
  }

  function wireConsultationTriggers() {
    document.addEventListener("click", (event) => {
      const close = event.target.closest("[data-close-lead-modal]");
      if (close) {
        event.preventDefault();
        closeLeadModal();
        return;
      }

      const trigger = event.target.closest(
        "[data-open-lead-modal], [data-book-consultation], a[href$='#contact'], a[href='#contact'], a[href*='index.html#contact']"
      );
      if (!trigger) return;

      event.preventDefault();
      if (window.history?.replaceState) window.history.replaceState(null, "", "#contact");
      openLeadModal(trigger);
    });

    document.addEventListener("submit", (event) => {
      const form = event.target.closest("[data-lead-form]");
      if (!form) return;
      if (!form.classList.contains("global-lead-form")) return;
      event.preventDefault();
      submitLead(form);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && document.querySelector("[data-lead-modal].is-open")) {
        closeLeadModal();
      }
    });

    if (window.location.hash === "#contact") {
      window.setTimeout(() => openLeadModal(), 480);
    }
  }

  function createStickyCtas() {
    if (document.querySelector(".global-whatsapp")) return;

    const whatsApp = document.createElement("a");
    whatsApp.className = "global-whatsapp";
    whatsApp.href = whatsappUrl();
    whatsApp.target = "_blank";
    whatsApp.rel = "noopener";
    whatsApp.setAttribute("aria-label", "Chat with Kediamanku on WhatsApp");
    whatsApp.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0 11.9 11.9 0 0 0 1.8 17.9L0 24l6.3-1.7a11.8 11.8 0 0 0 5.8 1.5h.1A11.9 11.9 0 0 0 20.5 3.5Zm-8.3 18.3h-.1a9.8 9.8 0 0 1-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.9 9.9 0 1 1 12.2 21.8Zm5.4-7.4c-.3-.2-1.8-.9-2-.9-.3-.1-.5-.2-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.2-.4-2.3-1.4-.8-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.5-.6c.2-.2.2-.3.3-.5.1-.2.1-.4 0-.6 0-.2-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9s1.2 3.3 1.4 3.5c.2.2 2.4 3.7 5.8 5.1.8.3 1.4.5 1.9.7.8.3 1.6.2 2.2.1.7-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4Z"/></svg>
      WhatsApp
    `;

    const mobile = document.createElement("div");
    mobile.className = "global-mobile-cta";
    mobile.innerHTML = `
      <a href="${whatsappUrl()}" target="_blank" rel="noopener">WhatsApp</a>
    `;

    document.body.append(whatsApp, mobile);
    const toggle = () => {
      const visible = window.scrollY > 320;
      whatsApp.classList.toggle("is-visible", visible);
      mobile.classList.toggle("is-visible", visible);
      whatsApp.href = whatsappUrl();
      mobile.querySelector("a").href = whatsappUrl();
    };
    toggle();
    window.addEventListener("scroll", toggle, { passive: true });
  }

  function createGlobalMobileMenu() {
    if (document.querySelector("[data-menu-toggle]") || document.querySelector(".global-menu-toggle")) return;

    const navHeader = document.querySelector(".about-nav, .projects-nav, .catalog-nav, .services-nav, .page-nav");
    if (!navHeader) return;

    const menu = document.createElement("div");
    menu.className = "global-mobile-menu";
    menu.setAttribute("aria-hidden", "true");
    menu.innerHTML = `
      <div class="global-mobile-menu-inner">
        <a href="${rootLink("/index.html#home")}">Home</a>
        <a href="${rootLink("/services/")}">Services</a>
        <a href="${rootLink("/about/")}">About</a>
        <a href="${rootLink("/projects/")}">Projects</a>
        <a href="${rootLink("/katalog/")}">Katalog</a>
        <a href="#contact">Contact</a>
        <a class="global-mobile-menu-cta" href="#contact">Start Your Interior Project</a>
      </div>
    `;

    const toggle = document.createElement("button");
    toggle.className = "global-menu-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-label", "Open menu");
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = "<span></span><span></span>";

    const cta = navHeader.querySelector(".nav-cta");
    if (cta) navHeader.insertBefore(toggle, cta);
    else navHeader.append(toggle);
    document.body.append(menu);

    const closeMenu = () => {
      toggle.classList.remove("is-open");
      menu.classList.remove("is-open");
      menu.setAttribute("aria-hidden", "true");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
      document.body.classList.remove("menu-open");
    };

    toggle.addEventListener("click", () => {
      const isOpen = toggle.classList.toggle("is-open");
      menu.classList.toggle("is-open", isOpen);
      menu.setAttribute("aria-hidden", String(!isOpen));
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
      document.body.classList.toggle("menu-open", isOpen);
    });

    menu.addEventListener("click", (event) => {
      if (event.target.closest("a")) closeMenu();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  }

  function normalizeSeoDefaults() {
    const canonical = document.querySelector('link[rel="canonical"]') || document.createElement("link");
    if (!canonical.parentNode) {
      canonical.rel = "canonical";
      canonical.href = `${siteOrigin()}${window.location.pathname}`;
      document.head.append(canonical);
    }

    document.querySelectorAll("img:not([alt])").forEach((image) => {
      image.alt = "Kediamanku premium custom interior";
    });
  }

  function setJsonLd(id, data) {
    let script = document.head.querySelector(`script[type="application/ld+json"][data-site-schema="${id}"]`);
    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.siteSchema = id;
      document.head.append(script);
    }
    script.textContent = JSON.stringify(data);
  }

  function injectGlobalSchemas() {
    const title = cleanText(document.querySelector("h1")?.textContent || document.title, "Kediamanku");
    const currentUrl = `${siteOrigin()}${window.location.pathname}`;

    setJsonLd("organization", {
      "@context": "https://schema.org",
      "@type": ["Organization", "LocalBusiness"],
      name: "Kediamanku",
      url: siteOrigin(),
      logo: `${siteOrigin()}/assets/images/logo-kediamanku-transparent.png`,
      image: `${siteOrigin()}/assets/images/hero-kitchen-living.webp`,
      description: "Premium design and build interior company for kitchen sets, custom wardrobes, bedroom interiors, and kids rooms.",
      areaServed: "Indonesia",
      priceRange: "$$$",
      sameAs: [],
    });

    setJsonLd("breadcrumb", {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: siteOrigin(),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: title,
          item: currentUrl,
        },
      ],
    });

    const faqItems = [...document.querySelectorAll("[data-faq-item], .faq-item")];
    const faqEntities = faqItems.map((item) => {
      const question = cleanText(item.querySelector("button, h3, h2")?.textContent).replace(/\+$/, "").trim();
      const answer = cleanText(item.querySelector("[data-faq-panel], .faq-panel, p")?.textContent);
      if (!question || !answer) return null;
      return {
        "@type": "Question",
        name: question,
        acceptedAnswer: {
          "@type": "Answer",
          text: answer,
        },
      };
    }).filter(Boolean);

    if (faqEntities.length) {
      setJsonLd("faq", {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqEntities,
      });
    }

    if (window.location.pathname.includes("/services/")) {
      const context = currentContext();
      const description = cleanText(
        document.querySelector('meta[name="description"]')?.getAttribute("content") ||
          document.querySelector("main p")?.textContent,
        "Premium custom interior design and build service by Kediamanku."
      );
      setJsonLd("service", {
        "@context": "https://schema.org",
        "@type": "Service",
        name: context.service === "General Consultation" ? title : context.service,
        description,
        provider: {
          "@type": "LocalBusiness",
          name: "Kediamanku",
          url: siteOrigin(),
        },
        areaServed: "Indonesia",
        serviceType: "Interior Design and Build",
      });
    }
  }

  function init() {
    ensureModal();
    createGlobalMobileMenu();
    wireConsultationTriggers();
    createStickyCtas();
    normalizeSeoDefaults();
    injectGlobalSchemas();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
