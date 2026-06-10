const config = window.KEDIAMANKU_SUPABASE || {};
const isConfigured = Boolean(
  config.url &&
    config.anonKey &&
    !config.anonKey.includes("PASTE_SUPABASE_ANON_PUBLIC_KEY_HERE")
);

const supabaseAuthOptions = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: "kediamanku-admin-auth",
  },
};

const supabaseClient = isConfigured && window.supabase
  ? window.supabase.createClient(config.url, config.anonKey, supabaseAuthOptions)
  : null;

const STORAGE_BUCKET = "kediamanku-images";
const authCard = document.querySelector("[data-auth-card]");
const dashboard = document.querySelector("[data-dashboard]");
const configWarning = document.querySelector("[data-config-warning]");
const loginForm = document.querySelector("[data-login-form]");
const loginStatus = document.querySelector("[data-login-status]");
const globalStatus = document.querySelector("[data-global-status]");
const logoutButton = document.querySelector("[data-logout]");
const postList = document.querySelector("[data-post-list]");
const blogForm = document.querySelector("[data-blog-form]");
const editorTitle = document.querySelector("[data-editor-title]");
const searchInput = document.querySelector("[data-search]");
const statusFilter = document.querySelector("[data-status-filter]");
const categoryFilter = document.querySelector("[data-category-filter]");
const newButton = document.querySelector("[data-new-post]");
const resetButton = document.querySelector("[data-reset-form]");
const previewButton = document.querySelector("[data-preview]");
const previewModal = document.querySelector("[data-preview-modal]");
const previewTitle = document.querySelector("[data-preview-title]");
const previewCategory = document.querySelector("[data-preview-category]");
const previewExcerpt = document.querySelector("[data-preview-excerpt]");
const previewContent = document.querySelector("[data-preview-content]");

let posts = [];
let routeModeApplied = false;

function setStatus(element, message, type = "") {
  if (!element) return;
  element.textContent = message || "";
  element.classList.toggle("is-error", type === "error");
  element.classList.toggle("is-success", type === "success");
}

function adminAccessMessage(session) {
  const userId = session?.user?.id || "PASTE_AUTH_USER_ID_HERE";
  const email = session?.user?.email || "admin@kediamanku.com";
  return [
    "Login berhasil, tapi akun ini belum terdaftar sebagai admin di Supabase project yang aktif.",
    "Buka Supabase SQL Editor lalu jalankan:",
    `insert into public.admin_users (user_id, email) values ('${userId}', '${email}') on conflict (user_id) do update set email = excluded.email;`,
  ].join(" ");
}

function formatSupabaseError(error) {
  const message = error?.message || "Supabase request failed.";
  if (/timed out/i.test(message)) {
    return "Login terlalu lama merespons. Cek koneksi internet, anon key Supabase, dan pastikan Supabase Auth project aktif.";
  }
  if (/row-level security/i.test(message)) {
    return "Akses ditolak oleh Row Level Security. Pastikan akun login sudah masuk tabel public.admin_users di Supabase project yang aktif.";
  }
  if (/could not find the function public\.is_admin|function .*is_admin/i.test(message)) {
    return "SQL admin backend belum lengkap. Jalankan supabase/admin-backend.sql di Supabase SQL Editor.";
  }
  return message;
}

function withTimeout(promise, timeoutMs, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
    }),
  ]);
}

