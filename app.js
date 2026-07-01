// ============================================
// İŞ DEFTERİ — app.js
// ============================================

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const BUCKET = "photos";

const state = {
  view: "expenses",
  expenses: [],
  quotes: [],
  notes: [],
  todos: [],
  todoFilter: "open",
  pendingPhotoFile: null,
  editingId: null,
};

// ---------- yardımcılar ----------
const $ = (sel) => document.querySelector(sel);
const $all = (sel) => document.querySelectorAll(sel);

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add("hidden"), 2200);
}

function fmtMoney(n) {
  return "₺" + Number(n || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random();
}

// ---------- PIN kilidi ----------
function initLock() {
  if (!window.APP_PIN) {
    $("#app").classList.remove("hidden");
    return;
  }
  const unlocked = sessionStorage.getItem("id_unlocked") === "1";
  if (unlocked) {
    $("#app").classList.remove("hidden");
    return;
  }
  $("#lockScreen").classList.remove("hidden");
  $("#pinSubmit").addEventListener("click", tryUnlock);
  $("#pinInput").addEventListener("keydown", (e) => { if (e.key === "Enter") tryUnlock(); });
}
function tryUnlock() {
  const val = $("#pinInput").value;
  if (val === window.APP_PIN) {
    sessionStorage.setItem("id_unlocked", "1");
    $("#lockScreen").classList.add("hidden");
    $("#app").classList.remove("hidden");
  } else {
    $("#pinError").classList.remove("hidden");
    $("#pinInput").value = "";
  }
}

// ---------- görünüm geçişleri ----------
const VIEW_META = {
  expenses: { title: "Harcamalar", sub: "Kim, ne, ne kadar harcadı" },
  quotes: { title: "Teklifler", sub: "Alınan fiyat teklifleri" },
  notes: { title: "Notlar", sub: "Aklında kalsın istediklerin" },
  todos: { title: "Yapılacaklar", sub: "İşletme görev listesi" },
};

function switchView(view) {
  state.view = view;
  $all(".view").forEach((v) => v.classList.remove("active"));
  $(`#view-${view}`).classList.add("active");
  $all(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === view));
  $("#pageTitle").textContent = VIEW_META[view].title;
  $("#pageSubtitle").textContent = VIEW_META[view].sub;
}

$all(".tab").forEach((t) => t.addEventListener("click", () => switchView(t.dataset.view)));

// ============================================
// VERİ ÇEKME + GERÇEK ZAMANLI SENKRON
// ============================================

async function loadAll() {
  await Promise.all([loadExpenses(), loadQuotes(), loadNotes(), loadTodos()]);
}

async function loadExpenses() {
  const { data, error } = await sb.from("expenses").select("*").order("date", { ascending: false }).order("created_at", { ascending: false });
  if (error) return console.error(error);
  state.expenses = data;
  renderExpenses();
}
async function loadQuotes() {
  const { data, error } = await sb.from("quotes").select("*").order("date", { ascending: false });
  if (error) return console.error(error);
  state.quotes = data;
  renderQuotes();
}
async function loadNotes() {
  const { data, error } = await sb.from("notes").select("*").order("created_at", { ascending: false });
  if (error) return console.error(error);
  state.notes = data;
  renderNotes();
}
async function loadTodos() {
  const { data, error } = await sb.from("todos").select("*").order("created_at", { ascending: false });
  if (error) return console.error(error);
  state.todos = data;
  renderTodos();
}

function setupRealtime() {
  sb.channel("public:all-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, loadExpenses)
    .on("postgres_changes", { event: "*", schema: "public", table: "quotes" }, loadQuotes)
    .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, loadNotes)
    .on("postgres_changes", { event: "*", schema: "public", table: "todos" }, loadTodos)
    .subscribe((status) => {
      $("#syncDot").classList.toggle("off", status !== "SUBSCRIBED");
    });
}

// ============================================
// RENDER
// ============================================

