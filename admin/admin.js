const config = window.KEDIAMANKU_SUPABASE || {};
const isConfigured = Boolean(
  config.url &&
  config.anonKey &&
  !config.anonKey.includes("PASTE_SUPABASE_ANON_PUBLIC_KEY_HERE")
);

const supabaseClient = isConfigured && window.supabase
  ? window.supabase.createClient(config.url, config.anonKey)
  : null;
const STORAGE_BUCKET = "kediamanku-images";

const authCard = document.querySelector("[data-auth-card]");
const dashboard = document.querySelector("[data-dashboard]");
const configWarning = document.querySelector("[data-config-warning]");
const loginForm = document.querySelector("[data-login-form]");
const loginStatus = document.querySelector("[data-login-status]");
const globalStatus = document.querySelector("[data-global-status]");
const logoutButton = document.querySelector("[data-logout]");
const tabButtons = [...document.querySelectorAll("[data-tab]")];
const panels = [...document.querySelectorAll("[data-panel]")];
const leadsList = document.querySelector("[data-leads-list]");

const tableConfig = {
  catalog_products: {
    list: document.querySelector("[data-product-list]"),
    form: document.querySelector("[data-product-form]"),
    tab: "catalog",
    title: "name",
    meta: "category",
    addLabel: "Add Product",
    updateLabel: "Update Product",
  },
  testimonials: {
    list: document.querySelector("[data-testimonial-list]"),
    form: document.querySelector("[data-testimonial-form]"),
    tab: "testimonials",
    title: "title",
    meta: "service",
    addLabel: "Add Testimonial",
    updateLabel: "Update Testimonial",
  },
  projects: {
    list: document.querySelector("[data-project-list]"),
    form: document.querySelector("[data-project-form]"),
    tab: "projects",
    title: "title",
    meta: "category",
    addLabel: "Add Project",
    updateLabel: "Update Project",
  },
  team_members: {
    list: document.querySelector("[data-team-list]"),
    form: document.querySelector("[data-team-form]"),
    tab: "team",
    title: "name",
    meta: "role",
    addLabel: "Add Team Member",
    updateLabel: "Update Team Member",
  },
};

if (!isConfigured) {
  configWarning.hidden = false;
  loginForm.querySelectorAll("input, button").forEach((element) => {
    element.disabled = true;
  });
  setStatus(loginStatus, "Masukkan Supabase anon public key dulu sebelum login.", "error");
}

function setStatus(element, message, type = "") {
  if (!element) return;
  element.textContent = message || "";
  element.classList.toggle("is-error", type === "error");
  element.classList.toggle("is-success", type === "success");
}