function cleanText(value, maxLength = 3000) {
  return String(value || "")
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

function cleanUrl(value) {
  const text = cleanText(value, 900);
  if (!text) return null;
  if (/^(javascript|data|vbscript):/i.test(text)) {
    throw new Error("URL tidak aman. Gunakan path lokal, http, atau https.");
  }
  return text;
}

function nullable(value, maxLength = 3000) {
  const text = cleanText(value, maxLength);
  return text || null;
}

function requireText(value, label, maxLength = 3000) {
  const text = cleanText(value, maxLength);
  if (!text) throw new Error(`${label} wajib diisi.`);
  return text;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function uniqueSlug(base) {
  return `${slugify(base)}-${Date.now().toString(36).slice(-5)}`;
}

function numberOrDefault(value, fallback = 4) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isSafeUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function formPayload(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function fileExtension(file) {
  const namePart = file.name.split(".").pop();
  if (namePart && namePart.length <= 5) return namePart.toLowerCase();
  return { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" }[file.type] || "webp";
}

async function uploadFeaturedImage(form, title) {
  const file = form.querySelector('[name="featured_file"]')?.files?.[0];
  if (!file) return null;
  if (!file.type.startsWith("image/")) throw new Error("Featured image harus berupa gambar.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Ukuran featured image maksimal 5MB.");

  const path = `blog/${slugify(title)}-${Date.now()}.${fileExtension(file)}`;
  const { error } = await supabaseClient.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { cacheControl: "31536000", upsert: false });

  if (error) {
    if (error.message?.toLowerCase().includes("bucket not found")) {
      throw new Error(`Storage bucket '${STORAGE_BUCKET}' belum dibuat. Jalankan Supabase SQL setup lebih dulu.`);
    }
    throw error;
  }

  const { data } = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function storagePathFromPublicUrl(value) {
  const url = cleanText(value, 1200);
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) return null;
    return decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}

async function removeOldImage(previousUrl, nextUrl) {
  const oldPath = storagePathFromPublicUrl(previousUrl);
  const nextPath = storagePathFromPublicUrl(nextUrl);
  if (!oldPath || oldPath === nextPath) return;
  await supabaseClient.storage.from(STORAGE_BUCKET).remove([oldPath]);
}

function parseTags(value) {
  return String(value || "")
    .split(",")
    .map((tag) => cleanText(tag, 48))
    .filter(Boolean)
    .slice(0, 12);
}

function parseContentBlocks(value) {
  return String(value || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^([a-z0-9-]+)\s*:\s*(.*)$/i);
      const type = match ? match[1].toLowerCase() : "p";
      const body = match ? match[2] : line;

      if (type === "h2" || type === "h3") return { type, text: cleanText(body, 220) };
      if (type === "quote") return { type: "quote", text: cleanText(body, 700) };
      if (type === "list" || type === "ordered-list") {
        return {
          type,
          items: body.split("|").map((item) => cleanText(item, 220)).filter(Boolean).slice(0, 12),
        };
      }
      if (type === "image") {
        const [url, alt] = body.split("|").map((item) => cleanText(item, 900));
        return { type: "image", url: cleanUrl(url), alt: alt || "Kediamanku blog article image" };
      }
      return { type: "paragraph", text: cleanText(body, 1400) };
    })
    .filter((block) => block.text || block.url || block.items?.length);
}

function blocksToEditorText(blocks) {
  if (!Array.isArray(blocks)) return "";
  return blocks.map((block) => {
    if (block.type === "h2" || block.type === "h3") return `${block.type}: ${block.text || ""}`;
    if (block.type === "quote") return `quote: ${block.text || ""}`;
    if (block.type === "list" || block.type === "ordered-list") return `${block.type}: ${(block.items || []).join(" | ")}`;
    if (block.type === "image") return `image: ${block.url || ""} | ${block.alt || ""}`;
    return `p: ${block.text || ""}`;
  }).join("\n");
}

function setField(name, value) {
  const field = blogForm.querySelector(`[name="${name}"]`);
  if (!field || field.type === "file") return;
  field.value = value ?? "";
}

function resetForm() {
  blogForm.reset();
  delete blogForm.dataset.editId;
  delete blogForm.dataset.previousImage;
  editorTitle.textContent = "Create Article";
  setField("author_name", "Kediamanku Editorial Team");
  setField("author_role", "Interior Design & Build");
  setField("read_time_minutes", 4);
}

function populateForm(post) {
  blogForm.dataset.editId = post.id;
  blogForm.dataset.previousImage = post.featured_image || "";
  editorTitle.textContent = "Edit Article";
  setField("title", post.title);
  setField("slug", post.slug);
  setField("excerpt", post.excerpt);
  setField("category", post.category);
  setField("tags", Array.isArray(post.tags) ? post.tags.join(", ") : "");
  setField("author_name", post.author_name || "Kediamanku Editorial Team");
  setField("author_role", post.author_role || "Interior Design & Build");
  setField("author_avatar", post.author_avatar);
  setField("featured_image", post.featured_image);
  setField("read_time_minutes", post.read_time_minutes || 4);
  setField("content_blocks", blocksToEditorText(post.content));
  setField("seo_title", post.seo_title);
  setField("seo_description", post.seo_description);
  setField("seo_keywords", Array.isArray(post.seo_keywords) ? post.seo_keywords.join(", ") : "");
  blogForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function requireSession() {
  if (!supabaseClient) return null;
  const { data } = await withTimeout(supabaseClient.auth.getSession(), 8000, "Session check");
  return data.session;
}

function showDashboard(isLoggedIn) {
  authCard.hidden = isLoggedIn;
  dashboard.hidden = !isLoggedIn;
}

async function checkAdminAccess(session) {
  if (!supabaseClient || !session) return false;

  const { data, error } = await withTimeout(supabaseClient.rpc("is_admin"), 8000, "Admin access check");
  if (error) {
    setStatus(loginStatus, formatSupabaseError(error), "error");
    return false;
  }

  if (data !== true) {
    setStatus(loginStatus, adminAccessMessage(session), "error");
    return false;
  }

  return true;
}

async function refreshSessionView() {
  try {
    const session = await requireSession();
    const hasAdminAccess = await checkAdminAccess(session);
    showDashboard(Boolean(session && hasAdminAccess));
    if (session && hasAdminAccess) await loadPosts();
  } catch (error) {
    showDashboard(false);
    setStatus(loginStatus, formatSupabaseError(error), "error");
  }
}

function currentEditorPayload(status) {
  const data = formPayload(blogForm);
  const title = requireText(data.title, "Title", 180);
  const blocks = parseContentBlocks(data.content_blocks);
  if (!blocks.length) throw new Error("Article content wajib diisi.");

  return {
    title,
    slug: slugify(data.slug) || uniqueSlug(title),
    excerpt: requireText(data.excerpt, "Excerpt", 420),
    content: blocks,
    featured_image: null,
    author_name: nullable(data.author_name, 140) || "Kediamanku Editorial Team",
    author_role: nullable(data.author_role, 140) || "Interior Design & Build",
    author_avatar: cleanUrl(data.author_avatar),
    category: requireText(data.category, "Category", 80),
    tags: parseTags(data.tags),
    status,
    seo_title: nullable(data.seo_title, 180),
    seo_description: nullable(data.seo_description, 220),
    seo_keywords: parseTags(data.seo_keywords),
    read_time_minutes: Math.min(60, Math.max(1, numberOrDefault(data.read_time_minutes, 4))),
    published_at: status === "published" ? new Date().toISOString() : null,
  };
}

async function savePost(status) {
  if (!supabaseClient) return;
  const editId = blogForm.dataset.editId;
  if (editId && !isSafeUuid(editId)) throw new Error("Post id tidak valid.");

  setStatus(globalStatus, status === "published" ? "Publishing article..." : "Saving draft...");
  const payload = currentEditorPayload(status);
  const uploadedImage = await uploadFeaturedImage(blogForm, payload.title);
  payload.featured_image = uploadedImage || cleanUrl(formPayload(blogForm).featured_image) || blogForm.dataset.previousImage || null;

  if (editId) {
    const { error } = await supabaseClient.from("blog_posts").update(payload).eq("id", editId);
    if (error) throw error;
    await removeOldImage(blogForm.dataset.previousImage, payload.featured_image);
  } else {
    const { data, error } = await supabaseClient.from("blog_posts").insert(payload).select("id").single();
    if (error) throw error;
    blogForm.dataset.editId = data.id;
    blogForm.dataset.previousImage = payload.featured_image || "";
  }

  setStatus(globalStatus, status === "published" ? "Article published." : "Draft saved.", "success");
  await loadPosts();
}

function renderPreviewFromPayload() {
  const payload = currentEditorPayload("draft");
  previewCategory.textContent = payload.category;
  previewTitle.textContent = payload.title;
  previewExcerpt.textContent = payload.excerpt;
  previewContent.replaceChildren();
  payload.content.forEach((block) => previewContent.append(renderPreviewBlock(block)));
  previewModal.classList.add("is-open");
  previewModal.setAttribute("aria-hidden", "false");
}

function renderPreviewBlock(block) {
  if (block.type === "h2" || block.type === "h3") return createElement(block.type, "", block.text);
  if (block.type === "quote") return createElement("blockquote", "", block.text);
  if (block.type === "list" || block.type === "ordered-list") {
    const list = document.createElement(block.type === "ordered-list" ? "ol" : "ul");
    (block.items || []).forEach((item) => list.append(createElement("li", "", item)));
    return list;
  }
  if (block.type === "image") {
    const image = document.createElement("img");
    image.src = block.url;
    image.alt = block.alt || "";
    return image;
  }
  return createElement("p", "", block.text);
}

function closePreview() {
  previewModal.classList.remove("is-open");
  previewModal.setAttribute("aria-hidden", "true");
}

function filteredPosts() {
  const query = cleanText(searchInput.value).toLowerCase();
  const status = statusFilter.value;
  const category = cleanText(categoryFilter.value).toLowerCase();
  return posts.filter((post) => {
    const haystack = `${post.title} ${post.excerpt || ""} ${post.category} ${(post.tags || []).join(" ")}`.toLowerCase();
    return (!query || haystack.includes(query)) &&
      (status === "all" || post.status === status) &&
      (!category || post.category.toLowerCase().includes(category));
  });
}

function renderPostList() {
  const rows = filteredPosts();
  postList.replaceChildren();
  if (!rows.length) {
    const row = document.createElement("tr");
    const cell = createElement("td", "", "No articles found.");
    cell.colSpan = 4;
    row.append(cell);
    postList.append(row);
    return;
  }

  rows.forEach((post) => {
    const row = document.createElement("tr");
    const article = document.createElement("td");
    article.append(createElement("strong", "", post.title));
    article.append(createElement("span", "", `${post.category} / ${post.slug}`));

    const statusCell = document.createElement("td");
    const statusPill = createElement("span", `status-pill ${post.status === "published" ? "is-published" : ""}`, post.status);
    statusCell.append(statusPill);

    const updated = createElement("td", "", new Date(post.updated_at || post.created_at).toLocaleDateString("id-ID"));
    const actionsCell = document.createElement("td");
    const actions = createElement("div", "row-actions");

    const edit = createElement("button", "", "Edit");
    edit.type = "button";
    edit.dataset.editId = post.id;

    const preview = post.status === "published"
      ? createElement("a", "", "Open")
      : createElement("button", "", "Preview");
    if (preview.tagName === "A") {
      preview.href = `../../blog/detail/index.html?slug=${encodeURIComponent(post.slug)}`;
      preview.target = "_blank";
      preview.rel = "noopener";
    } else {
      preview.type = "button";
      preview.dataset.previewId = post.id;
    }

    const remove = createElement("button", "delete", "Delete");
    remove.type = "button";
    remove.dataset.deleteId = post.id;
    remove.dataset.deleteTitle = post.title;

    actions.append(edit, preview, remove);
    actionsCell.append(actions);
    row.append(article, statusCell, updated, actionsCell);
    postList.append(row);
  });
}

async function loadPosts() {
  const { data, error } = await withTimeout(
    supabaseClient
      .from("blog_posts")
      .select("*")
      .order("updated_at", { ascending: false }),
    10000,
    "Blog posts request"
  );

  if (error) {
    const row = document.createElement("tr");
    const cell = createElement("td", "", formatSupabaseError(error));
    cell.colSpan = 4;
    row.append(cell);
    postList.replaceChildren(row);
    return;
  }

  posts = data || [];
  renderPostList();
  applyRouteMode();
}

function applyRouteMode() {
  if (routeModeApplied) return;
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const mode = params.get("mode");

  if (mode === "new") {
    resetForm();
    routeModeApplied = true;
    return;
  }

  if (id && isSafeUuid(id)) {
    const post = posts.find((item) => item.id === id);
    if (post) {
      populateForm(post);
      routeModeApplied = true;
    }
  }
}

function editPost(id) {
  const post = posts.find((item) => item.id === id);
  if (!post) return;
  populateForm(post);
  if (window.history?.pushState) {
    window.history.pushState(null, "", `index.html?id=${encodeURIComponent(id)}`);
  }
  setStatus(globalStatus, "Edit mode aktif.", "success");
}

async function deletePost(id, title) {
  if (!window.confirm(`Delete ${title}?`)) return;
  const post = posts.find((item) => item.id === id);
  const { error } = await supabaseClient.from("blog_posts").delete().eq("id", id);
  if (error) {
    setStatus(globalStatus, formatSupabaseError(error), "error");
    return;
  }
  await removeOldImage(post?.featured_image, null);
  if (blogForm.dataset.editId === id) resetForm();
  setStatus(globalStatus, "Article deleted.", "success");
  await loadPosts();
}

if (!isConfigured) {
  configWarning.hidden = false;
  loginForm.querySelectorAll("input, button").forEach((element) => element.disabled = true);
  setStatus(loginStatus, "Masukkan Supabase config dulu.", "error");
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabaseClient) return;
  setStatus(loginStatus, "Logging in...");
  const submitButton = loginForm.querySelector('button[type="submit"]');
  if (submitButton) submitButton.disabled = true;
  const data = formPayload(loginForm);
  try {
    const { error } = await withTimeout(
      supabaseClient.auth.signInWithPassword({ email: data.email, password: data.password }),
      12000,
      "Login"
    );
    if (error) {
      setStatus(loginStatus, formatSupabaseError(error), "error");
      return;
    }
    loginForm.reset();
    setStatus(loginStatus, "Login berhasil. Membuka Blog Manager...", "success");
    await refreshSessionView();
  } catch (error) {
    setStatus(loginStatus, formatSupabaseError(error), "error");
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});

logoutButton.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  showDashboard(false);
});

blogForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const action = event.submitter?.dataset.publish !== undefined ? "published" : "draft";
  try {
    await savePost(action);
  } catch (error) {
    setStatus(globalStatus, formatSupabaseError(error), "error");
  }
});

previewButton.addEventListener("click", () => {
  try {
    renderPreviewFromPayload();
  } catch (error) {
    setStatus(globalStatus, formatSupabaseError(error), "error");
  }
});

document.querySelectorAll("[data-close-preview]").forEach((button) => {
  button.addEventListener("click", closePreview);
});

newButton.addEventListener("click", () => {
  resetForm();
  if (window.history?.pushState) {
    window.history.pushState(null, "", "index.html?mode=new");
  }
  blogForm.scrollIntoView({ behavior: "smooth", block: "start" });
});
resetButton.addEventListener("click", resetForm);
[searchInput, statusFilter, categoryFilter].forEach((input) => input.addEventListener("input", renderPostList));

postList.addEventListener("click", (event) => {
  const edit = event.target.closest("[data-edit-id]");
  if (edit) {
    editPost(edit.dataset.editId);
    return;
  }

  const preview = event.target.closest("[data-preview-id]");
  if (preview) {
    const post = posts.find((item) => item.id === preview.dataset.previewId);
    if (post) {
      populateForm(post);
      renderPreviewFromPayload();
    }
    return;
  }

  const remove = event.target.closest("[data-delete-id]");
  if (remove) {
    deletePost(remove.dataset.deleteId, remove.dataset.deleteTitle);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closePreview();
});

if (supabaseClient) {
  supabaseClient.auth.onAuthStateChange(() => {
    window.setTimeout(() => refreshSessionView(), 0);
  });
  refreshSessionView();
}