function renderExpenses() {
  const months = [...new Set(state.expenses.map((e) => e.date?.slice(0, 7)))].filter(Boolean).sort().reverse();
  const sel = $("#expenseMonthFilter");
  const current = sel.value || months[0] || "";
  sel.innerHTML = `<option value="all">Tüm zamanlar</option>` + months.map((m) => `<option value="${m}">${fmtMonthLabel(m)}</option>`).join("");
  sel.value = months.includes(current) ? current : (months[0] || "all");

  const filterMonth = sel.value;
  const filtered = filterMonth === "all" ? state.expenses : state.expenses.filter((e) => e.date?.slice(0, 7) === filterMonth);
  const total = filtered.reduce((s, e) => s + Number(e.amount || 0), 0);
  $("#expenseMonthTotal").textContent = fmtMoney(total);

  const list = $("#expenseList");
  $("#expenseEmpty").classList.toggle("hidden", filtered.length > 0);
  list.innerHTML = filtered.map((e) => `
    <div class="entry-card acc-expense" data-id="${e.id}" data-table="expenses">
      <div class="entry-main">
        <div class="entry-row1">
          <span class="entry-date">${fmtDate(e.date)}</span>
          <span class="entry-amount">${fmtMoney(e.amount)}</span>
        </div>
        <p class="entry-title">${escapeHtml(e.person || "—")}</p>
        <p class="entry-sub">${escapeHtml(e.description || "")}</p>
      </div>
      <button class="entry-delete" data-del="expenses:${e.id}">✕</button>
    </div>
  `).join("");
}

function fmtMonthLabel(m) {
  const [y, mo] = m.split("-");
  const d = new Date(Number(y), Number(mo) - 1, 1);
  return d.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
}

function renderQuotes() {
  const list = $("#quoteList");
  $("#quoteEmpty").classList.toggle("hidden", state.quotes.length > 0);
  list.innerHTML = state.quotes.map((q) => `
    <div class="entry-card acc-quote" data-id="${q.id}" data-table="quotes">
      ${q.photo_url ? `<img class="entry-thumb" src="${q.photo_url}" data-photo="${q.photo_url}">` : ""}
      <div class="entry-main">
        <div class="entry-row1">
          <span class="entry-date">${fmtDate(q.date)}</span>
          ${q.price ? `<span class="entry-amount">${fmtMoney(q.price)}</span>` : ""}
        </div>
        <p class="entry-title">${escapeHtml(q.product_name || "—")}</p>
        <p class="entry-sub">${escapeHtml(q.source || "")}</p>
        ${q.notes ? `<p class="entry-sub">${escapeHtml(q.notes)}</p>` : ""}
      </div>
      <button class="entry-delete" data-del="quotes:${q.id}">✕</button>
    </div>
  `).join("");
}

function renderNotes() {
  const list = $("#noteList");
  $("#noteEmpty").classList.toggle("hidden", state.notes.length > 0);
  list.innerHTML = state.notes.map((n) => `
    <div class="entry-card acc-note" data-id="${n.id}" data-table="notes">
      ${n.photo_url ? `<img class="entry-thumb" src="${n.photo_url}" data-photo="${n.photo_url}">` : ""}
      <div class="entry-main">
        <span class="entry-date">${fmtDate(n.created_at)}</span>
        <p class="entry-sub" style="margin-top:4px; color:var(--text);">${escapeHtml(n.content || "")}</p>
      </div>
      <button class="entry-delete" data-del="notes:${n.id}">✕</button>
    </div>
  `).join("");
}