function cleanText(value, maxLength = 2000) {
  return String(value || "")
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

function cleanUrl(value) {
  const text = cleanText(value, 800);
  if (!text) return null;

  if (/^(javascript|data|vbscript):/i.test(text)) {
    throw new Error("URL tidak aman. Gunakan path lokal, http, atau https.");
  }

  return text;
}

function cleanUrlList(value) {
  return String(value || "")
    .split(/[\n,]/)
    .map((item) => cleanUrl(item))
    .filter(Boolean)
    .slice(0, 12);
}

function requireText(value, label, maxLength = 2000) {
  const text = cleanText(value, maxLength);
  if (!text) {
    throw new Error(`${label} wajib diisi.`);
  }
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

function numberOrDefault(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nullable(value) {
  const text = cleanText(value);
  return text ? text : null;
}

function formPayload(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function checked(form, name) {
  return form.querySelector(`[name="${name}"]`)?.checked || false;
}

function uniqueSlug(base) {
  const suffix = Date.now().toString(36).slice(-5);
  return `${slugify(base)}-${suffix}`;
}

function isSafeUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function setSubmitLabel(form, label) {
  const button = form?.querySelector('button[type="submit"]');
  if (!button) return;
  button.replaceChildren(document.createTextNode(`${label} `));
  const arrow = document.createElement("span");
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "\u2192";
  button.append(arrow);
}

function setEditMode(table, row = null) {
  const config = tableConfig[table];
  if (!config?.form) return;

  if (row) {
    config.form.dataset.editId = row.id;
    config.form.dataset.editSlug = row.slug || "";
    config.form.dataset.editImages = JSON.stringify(Array.isArray(row.images) ? row.images : []);
    config.form.classList.add("is-editing");
    setSubmitLabel(config.form, config.updateLabel);
  } else {
    delete config.form.dataset.editId;
    delete config.form.dataset.editSlug;
    delete config.form.dataset.editImages;
    config.form.classList.remove("is-editing");
    setSubmitLabel(config.form, config.addLabel);
  }

  const cancelButton = config.form.querySelector(`[data-cancel-edit="${table}"]`);
  if (cancelButton) cancelButton.hidden = !row;
}

function resetManagedForm(table) {
  const config = tableConfig[table];
  if (!config?.form) return;

  config.form.reset();
  config.form.querySelectorAll('[name="is_published"]').forEach((input) => {
    input.checked = true;
  });
  setEditMode(table, null);
}

function fileExtension(file) {
  const namePart = file.name.split(".").pop();
  if (namePart && namePart.length <= 5) return namePart.toLowerCase();
  const mimeMap = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return mimeMap[file.type] || "webp";
}

async function uploadImageFile(form, folder, baseName) {
  const fileInput = form.querySelector('[name="image_file"]');
  const file = fileInput?.files?.[0];

  if (!file) return null;
  if (!file.type.startsWith("image/")) {
    throw new Error("File harus berupa gambar.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Ukuran gambar maksimal 5MB.");
  }

  const path = `${folder}/${slugify(baseName)}-${Date.now()}.${fileExtension(file)}`;
  const { error } = await supabaseClient.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) {
    if (error.message?.toLowerCase().includes("bucket not found")) {
      throw new Error(`Storage bucket '${STORAGE_BUCKET}' belum dibuat. Jalankan ulang supabase/admin-backend.sql di Supabase SQL Editor atau buat bucket itu secara manual di Storage.`);
    }
    throw error;
  }

  const { data } = supabaseClient.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}

async function uploadImageFiles(form, inputName, folder, baseName) {
  const fileInput = form.querySelector(`[name="${inputName}"]`);
  const files = [...(fileInput?.files || [])].slice(0, 12);
  const urls = [];

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      throw new Error("Semua file gallery harus berupa gambar.");
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Ukuran setiap gambar gallery maksimal 5MB.");
    }

    const path = `${folder}/${slugify(baseName)}-${Date.now()}-${urls.length}.${fileExtension(file)}`;
    const { error } = await supabaseClient.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        cacheControl: "31536000",
        upsert: false,
      });

    if (error) {
      if (error.message?.toLowerCase().includes("bucket not found")) {
        throw new Error(`Storage bucket '${STORAGE_BUCKET}' belum dibuat. Jalankan ulang supabase/admin-backend.sql di Supabase SQL Editor atau buat bucket itu secara manual di Storage.`);
      }
      throw error;
    }

    const { data } = supabaseClient.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path);

    urls.push(data.publicUrl);
  }

  return urls;
}

function storagePathFromPublicUrl(value) {
  const url = cleanText(value, 1200);
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex === -1) return null;
    return decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length));
  } catch (error) {
    return null;
  }
}

function collectStoragePaths(row) {
  const urls = [row?.image_url, ...(Array.isArray(row?.images) ? row.images : [])];
  return uniqueValues(urls.map(storagePathFromPublicUrl));
}

async function deleteStorageFilesForRow(row) {
  const paths = collectStoragePaths(row);
  if (!paths.length) return null;

  return removeStoragePaths(paths);
}

async function removeStoragePaths(paths) {
  if (!paths.length) return null;

  const { error } = await supabaseClient.storage
    .from(STORAGE_BUCKET)
    .remove(paths);

  return error;
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function setActiveTab(tabName) {
  tabButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.tab === tabName));
  panels.forEach((panel) => panel.classList.toggle("is-active", panel.dataset.panel === tabName));
}

async function requireSession() {
  if (!supabaseClient) return null;
  const { data } = await supabaseClient.auth.getSession();
  return data.session;
}

