(function () {
  const config = window.KEDIAMANKU_SUPABASE || {};
  const form = document.querySelector("[data-project-form]");

  if (!form || !window.supabase || !config.restUrl || !config.anonKey) return;

  const client = window.supabase.createClient(
    config.restUrl.replace("/rest/v1", ""),
    config.anonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: "kediamanku-admin-auth",
      },
    }
  );

  let pendingProjectTestimonial = null;

  function cleanText(value, maxLength = 800) {
    return String(value || "")
      .replace(/[\u0000-\u001F\u007F]/g, "")
      .trim()
      .slice(0, maxLength);
  }

  function cleanUrl(value) {
    const text = cleanText(value, 800);
    if (!text) return null;
    if (/^(javascript|data|vbscript):/i.test(text)) return null;
    return text;
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 90);
  }

  function uniqueSlug(base) {
    const suffix = Date.now().toString(36).slice(-5);
    return `${slugify(base)}-${suffix}`;
  }

  function payloadFromForm(currentForm) {
    const data = Object.fromEntries(new FormData(currentForm).entries());
    const payload = {
      testimonial_metric: cleanText(data.testimonial_metric, 24) || null,
      testimonial_metric_label: cleanText(data.testimonial_metric_label, 120) || null,
      testimonial_quote: cleanText(data.testimonial_quote, 700) || null,
      testimonial_client_name: cleanText(data.testimonial_client_name, 140) || null,
      testimonial_client_role: cleanText(data.testimonial_client_role, 160) || null,
      testimonial_image_url: cleanUrl(data.testimonial_image_url),
    };

    const hasValue = Object.values(payload).some(Boolean);
    return hasValue ? payload : null;
  }

  async function updateProjectTestimonial(pending, attempt = 0) {
    const query = pending.id
      ? client.from("projects").update(pending.payload).eq("id", pending.id)
      : client.from("projects").update(pending.payload).eq("slug", pending.slug);

    const { error } = await query;
    if (!error) return;

    if (attempt < 5) {
      window.setTimeout(() => updateProjectTestimonial(pending, attempt + 1), 900);
    } else {
      console.warn("Project testimonial fields could not be saved:", error);
    }
  }

  form.addEventListener(
    "submit",
    () => {
      const payload = payloadFromForm(form);
      if (!payload) {
        pendingProjectTestimonial = null;
        return;
      }

      const id = form.dataset.editId || "";
      let slug = form.dataset.editSlug || "";
      if (!id && !slug) {
        slug = uniqueSlug(new FormData(form).get("title"));
        form.dataset.editSlug = slug;
      }

      pendingProjectTestimonial = { id, slug, payload };
    },
    true
  );

  form.addEventListener("submit", () => {
    if (!pendingProjectTestimonial) return;
    const pending = pendingProjectTestimonial;
    window.setTimeout(() => updateProjectTestimonial(pending), 1400);
  });
})();