function renderTodos() {
  let filtered = state.todos;
  if (state.todoFilter === "open") filtered = state.todos.filter((t) => !t.done);
  if (state.todoFilter === "done") filtered = state.todos.filter((t) => t.done);

  const list = $("#todoList");
  $("#todoEmpty").classList.toggle("hidden", filtered.length > 0);
  list.innerHTML = filtered.map((t) => `
    <div class="entry-card acc-todo ${t.done ? "todo-done" : ""}" data-id="${t.id}" data-table="todos">
      ${t.done ? `<span class="stamp">Tamamlandı</span>` : ""}
      <button class="todo-check ${t.done ? "done" : ""}" data-toggle="${t.id}">${t.done ? "✓" : ""}</button>
      ${t.photo_url ? `<img class="entry-thumb" src="${t.photo_url}" data-photo="${t.photo_url}">` : ""}
      <div class="entry-main">
        <p class="entry-title" style="margin-top:2px;">${escapeHtml(t.content || "")}</p>
        <span class="entry-date">${fmtDate(t.created_at)}</span>
      </div>
      <button class="entry-delete" data-del="todos:${t.id}">✕</button>
    </div>
  `).join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- ay filtresi değişince ----------
$("#expenseMonthFilter").addEventListener("change", renderExpenses);

// ---------- Excel'e aktar ----------
function exportExpensesToExcel() {
  const filterMonth = $("#expenseMonthFilter").value;
  const filtered = (filterMonth === "all" ? state.expenses : state.expenses.filter((e) => e.date?.slice(0, 7) === filterMonth))
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  if (!filtered.length) return toast("Aktarılacak kayıt yok");

  const rows = filtered.map((e) => ({
    "Tarih": fmtDate(e.date),
    "Kim": e.person || "",
    "Açıklama": e.description || "",
    "Tutar (₺)": Number(e.amount || 0),
  }));
  const total = filtered.reduce((s, e) => s + Number(e.amount || 0), 0);
  rows.push({ "Tarih": "", "Kim": "", "Açıklama": "TOPLAM", "Tutar (₺)": total });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 12 }, { wch: 16 }, { wch: 34 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Harcamalar");

  const label = filterMonth === "all" ? "tum-zamanlar" : filterMonth;
  XLSX.writeFile(wb, `harcamalar-${label}.xlsx`);
}
$("#exportExcelBtn").addEventListener("click", exportExpensesToExcel);

// ---------- todo filtre chip'leri ----------
$all(".chip").forEach((c) => c.addEventListener("click", () => {
  $all(".chip").forEach((x) => x.classList.remove("active"));
  c.classList.add("active");
  state.todoFilter = c.dataset.filter;
  renderTodos();
}));

// ---------- kart tıklamaları (silme, foto büyütme, todo toggle, düzenleme) ----------
document.addEventListener("click", async (e) => {
  const delBtn = e.target.closest("[data-del]");
  if (delBtn) {
    const [table, id] = delBtn.dataset.del.split(":");
    if (confirm("Bu kaydı silmek istediğine emin misin?")) {
      const { error } = await sb.from(table).delete().eq("id", id);
      if (error) toast("Silinemedi: " + error.message);
    }
    return;
  }
  const toggleBtn = e.target.closest("[data-toggle]");
  if (toggleBtn) {
    const id = toggleBtn.dataset.toggle;
    const item = state.todos.find((t) => t.id === id);
    const { error } = await sb.from("todos").update({ done: !item.done, done_at: !item.done ? new Date().toISOString() : null }).eq("id", id);
    if (error) toast("Güncellenemedi: " + error.message);
    return;
  }
  const photoImg = e.target.closest("[data-photo]");
  if (photoImg) {
    $("#photoOverlayImg").src = photoImg.dataset.photo;
    $("#photoOverlay").classList.remove("hidden");
    return;
  }
  const card = e.target.closest(".entry-card");
  if (card) {
    openEditFor(card.dataset.table, card.dataset.id);
  }
});

function openEditFor(table, id) {
  if (table === "expenses") return openExpenseForm(state.expenses.find((x) => x.id === id));
  if (table === "quotes") return openQuoteForm(state.quotes.find((x) => x.id === id));
  if (table === "notes") return openNoteForm(state.notes.find((x) => x.id === id));
  if (table === "todos") return openTodoForm(state.todos.find((x) => x.id === id));
}
$("#photoOverlayClose").addEventListener("click", () => $("#photoOverlay").classList.add("hidden"));
$("#photoOverlay").addEventListener("click", (e) => { if (e.target.id === "photoOverlay") $("#photoOverlay").classList.add("hidden"); });

// ============================================
// FOTOĞRAF YÜKLEME (Supabase Storage)
// ============================================

async function uploadPhoto(file) {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${new Date().toISOString().slice(0, 10)}/${uid()}.${ext}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function photoPickerHtml(fieldId) {
  return `
    <div class="field">
      <label>Fotoğraf (opsiyonel)</label>
      <div class="photo-picker">
        <label class="photo-btn">📷 Çek
          <input type="file" accept="image/*" capture="environment" id="${fieldId}_camera" style="display:none">
        </label>
        <label class="photo-btn">🖼 Galeriden seç
          <input type="file" accept="image/*" id="${fieldId}_gallery" style="display:none">
        </label>
      </div>
      <div id="${fieldId}_previewWrap"></div>
    </div>
  `;
}

function previewBlock(url, fieldId) {
  return `
    <div class="photo-preview-wrap">
      <img class="photo-preview" src="${url}">
      <button type="button" class="photo-remove" id="${fieldId}_remove">✕</button>
    </div>`;
}

function renderPhotoPreview(fieldId) {
  const wrap = $(`#${fieldId}_previewWrap`);
  if (state.pendingPhotoFile) {
    wrap.innerHTML = previewBlock(URL.createObjectURL(state.pendingPhotoFile), fieldId);
  } else if (state.existingPhotoUrl && !state.photoRemoved) {
    wrap.innerHTML = previewBlock(state.existingPhotoUrl, fieldId);
  } else {
    wrap.innerHTML = "";
  }
  const removeBtn = $(`#${fieldId}_remove`);
  if (removeBtn) {
    removeBtn.addEventListener("click", () => {
      state.pendingPhotoFile = null;
      state.photoRemoved = true;
      renderPhotoPreview(fieldId);
    });
  }
}

// existingUrl: düzenleme modunda mevcut fotoğrafın URL'i (yoksa null)
function wirePhotoPicker(fieldId, existingUrl) {
  state.pendingPhotoFile = null;
  state.existingPhotoUrl = existingUrl || null;
  state.photoRemoved = false;
  renderPhotoPreview(fieldId);
  const handle = (file) => {
    if (!file) return;
    state.pendingPhotoFile = file;
    state.photoRemoved = false;
    renderPhotoPreview(fieldId);
  };
  $(`#${fieldId}_camera`).addEventListener("change", (e) => handle(e.target.files[0]));
  $(`#${fieldId}_gallery`).addEventListener("change", (e) => handle(e.target.files[0]));
}

// Formun kaydedilecek fotoğraf URL'ini belirler: yeni seçilmiş / kaldırılmış / değişmemiş
async function resolvePhotoUrl() {
  if (state.pendingPhotoFile) return await uploadPhoto(state.pendingPhotoFile);
  if (state.photoRemoved) return null;
  return state.existingPhotoUrl || null;
}

// ============================================
// MODAL / FORM
// ============================================

function openModal(title, bodyHtml, onMount) {
  $("#modalTitle").textContent = title;
  $("#modalBody").innerHTML = bodyHtml;
  $("#modalOverlay").classList.remove("hidden");
  state.pendingPhotoFile = null;
  if (onMount) onMount();
}
function closeModal() {
  $("#modalOverlay").classList.add("hidden");
  state.pendingPhotoFile = null;
}
$("#modalClose").addEventListener("click", closeModal);
$("#modalOverlay").addEventListener("click", (e) => { if (e.target.id === "modalOverlay") closeModal(); });

$("#fab").addEventListener("click", () => {
  if (state.view === "expenses") openExpenseForm();
  if (state.view === "quotes") openQuoteForm();
  if (state.view === "notes") openNoteForm();
  if (state.view === "todos") openTodoForm();
});

// ---- Harcama formu ----
const recentPeople = () => [...new Set(state.expenses.map((e) => e.person).filter(Boolean))].slice(0, 6);

function openExpenseForm(existing) {
  const people = recentPeople();
  const isEdit = !!existing;
  openModal(isEdit ? "Harcamayı Düzenle" : "Yeni Harcama", `
    <div class="field-row">
      <div class="field"><label>Tarih</label><input type="date" id="f_date" value="${isEdit ? existing.date : todayISO()}"></div>
      <div class="field"><label>Tutar (₺)</label><input type="number" id="f_amount" inputmode="decimal" placeholder="0" value="${isEdit ? existing.amount : ""}"></div>
    </div>
    <div class="field">
      <label>Kim harcadı</label>
      <input type="text" id="f_person" list="peopleList" placeholder="İsim yaz" value="${isEdit ? escapeHtml(existing.person || "") : ""}">
      <datalist id="peopleList">${people.map((p) => `<option value="${escapeHtml(p)}">`).join("")}</datalist>
    </div>
    <div class="field"><label>Ne için</label><textarea id="f_desc" placeholder="Örn: mutfak malzemesi, tamirat...">${isEdit ? escapeHtml(existing.description || "") : ""}</textarea></div>
    <button class="btn-primary" id="f_submit">Kaydet</button>
    ${isEdit ? `<button type="button" class="btn-danger-link" id="f_delete">Kaydı sil</button>` : ""}
  `, () => {
    if (isEdit) $("#f_delete").addEventListener("click", () => deleteRecord("expenses", existing.id));
    $("#f_submit").addEventListener("click", async () => {
      const person = $("#f_person").value.trim();
      const amount = parseFloat($("#f_amount").value);
      if (!person || !amount) return toast("İsim ve tutar gerekli");
      setSubmitting(true);
      const payload = {
        date: $("#f_date").value || todayISO(),
        person,
        amount,
        description: $("#f_desc").value.trim(),
      };
      const { error } = isEdit
        ? await sb.from("expenses").update(payload).eq("id", existing.id)
        : await sb.from("expenses").insert(payload);
      setSubmitting(false);
      if (error) return toast("Kaydedilemedi: " + error.message);
      closeModal();
      toast(isEdit ? "Harcama güncellendi" : "Harcama eklendi");
    });
  });
}

// ---- Teklif formu ----
function openQuoteForm(existing) {
  const isEdit = !!existing;
  openModal(isEdit ? "Teklifi Düzenle" : "Yeni Teklif", `
    <div class="field-row">
      <div class="field"><label>Tarih</label><input type="date" id="f_date" value="${isEdit ? existing.date : todayISO()}"></div>
      <div class="field"><label>Fiyat (₺)</label><input type="number" id="f_price" inputmode="decimal" placeholder="0" value="${isEdit && existing.price != null ? existing.price : ""}"></div>
    </div>
    <div class="field"><label>Ürün</label><input type="text" id="f_product" placeholder="Örn: 40 kişilik masa" value="${isEdit ? escapeHtml(existing.product_name || "") : ""}"></div>
    <div class="field"><label>Nereden alındı</label><input type="text" id="f_source" placeholder="Firma / kişi adı" value="${isEdit ? escapeHtml(existing.source || "") : ""}"></div>
    <div class="field"><label>Not (opsiyonel)</label><textarea id="f_notes" placeholder="Detay, vade, teslimat vb.">${isEdit ? escapeHtml(existing.notes || "") : ""}</textarea></div>
    ${photoPickerHtml("qphoto")}
    <button class="btn-primary" id="f_submit">Kaydet</button>
    ${isEdit ? `<button type="button" class="btn-danger-link" id="f_delete">Kaydı sil</button>` : ""}
  `, () => {
    wirePhotoPicker("qphoto", isEdit ? existing.photo_url : null);
    if (isEdit) $("#f_delete").addEventListener("click", () => deleteRecord("quotes", existing.id));
    $("#f_submit").addEventListener("click", async () => {
      const product = $("#f_product").value.trim();
      if (!product) return toast("Ürün adı gerekli");
      setSubmitting(true);
      try {
        const photo_url = await resolvePhotoUrl();
        const payload = {
          date: $("#f_date").value || todayISO(),
          product_name: product,
          source: $("#f_source").value.trim(),
          price: $("#f_price").value ? parseFloat($("#f_price").value) : null,
          notes: $("#f_notes").value.trim(),
          photo_url,
        };
        const { error } = isEdit
          ? await sb.from("quotes").update(payload).eq("id", existing.id)
          : await sb.from("quotes").insert(payload);
        if (error) throw error;
        closeModal();
        toast(isEdit ? "Teklif güncellendi" : "Teklif eklendi");
      } catch (err) {
        toast("Kaydedilemedi: " + err.message);
      }
      setSubmitting(false);
    });
  });
}

// ---- Not formu ----
function openNoteForm(existing) {
  const isEdit = !!existing;
  openModal(isEdit ? "Notu Düzenle" : "Yeni Not", `
    <div class="field"><label>Not</label><textarea id="f_content" placeholder="Ne not etmek istersin?">${isEdit ? escapeHtml(existing.content || "") : ""}</textarea></div>
    ${photoPickerHtml("nphoto")}
    <button class="btn-primary" id="f_submit">Kaydet</button>
    ${isEdit ? `<button type="button" class="btn-danger-link" id="f_delete">Kaydı sil</button>` : ""}
  `, () => {
    wirePhotoPicker("nphoto", isEdit ? existing.photo_url : null);
    if (isEdit) $("#f_delete").addEventListener("click", () => deleteRecord("notes", existing.id));
    $("#f_submit").addEventListener("click", async () => {
      const content = $("#f_content").value.trim();
      if (!content) return toast("Not boş olamaz");
      setSubmitting(true);
      try {
        const photo_url = await resolvePhotoUrl();
        const payload = { content, photo_url };
        const { error } = isEdit
          ? await sb.from("notes").update(payload).eq("id", existing.id)
          : await sb.from("notes").insert(payload);
        if (error) throw error;
        closeModal();
        toast(isEdit ? "Not güncellendi" : "Not eklendi");
      } catch (err) {
        toast("Kaydedilemedi: " + err.message);
      }
      setSubmitting(false);
    });
  });
}

// ---- Yapılacak formu ----
function openTodoForm(existing) {
  const isEdit = !!existing;
  openModal(isEdit ? "Görevi Düzenle" : "Yeni Görev", `
    <div class="field"><label>Görev</label><textarea id="f_content" placeholder="Ne yapılacak?">${isEdit ? escapeHtml(existing.content || "") : ""}</textarea></div>
    ${photoPickerHtml("tphoto")}
    <button class="btn-primary" id="f_submit">Kaydet</button>
    ${isEdit ? `<button type="button" class="btn-danger-link" id="f_delete">Kaydı sil</button>` : ""}
  `, () => {
    wirePhotoPicker("tphoto", isEdit ? existing.photo_url : null);
    if (isEdit) $("#f_delete").addEventListener("click", () => deleteRecord("todos", existing.id));
    $("#f_submit").addEventListener("click", async () => {
      const content = $("#f_content").value.trim();
      if (!content) return toast("Görev boş olamaz");
      setSubmitting(true);
      try {
        const photo_url = await resolvePhotoUrl();
        const payload = isEdit ? { content, photo_url } : { content, photo_url, done: false };
        const { error } = isEdit
          ? await sb.from("todos").update(payload).eq("id", existing.id)
          : await sb.from("todos").insert(payload);
        if (error) throw error;
        closeModal();
        toast(isEdit ? "Görev güncellendi" : "Görev eklendi");
      } catch (err) {
        toast("Kaydedilemedi: " + err.message);
      }
      setSubmitting(false);
    });
  });
}

async function deleteRecord(table, id) {
  if (!confirm("Bu kaydı silmek istediğine emin misin?")) return;
  const { error } = await sb.from(table).delete().eq("id", id);
  if (error) return toast("Silinemedi: " + error.message);
  closeModal();
}

function setSubmitting(is) {
  const btn = $("#f_submit");
  if (!btn) return;
  btn.disabled = is;
  btn.textContent = is ? "Kaydediliyor..." : "Kaydet";
}

// ============================================
// BAŞLAT
// ============================================
initLock();
loadAll();
setupRealtime();

// Service worker (PWA yüklenebilirliği için)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