function showDashboard(isLoggedIn) {
  authCard.hidden = isLoggedIn;
  dashboard.hidden = !isLoggedIn;
}

async function refreshSessionView() {
  const session = await requireSession();
  showDashboard(Boolean(session));
  if (session) {
    await Promise.all([
      loadRecent("catalog_products"),
      loadRecent("testimonials"),
      loadRecent("projects"),
      loadRecent("team_members"),
      loadLeads(),
    ]);
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabaseClient) return;

  setStatus(loginStatus, "Logging in...");
  const data = formPayload(loginForm);
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) {
    setStatus(loginStatus, error.message, "error");
    return;
  }

  loginForm.reset();
  setStatus(loginStatus, "Login berhasil.", "success");
  await refreshSessionView();
});

logoutButton.addEventListener("click", async () => {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  showDashboard(false);
  setStatus(loginStatus, "Logout berhasil.", "success");
});

tabButtons.forEach((button) => {
  button.addEventListener("click", () => setActiveTab(button.dataset.tab));
});

async function saveRow(table, payload, form) {
  if (!supabaseClient) return;
  const editId = form.dataset.editId;
  setStatus(globalStatus, editId ? "Updating..." : "Saving...");

  if (editId && !isSafeUuid(editId)) {
    setStatus(globalStatus, "Data id tidak valid.", "error");
    return;
  }

  let previousRowForStorage = null;
  if (editId) {
    const storageSelect = table === "catalog_products" ? "image_url,images" : "image_url";
    const { data: previousRow, error: previousRowError } = await supabaseClient
      .from(table)
      .select(storageSelect)
      .eq("id", editId)
      .single();

    if (previousRowError) {
      console.warn(previousRowError);
    } else {
      previousRowForStorage = previousRow;
    }
  }

  const query = editId
    ? supabaseClient.from(table).update(payload).eq("id", editId)
    : supabaseClient.from(table).insert(payload);

  const { error } = await query;

  if (error) {
    setStatus(globalStatus, error.message, "error");
    return;
  }

  let storageCleanupError = null;
  if (editId && previousRowForStorage) {
    const oldPaths = collectStoragePaths(previousRowForStorage);
    const newPaths = collectStoragePaths(payload);
    const removedPaths = oldPaths.filter((path) => !newPaths.includes(path));
    storageCleanupError = await removeStoragePaths(removedPaths);
  }

  resetManagedForm(table);
  if (storageCleanupError) {
    console.warn(storageCleanupError);
    setStatus(globalStatus, "Data berhasil disimpan, tetapi beberapa file gambar lama belum terhapus dari Storage.", "error");
  } else {
    setStatus(globalStatus, editId ? "Data berhasil diupdate." : "Data berhasil ditambahkan.", "success");
  }
  await loadRecent(table);
}

document.querySelector("[data-product-form]").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = formPayload(form);
  let uploadedImageUrl = null;
  let uploadedGalleryUrls = [];
  let payload = null;

  try {
    const name = requireText(data.name, "Product name", 140);
    const description = requireText(data.description, "Description", 3000);
    const material = requireText(data.material, "Material", 1600);
    const imageUrl = cleanUrl(data.image_url);
    const linkUrl = cleanUrl(data.link_url);
    const galleryUrls = cleanUrlList(data.gallery_urls);

    setStatus(globalStatus, "Uploading image...");
    uploadedImageUrl = await uploadImageFile(form, "catalog", name);
    uploadedGalleryUrls = await uploadImageFiles(form, "gallery_files", "catalog/gallery", name);

    const currentImages = (() => {
      try {
        return JSON.parse(form.dataset.editImages || "[]");
      } catch {
        return [];
      }
    })();
    const primaryImage = uploadedImageUrl || imageUrl || currentImages[0] || null;
    const images = uniqueValues([
      primaryImage,
      ...uploadedGalleryUrls,
      ...galleryUrls,
    ]).slice(0, 12);

    payload = {
      slug: form.dataset.editSlug || uniqueSlug(name),
      name,
      product_code: nullable(data.product_code),
      category: data.category,
      description,
      material,
      size: nullable(data.size),
      finishing: nullable(data.finishing),
      production_time: nullable(data.production_time),
      packaging_installation: nullable(data.packaging_installation),
      price_range: cleanText(data.price_range || "By quotation", 120) || "By quotation",
      price_value: Math.max(0, numberOrDefault(data.price_value)),
      image_url: images[0] || primaryImage,
      images,
      image_alt: nullable(data.image_alt) || `${name} by Kediamanku`,
      link_url: linkUrl,
      featured: checked(form, "featured"),
      is_published: checked(form, "is_published"),
      newest: 0,
      popular: checked(form, "featured") ? 10 : 0,
      sort_order: numberOrDefault(data.sort_order),
    };
  } catch (error) {
    setStatus(globalStatus, error.message, "error");
    return;
  }

  await saveRow("catalog_products", payload, form);
});

document.querySelector("[data-testimonial-form]").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = formPayload(form);
  let uploadedImageUrl = null;
  let payload = null;

  try {
    const title = requireText(data.title, "Title", 160);
    const excerpt = requireText(data.excerpt, "Short excerpt", 600);
    const detail = requireText(data.detail, "Detailed story", 3000);
    const clientName = requireText(data.client_name, "Client name", 140);
    const imageUrl = cleanUrl(data.image_url);

    setStatus(globalStatus, "Uploading image...");
    uploadedImageUrl = await uploadImageFile(form, "testimonials", title);

    payload = {
      slug: form.dataset.editSlug || uniqueSlug(title),
      title,
      service: data.service,
      rating: Math.min(5, Math.max(1, numberOrDefault(data.rating, 5))),
      testimonial_date: nullable(data.testimonial_date),
      excerpt,
      detail,
      client_name: clientName,
      location: nullable(data.location),
      project_name: nullable(data.project_name),
      image_url: uploadedImageUrl || imageUrl,
      image_alt: nullable(data.image_alt) || `${data.service} testimonial by Kediamanku`,
      is_featured: checked(form, "is_featured"),
      is_published: checked(form, "is_published"),
      sort_order: numberOrDefault(data.sort_order),
    };
  } catch (error) {
    setStatus(globalStatus, error.message, "error");
    return;
  }

  await saveRow("testimonials", payload, form);
});

document.querySelector("[data-project-form]").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = formPayload(form);
  let uploadedImageUrl = null;
  let payload = null;

  try {
    const title = requireText(data.title, "Project title", 160);
    const imageUrl = cleanUrl(data.image_url);
    const tags = String(data.tags || "")
      .split(",")
      .map((tag) => cleanText(tag, 40))
      .filter(Boolean)
      .slice(0, 8);

    setStatus(globalStatus, "Uploading image...");
    uploadedImageUrl = await uploadImageFile(form, "projects", title);

    payload = {
      slug: form.dataset.editSlug || uniqueSlug(title),
      title,
      category: data.category,
      location: nullable(data.location),
      project_year: numberOrDefault(data.project_year, new Date().getFullYear()),
      area_scope: nullable(data.area_scope),
      materials: nullable(data.materials),
      image_url: uploadedImageUrl || imageUrl,
      image_alt: nullable(data.image_alt) || `${title} project by Kediamanku`,
      tags,
      is_featured: checked(form, "is_featured"),
      is_published: checked(form, "is_published"),
      sort_order: numberOrDefault(data.sort_order),
    };
  } catch (error) {
    setStatus(globalStatus, error.message, "error");
    return;
  }

  await saveRow("projects", payload, form);
});

document.querySelector("[data-team-form]").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = formPayload(form);
  let uploadedImageUrl = null;
  let payload = null;

  try {
    const name = requireText(data.name, "Name", 140);
    const role = requireText(data.role, "Role", 140);
    const imageUrl = cleanUrl(data.image_url);

    setStatus(globalStatus, "Uploading image...");
    uploadedImageUrl = await uploadImageFile(form, "team", name);

    payload = {
      slug: form.dataset.editSlug || uniqueSlug(name),
      name,
      role,
      bio: nullable(data.bio),
      image_url: uploadedImageUrl || imageUrl,
      image_alt: nullable(data.image_alt) || `Portrait of ${name} from Kediamanku`,
      is_published: checked(form, "is_published"),
      sort_order: numberOrDefault(data.sort_order),
    };
  } catch (error) {
    setStatus(globalStatus, error.message, "error");
    return;
  }

  await saveRow("team_members", payload, form);
});

function renderListMessage(list, title, message) {
  list.replaceChildren();
  const item = createElement("div", "list-item");
  const content = document.createElement("div");
  content.append(createElement("strong", "", title));
  content.append(createElement("span", "", message));
  item.append(content);
  list.append(item);
}

async function loadRecent(table) {
  if (!supabaseClient || !tableConfig[table]) return;
  const { list, title, meta } = tableConfig[table];
  const { data, error } = await supabaseClient
    .from(table)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    renderListMessage(list, "Cannot load data", error.message);
    return;
  }

  if (!data.length) {
    renderListMessage(list, "No data yet", "Add your first item above.");
    return;
  }

  list.replaceChildren();
  data.forEach((item) => {
    const row = createElement("div", "list-item");
    const content = document.createElement("div");
    content.append(createElement("strong", "", item[title] || "Untitled"));
    content.append(createElement("span", "", `${item[meta] || "No category"} ${item.is_published ? "Published" : "Draft"}`));
    row.append(content);

    const actions = createElement("div", "list-actions");
    actions.append(createElement("span", "", new Date(item.created_at).toLocaleDateString("id-ID")));

    const editButton = createElement("button", "btn-list", "Edit");
    editButton.type = "button";
    editButton.dataset.editTable = table;
    editButton.dataset.editId = item.id;
    actions.append(editButton);

    const deleteButton = createElement("button", "btn-danger", "Delete");
    deleteButton.type = "button";
    deleteButton.dataset.deleteTable = table;
    deleteButton.dataset.deleteId = item.id;
    deleteButton.dataset.deleteName = item[title] || "this item";
    actions.append(deleteButton);

    row.append(actions);
    list.append(row);
  });
}

function setField(form, name, value) {
  const field = form.querySelector(`[name="${name}"]`);
  if (!field) return;

  if (field.type === "checkbox") {
    field.checked = Boolean(value);
    return;
  }

  if (field.type === "file") {
    field.value = "";
    return;
  }

  field.value = value ?? "";
}

function populateForm(table, row) {
  const form = tableConfig[table]?.form;
  if (!form) return;

  const fieldMaps = {
    catalog_products: {
      name: row.name,
      product_code: row.product_code,
      category: row.category,
      description: row.description,
      material: row.material,
      size: row.size,
      finishing: row.finishing,
      production_time: row.production_time,
      packaging_installation: row.packaging_installation,
      price_range: row.price_range,
      price_value: row.price_value,
      image_url: row.image_url,
      gallery_urls: Array.isArray(row.images) ? row.images.join("\n") : "",
      image_alt: row.image_alt,
      link_url: row.link_url,
      sort_order: row.sort_order,
      featured: row.featured,
      is_published: row.is_published,
    },
    testimonials: {
      title: row.title,
      service: row.service,
      rating: row.rating,
      testimonial_date: row.testimonial_date,
      client_name: row.client_name,
      location: row.location,
      project_name: row.project_name,
      image_url: row.image_url,
      excerpt: row.excerpt,
      detail: row.detail,
      image_alt: row.image_alt,
      sort_order: row.sort_order,
      is_featured: row.is_featured,
      is_published: row.is_published,
    },
    projects: {
      title: row.title,
      category: row.category,
      location: row.location,
      project_year: row.project_year,
      area_scope: row.area_scope,
      materials: row.materials,
      image_url: row.image_url,
      image_alt: row.image_alt,
      tags: Array.isArray(row.tags) ? row.tags.join(", ") : row.tags,
      sort_order: row.sort_order,
      is_featured: row.is_featured,
      is_published: row.is_published,
    },
    team_members: {
      name: row.name,
      role: row.role,
      bio: row.bio,
      image_url: row.image_url,
      image_alt: row.image_alt,
      sort_order: row.sort_order,
      is_published: row.is_published,
    },
  };

  Object.entries(fieldMaps[table] || {}).forEach(([name, value]) => {
    setField(form, name, value);
  });

  setEditMode(table, row);
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function editRow(table, id) {
  if (!supabaseClient) return;
  if (!tableConfig[table] || !isSafeUuid(id)) {
    setStatus(globalStatus, "Data id tidak valid.", "error");
    return;
  }

  setStatus(globalStatus, "Loading data for edit...");
  const { data, error } = await supabaseClient
    .from(table)
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    setStatus(globalStatus, error.message, "error");
    return;
  }

  setActiveTab(tableConfig[table].tab);
  populateForm(table, data);
  setStatus(globalStatus, "Edit mode aktif. Update form lalu klik tombol update.", "success");
}

async function deleteRow(table, id, name) {
  if (!supabaseClient) return;
  if (!tableConfig[table] || !isSafeUuid(id)) {
    setStatus(globalStatus, "Data id tidak valid.", "error");
    return;
  }

  const confirmed = window.confirm(`Delete ${name}?`);
  if (!confirmed) return;

  setStatus(globalStatus, "Deleting data...");
  const storageSelect = table === "catalog_products" ? "image_url,images" : "image_url";
  const { data: rowForStorage, error: storageLookupError } = await supabaseClient
    .from(table)
    .select(storageSelect)
    .eq("id", id)
    .single();

  if (storageLookupError) {
    console.warn(storageLookupError);
  }

  const { error } = await supabaseClient
    .from(table)
    .delete()
    .eq("id", id);

  if (error) {
    setStatus(globalStatus, error.message, "error");
    return;
  }

  const storageDeleteError = await deleteStorageFilesForRow(rowForStorage);

  if (tableConfig[table]?.form?.dataset.editId === id) {
    resetManagedForm(table);
  }

  if (storageDeleteError) {
    console.warn(storageDeleteError);
    setStatus(globalStatus, "Data berhasil dihapus, tetapi beberapa file gambar belum terhapus dari Storage.", "error");
  } else {
    setStatus(globalStatus, "Data dan file gambar terkait berhasil dihapus.", "success");
  }
  await loadRecent(table);
}

Object.entries(tableConfig).forEach(([table, config]) => {
  config.list?.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-table]");
    if (editButton) {
      editRow(editButton.dataset.editTable, editButton.dataset.editId);
      return;
    }

    const deleteButton = event.target.closest("[data-delete-table]");
    if (deleteButton) {
      deleteRow(deleteButton.dataset.deleteTable, deleteButton.dataset.deleteId, deleteButton.dataset.deleteName);
    }
  });
});

document.querySelectorAll("[data-cancel-edit]").forEach((button) => {
  button.addEventListener("click", () => {
    resetManagedForm(button.dataset.cancelEdit);
    setStatus(globalStatus, "Edit dibatalkan.");
  });
});

function renderLeadMessage(message) {
  leadsList.replaceChildren();
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = 6;
  cell.textContent = message;
  row.append(cell);
  leadsList.append(row);
}

function appendLeadCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = value || "-";
  row.append(cell);
  return cell;
}

async function loadLeads() {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    renderLeadMessage(error.message);
    return;
  }

  if (!data.length) {
    renderLeadMessage("No leads yet.");
    return;
  }

  leadsList.replaceChildren();
  data.forEach((lead) => {
    const row = document.createElement("tr");
    appendLeadCell(row, lead.name);
    appendLeadCell(row, [lead.phone, lead.email].filter(Boolean).join("\n") || "-");
    appendLeadCell(row, lead.service_interest);
    appendLeadCell(row, lead.message);
    appendLeadCell(row, lead.status);
    appendLeadCell(row, new Date(lead.created_at).toLocaleString("id-ID"));
    leadsList.append(row);
  });
}

document.querySelector("[data-refresh-leads]").addEventListener("click", loadLeads);

if (supabaseClient) {
  supabaseClient.auth.onAuthStateChange(() => {
    refreshSessionView();
  });
  refreshSessionView();
}
