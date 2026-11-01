const state = {
  items: [],
  recipes: [],
  users: [],
  config: null,
  currentUser: { userId: null, email: null, role: null, isAdmin: false, isBuiltinAdmin: false },
  editing: null,
  editingModeIndex: -1,
  editingUserId: null,
  poll: null,
  aiAvailabilityPoll: null,
  aiAnswer: "",
  aiRawView: false,
  filters: {
    search: "",
    type: "",
    need: ""
  },
  recipeFilters: {
    search: "",
    category: "",
    rating: ""
  },
  itemHistory: [],
  historyDays: 90,
  selectedHistoryItemId: "",
  showAllUnused: false,
  expandedChart: null
};

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
  activateView(viewFromHash());
  await loadUserInfo();
  await Promise.all([loadConfig(), loadItems(), loadStorage(), loadAiAvailability(), loadRecipes()]);
  await loadItemHistory();
  state.aiAvailabilityPoll = setInterval(loadAiAvailability, 30000);
});

function bindEvents() {
  document.querySelectorAll("[data-view-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const view = link.dataset.viewLink;
      history.replaceState(null, "", `#${view}`);
      activateView(view);
    });
  });

  window.addEventListener("hashchange", () => activateView(viewFromHash()));

  $("refresh")?.addEventListener("click", loadItems);
  $("add-item")?.addEventListener("click", () => openItemModal());
  $("reset-form")?.addEventListener("click", closeItemModal);
  $("item-form")?.addEventListener("submit", saveItem);
  $("config-form")?.addEventListener("submit", saveConfig);
  $("import-form")?.addEventListener("submit", importJson);
  $("ai-test")?.addEventListener("click", startAiTest);
  $("ai-ask")?.addEventListener("click", startAiAsk);
  $("ai-raw-toggle")?.addEventListener("click", toggleAiRawView);
  $("ai-copy")?.addEventListener("click", copyAiResponse);
  $("ai-export")?.addEventListener("click", exportAiResponse);
  $("refresh-models")?.addEventListener("click", refreshModels);
  $("cfg-ai-provider")?.addEventListener("change", updateAiMaxTokensControl);
  $("add-mode")?.addEventListener("click", () => openModeModal());
  $("mode-form")?.addEventListener("submit", saveMode);
  $("cfg-ai-model-select")?.addEventListener("change", (event) => {
    if (event.target.value) {
      $("cfg-ai-model").value = event.target.value;
    }
  });

  $("filter-search")?.addEventListener("input", (event) => {
    state.filters.search = event.target.value.trim().toLowerCase();
    renderItems();
  });

  $("filter-type")?.addEventListener("change", (event) => {
    state.filters.type = event.target.value;
    renderItems();
  });

  $("filter-need")?.addEventListener("change", (event) => {
    state.filters.need = event.target.value;
    renderItems();
  });

  document.querySelectorAll("[data-config-tab]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      activateConfigSection(link.dataset.configTab);
    });
  });

  document.querySelectorAll("[data-close-modal]").forEach((el) => {
    el.addEventListener("click", closeItemModal);
  });

  document.querySelectorAll("[data-close-mode-modal]").forEach((el) => {
    el.addEventListener("click", closeModeModal);
  });

  document.querySelectorAll("[data-close-ai-modal]").forEach((el) => {
    el.addEventListener("click", closeAiResponseModal);
  });

  document.querySelectorAll("[data-close-user-modal]").forEach((el) => {
    el.addEventListener("click", closeUserModal);
  });

  document.querySelectorAll("[data-close-password-modal]").forEach((el) => {
    el.addEventListener("click", closePasswordModal);
  });

  $("user-form")?.addEventListener("submit", saveUser);
  $("set-password-form")?.addEventListener("submit", setPassword);
  $("add-user")?.addEventListener("click", () => openUserModal());
  $("save-auth-settings")?.addEventListener("click", saveAuthSettings);

  // Recipe events
  $("add-recipe")?.addEventListener("click", () => openRecipeModal());
  $("refresh-recipes")?.addEventListener("click", loadRecipes);
  $("recipe-form")?.addEventListener("submit", saveRecipe);
  $("recipe-form-cancel")?.addEventListener("click", closeRecipeModal);
  $("recipe-view-edit")?.addEventListener("click", switchRecipeToEditMode);
  $("recipe-view-export")?.addEventListener("click", exportCurrentRecipeTxt);
  $("ai-save-recipe")?.addEventListener("click", openSaveAsRecipeModal);

  document.querySelectorAll("[data-close-recipe-modal]").forEach((el) => {
    el.addEventListener("click", closeRecipeModal);
  });

  $("recipe-search")?.addEventListener("input", (event) => {
    state.recipeFilters.search = event.target.value.trim().toLowerCase();
    renderRecipes();
  });

  $("recipe-filter-category")?.addEventListener("change", (event) => {
    state.recipeFilters.category = event.target.value;
    renderRecipes();
  });

  $("recipe-filter-rating")?.addEventListener("change", (event) => {
    state.recipeFilters.rating = event.target.value;
    renderRecipes();
  });

  document.querySelectorAll("[data-stats-tab]").forEach((btn) => {
    btn.addEventListener("click", () => activateStatsTab(btn.dataset.statsTab));
  });
  $("usage-days")?.addEventListener("change", async (event) => {
    state.historyDays = Number(event.target.value) || 90;
    await loadItemHistory();
  });
  $("usage-item-select")?.addEventListener("change", (event) => {
    state.selectedHistoryItemId = event.target.value;
    renderUsageAnalytics();
  });
  $("usage-refresh")?.addEventListener("click", loadItemHistory);
  document.querySelectorAll(".chart-toggle-btn").forEach((btn) => {
    syncChartModeButton(btn.dataset.chart, btn);
    btn.addEventListener("click", () => handleChartToggle(btn.dataset.chart));
  });

  // Dynamically inject expand buttons into every chart card
  document.querySelectorAll(".chart-card").forEach((card) => {
    const head   = card.querySelector(".chart-card-head");
    const toggle = head?.querySelector("[data-chart]");
    if (!head || !toggle) return;
    const chartId = toggle.dataset.chart;
    const group = document.createElement("div");
    group.className = "chart-head-actions";
    head.removeChild(toggle);
    group.appendChild(toggle);
    const expandBtn = document.createElement("button");
    expandBtn.className = "button secondary chart-expand-btn";
    expandBtn.dataset.expandChart = chartId;
    expandBtn.title = "Expand chart";
    expandBtn.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;
    group.appendChild(expandBtn);
    head.appendChild(group);
    expandBtn.addEventListener("click", () => openChartExpanded(chartId));
  });

  $("chart-expanded-close")?.addEventListener("click", closeChartExpanded);
  $("chart-expanded-backdrop")?.addEventListener("click", closeChartExpanded);
  $("chart-expanded-toggle")?.addEventListener("click", handleExpandedToggle);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("chart-expanded-modal")?.hidden) closeChartExpanded();
  });

  bindToggle("[data-settings-toggle]", "display-settings");
  bindToggle("[data-ai-toggle]", "assistant");
}

function bindToggle(btnSelector, panelId) {
  const btn = document.querySelector(btnSelector);
  const panel = document.getElementById(panelId);
  if (!btn || !panel) return;
  btn.addEventListener("click", () => {
    const isOpen = btn.getAttribute("aria-expanded") === "true";
    if (isOpen) {
      btn.setAttribute("aria-expanded", "false");
      panel.setAttribute("hidden", "");
    } else {
      btn.setAttribute("aria-expanded", "true");
      panel.removeAttribute("hidden");
    }
  });
}

function viewFromHash() {
  const raw = location.hash.replace("#", "");
  return ["inventory", "config", "import-export", "recipes", "stats"].includes(raw) ? raw : "inventory";
}

function activateView(view) {
  document.querySelectorAll("[data-view]").forEach((section) => {
    section.classList.toggle("is-active", section.dataset.view === view);
  });
  document.querySelectorAll("[data-view-link]").forEach((link) => {
    link.classList.toggle("is-active", link.dataset.viewLink === view);
  });
  if (view === "stats") requestAnimationFrame(renderAllStats);
}

function activateConfigSection(tab) {
  document.querySelectorAll("[data-config-tab]").forEach((link) => {
    link.classList.toggle("is-active", link.dataset.configTab === tab);
  });
  document.querySelectorAll("[data-config-section]").forEach((section) => {
    section.classList.toggle("is-active", section.dataset.configSection === tab);
  });
  if (tab === "users") loadUsers();
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || response.statusText);
  }
  return response.json();
}

async function loadItems() {
  try {
    state.items = await api("/api/items");
    renderItems();
    renderStats();
    renderTypeFilter();
  } catch (error) {
    toast(`Inventory load failed: ${error.message}`);
  }
}

async function loadConfig() {
  try {
    state.config = await api("/api/config");
    // Populate AI mode dropdown for all users
    populateAiModeDropdown();
    // Only render config UI for admins
    if (state.currentUser.isAdmin) {
      renderConfig();
    }
  } catch (error) {
    toast(`Config load failed: ${error.message}`);
  }
}

async function loadStorage() {
  try {
    const storage = await api("/api/storage");
    $("storage-status").textContent = `Storage: ${storage.itemCount ?? 0} items`;
  } catch {
    $("storage-status").textContent = "Storage: unavailable";
  }
}

async function loadAiAvailability() {
  const pill = $("ai-availability-status");
  if (!pill) return;

  pill.textContent = "AI: checking...";
  pill.classList.remove("is-online", "is-offline", "is-disabled");
  try {
    const status = await api("/api/ai/availability");
    pill.classList.toggle("is-online", status.online);
    pill.classList.toggle("is-offline", !status.online && status.enabled);
    pill.classList.toggle("is-disabled", !status.enabled);
    pill.textContent = status.online
      ? "AI: online"
      : (status.enabled ? "AI: offline" : "AI: disabled");
    pill.title = status.online
      ? `${status.provider || "AI"} is reachable at ${status.baseUrl || "configured endpoint"}`
      : (status.error || status.status || "AI is not reachable");
  } catch (error) {
    pill.classList.add("is-offline");
    pill.textContent = "AI: offline";
    pill.title = error.message;
  }
}

function filteredItems() {
  return state.items.filter((item) => {
    const haystack = [
      item.type,
      item.brand,
      item.name,
      item.notes,
      ...(item.tags || [])
    ].join(" ").toLowerCase();
    const matchesSearch = !state.filters.search || haystack.includes(state.filters.search);
    const matchesType = !state.filters.type || item.type === state.filters.type;
    const matchesNeed = !state.filters.need
      || (state.filters.need === "yes" && item.needToBuy)
      || (state.filters.need === "no" && !item.needToBuy);
    return matchesSearch && matchesType && matchesNeed;
  });
}

function renderItems() {
  const body = $("items-body");
  body.innerHTML = "";
  for (const item of filteredItems()) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="item-actions-cell">
        <div class="item-actions">
          ${iconButton("view", "View item", "data-view-item", item.id)}
          ${iconButton("history", "View item history", "data-history-item", item.id)}
          ${iconButton("edit", "Edit item", "data-edit", item.id)}
          ${iconButton("delete", "Delete item", "data-delete", item.id, "danger-action")}
        </div>
      </td>
      <td data-label="Type">${escapeHtml(item.type)}</td>
      <td data-label="Brand">${escapeHtml(item.brand)}</td>
      <td data-label="Name">${escapeHtml(item.name)}</td>
      <td data-label="Size">${item.sizeMl ? item.sizeMl + " ml" : ""}</td>
      <td data-label="ABV">${item.abv != null && item.abv !== "" ? item.abv + "%" : ""}</td>
      <td data-label="Qty">${item.qty}</td>
      <td data-label="Left">${item.remainingPct != null ? item.remainingPct + "%" : ""}</td>
      <td data-label="Need">${item.needToBuy ? "Need to buy" : ""}</td>
      <td data-label="Rating">${item.rating > 0 ? item.rating + "/10" : ""}</td>
      <td data-label="Tags">${escapeHtml((item.tags || []).join(", "))}</td>
    `;
    body.appendChild(tr);
  }

  body.querySelectorAll("[data-view-item]").forEach((button) => {
    button.addEventListener("click", () => viewItem(button.dataset.viewItem));
  });

  body.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => editItem(button.dataset.edit));
  });

  body.querySelectorAll("[data-history-item]").forEach((button) => {
    button.addEventListener("click", () => openItemHistory(button.dataset.historyItem));
  });

  body.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteItem(button.dataset.delete));
  });
}

function renderStats() {
  $("stat-total").textContent = state.items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  $("stat-need").textContent = state.items.filter((item) => item.needToBuy).length;
  $("stat-low").textContent = state.items.filter((item) => item.remainingPct <= 25).length;
  $("stat-types").textContent = new Set(state.items.map((item) => item.type).filter(Boolean)).size;
}

function renderTypeFilter() {
  const select = $("filter-type");
  const current = select.value;
  const types = [...new Set(state.items.map((item) => item.type).filter(Boolean))].sort();
  select.innerHTML = `<option value="">All</option>${types.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join("")}`;
  select.value = types.includes(current) ? current : "";
}

function populateAiModeDropdown() {
  const cfg = state.config || {};
  $("ai-mode").innerHTML = (cfg.ai?.modes || []).map((mode) => `<option value="${escapeHtml(mode.id)}">${escapeHtml(mode.label)}</option>`).join("");
}

function renderConfig() {
  const cfg = state.config || {};
  $("cfg-types").value = (cfg.types || []).join("\n");
  $("cfg-sizes").value = (cfg.sizesMl || []).join("\n");
  $("cfg-abv").value = (cfg.abvPresets || []).join("\n");
  $("cfg-remain").value = (cfg.remainingPresets || []).join("\n");
  $("cfg-ai-enabled").value = cfg.ai?.enabled === false ? "false" : "true";
  $("cfg-ai-provider").value = cfg.ai?.provider || "lmstudio";
  $("cfg-ai-base").value = cfg.ai?.baseUrl || "";
  $("cfg-ai-model").value = cfg.ai?.model || "";
  renderModelOptions([cfg.ai?.model].filter(Boolean));
  $("cfg-ai-key").value = cfg.ai?.apiKey || "";
  $("cfg-ai-temperature").value = cfg.ai?.temperature ?? 0.2;
  $("cfg-ai-max-tokens").value = cfg.ai?.maxTokens ?? 0;
  updateAiMaxTokensControl();
  $("cfg-ai-timeout").value = cfg.ai?.timeoutSec ?? 180;
  $("cfg-ai-disable-thinking").value = cfg.ai?.disableThinking === false ? "false" : "true";
  $("cfg-ai-system-prompt").value = cfg.ai?.systemPrompt || "";
  const defaultAdminEl = $("cfg-auth-default-admin");
  if (defaultAdminEl) defaultAdminEl.checked = cfg.auth?.allowDefaultAdmin !== false;

  populateItemSelects();
  $("ai-modes-list").innerHTML = (cfg.ai?.modes || []).map((mode, index) => `
    <div class="mode-row">
      <div>
        <strong>${escapeHtml(mode.label)}</strong>
        <code>${escapeHtml(mode.id)}</code>
        <span>${mode.restrictToInventory ? "Inventory only" : "Unrestricted"}</span>
      </div>
      <p>${escapeHtml(mode.instruction)}</p>
      <div class="mode-actions">
        ${iconButton("edit", "Edit AI mode", "data-edit-mode", index)}
        ${iconButton("delete", "Delete AI mode", "data-delete-mode", index, "danger-action")}
      </div>
    </div>
  `).join("");

  document.querySelectorAll("[data-edit-mode]").forEach((button) => {
    button.addEventListener("click", () => openModeModal(Number(button.dataset.editMode)));
  });

  document.querySelectorAll("[data-delete-mode]").forEach((button) => {
    button.addEventListener("click", () => deleteMode(Number(button.dataset.deleteMode)));
  });
}

function populateItemSelects(values = {}) {
  const cfg = state.config || {};
  populateSelect($("type"), cfg.types || [], values.type || $("type")?.value || "", "Choose type");
  populateSelect($("sizeMl"), cfg.sizesMl || [], values.sizeMl ?? $("sizeMl")?.value ?? 750, "Choose size");
  populateSelect($("abv"), cfg.abvPresets || [], values.abv ?? $("abv")?.value ?? "", "");
  populateSelect($("remainingPct"), cfg.remainingPresets || [], values.remainingPct ?? $("remainingPct")?.value ?? 100, "Choose remaining");
}

function populateSelect(select, values, selected, emptyLabel, allowEmpty = false) {
  if (!select) return;
  const stringSelected = selected === null || selected === undefined ? "" : String(selected);
  const unique = [...new Set((values || []).map((value) => String(value)))];
  if (stringSelected && !unique.includes(stringSelected)) {
    unique.unshift(stringSelected);
  }
  const empty = allowEmpty ? `<option value="">${escapeHtml(emptyLabel)}</option>` : "";
  select.innerHTML = `${empty}${unique.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}`;
  select.value = allowEmpty && stringSelected === ""
    ? ""
    : (stringSelected && unique.includes(stringSelected) ? stringSelected : (unique[0] || ""));
}

function renderModelOptions(models = []) {
  const current = $("cfg-ai-model").value.trim();
  const unique = [...new Set([current, ...models].filter(Boolean))];
  $("cfg-ai-model-select").innerHTML = `<option value="">Manual / current model</option>${unique.map((model) => `<option value="${escapeHtml(model)}">${escapeHtml(model)}</option>`).join("")}`;
  $("cfg-ai-model-select").value = unique.includes(current) ? current : "";
}

async function refreshModels() {
  try {
    const result = await api("/api/ai/models");
    renderModelOptions(result.models || []);
    toast(result.ok ? `Loaded ${(result.models || []).length} model(s).` : `Model refresh failed: ${result.error}`);
  } catch (error) {
    toast(`Model refresh failed: ${error.message}`);
  }
}

function openItemModal(item = null, mode = "edit") {
  state.editing = item;

  if (mode === "view" && item) {
    $("form-title").textContent = `${item.brand} ${item.name}`.trim();
    $("item-prose").hidden = false;
    $("item-form").hidden = true;
    populateItemProse(item);
  } else {
    $("form-title").textContent = item ? "Edit item" : "Add item";
    $("item-prose").hidden = true;
    $("item-form").hidden = false;
    populateItemSelects(item || {});
    if (item) {
      $("item-id").value = item.id;
      $("item-version").value = item.version;
      $("type").value = item.type;
      $("brand").value = item.brand;
      $("name").value = item.name;
      $("sizeMl").value = item.sizeMl;
      $("abv").value = item.abv ?? "";
      $("qty").value = item.qty;
      $("remainingPct").value = item.remainingPct;
      $("rating").value = item.rating;
      $("needToBuy").checked = item.needToBuy;
      $("tags").value = (item.tags || []).join(", ");
      $("notes").value = item.notes || "";
    } else {
      resetForm();
      populateItemSelects({ sizeMl: 750, abv: "", remainingPct: 100 });
    }
    $("type").focus();
  }

  $("item-modal").hidden = false;
}

function closeItemModal() {
  $("item-modal").hidden = true;
  $("item-prose").hidden = true;
  $("item-form").hidden = false;
}

function populateItemProse(item) {
  const type     = escapeHtml(item.type || "");
  const brand    = escapeHtml(item.brand || "");
  const name     = escapeHtml(item.name || "");
  const sizeMl   = item.sizeMl || 750;
  const abv      = item.abv !== null && item.abv !== undefined ? Number(item.abv) : null;
  const qty      = Number(item.qty ?? 0);
  const remaining = Number(item.remainingPct ?? 100);
  const rating   = Number(item.rating || 0);
  const need     = Boolean(item.needToBuy);
  const tags     = (item.tags || []).map(escapeHtml);
  const notes    = escapeHtml(item.notes || "");

  $("view-kicker").textContent = type;
  $("view-name").innerHTML = brand
    ? `${brand} <span class="prose-sub">${name}</span>`
    : name;

  const chips = [
    `<span class="prose-chip">${sizeMl} mL</span>`,
    abv !== null ? `<span class="prose-chip">${abv}% ABV</span>` : "",
    `<span class="prose-chip">${qty} in stock</span>`,
    `<span class="prose-chip">${remaining}% remaining</span>`,
    rating > 0 ? `<span class="prose-chip is-rating">&#9733; ${rating}/10</span>` : "",
    need ? `<span class="prose-chip is-need">Need to buy</span>` : ""
  ].filter(Boolean).join("");
  $("view-chips").innerHTML = chips;

  let para = `A <strong>${sizeMl} mL</strong> ${type.toLowerCase()}`;
  if (abv !== null) para += ` at <strong>${abv}% ABV</strong>`;
  para += ".";
  if (qty === 0) {
    para += " <em>None currently in stock.</em>";
  } else if (qty === 1) {
    para += ` Currently <strong>1</strong> bottle in stock with <strong>${remaining}%</strong> remaining.`;
  } else {
    para += ` Currently <strong>${qty}</strong> bottles in stock — the open one is at <strong>${remaining}%</strong>.`;
  }
  if (rating > 0) {
    const label = rating >= 8 ? "Excellent — rated" : rating >= 6 ? "Good — rated" : "Rated";
    para += ` ${label} <strong>${rating}/10</strong>.`;
  }
  if (need) para += ` <em class="need-inline">Marked for restock.</em>`;
  $("view-para").innerHTML = para;

  let meta = "";
  if (tags.length > 0) {
    const pills = tags.map(t => `<span class="tag-pill">${t}</span>`).join("");
    meta += `<div class="prose-meta-row"><span class="prose-meta-label">Tags</span><div class="prose-tags">${pills}</div></div>`;
  }
  if (notes) {
    meta += `<div class="prose-meta-row"><span class="prose-meta-label">Notes</span><span class="prose-notes">${notes}</span></div>`;
  }
  $("view-meta").innerHTML = meta;
}

function viewItem(id) {
  const item = state.items.find((candidate) => candidate.id === id);
  if (!item) return;
  openItemModal(item, "view");
}

function editItem(id) {
  const item = state.items.find((candidate) => candidate.id === id);
  if (!item) return;
  openItemModal(item, "edit");
}

async function deleteItem(id) {
  const item = state.items.find((candidate) => candidate.id === id);
  if (!item) return;
  const name = `${item.brand} ${item.name}`.trim();
  if (!confirm(`Delete ${name}? This cannot be undone.`)) {
    return;
  }

  try {
    await api(`/api/item?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await Promise.all([loadItems(), loadStorage()]);
    await loadItemHistory();
    toast("Item deleted.");
  } catch (error) {
    toast(`Delete failed: ${error.message}`);
  }
}

async function saveItem(event) {
  event.preventDefault();
  const item = formItem();
  const isEdit = Boolean(item.id);
  try {
    await api("/api/item", {
      method: isEdit ? "PUT" : "POST",
      body: JSON.stringify(item)
    });
    resetForm();
    closeItemModal();
    await Promise.all([loadItems(), loadStorage()]);
    await loadItemHistory();
    toast("Item saved.");
  } catch (error) {
    toast(`Save failed: ${error.message}`);
  }
}

function formItem() {
  const abv = $("abv").value.trim();
  return {
    id: $("item-id").value,
    type: $("type").value.trim(),
    brand: $("brand").value.trim(),
    name: $("name").value.trim(),
    sizeMl: numberValue("sizeMl", 750),
    abv: abv === "" ? null : Number(abv),
    qty: numberValue("qty", 0),
    remainingPct: numberValue("remainingPct", 100),
    needToBuy: $("needToBuy").checked,
    rating: numberValue("rating", 0),
    tags: $("tags").value.split(",").map((tag) => tag.trim()).filter(Boolean),
    notes: $("notes").value,
    version: Number($("item-version").value || 0)
  };
}

function resetForm() {
  state.editing = null;
  $("form-title").textContent = "Add item";
  $("item-form").reset();
  $("item-id").value = "";
  $("item-version").value = "0";
  $("qty").value = "1";
  $("rating").value = "0";
  populateItemSelects({ sizeMl: 750, abv: "", remainingPct: 100 });
}

async function saveConfig(event) {
  event.preventDefault();
  state.config = collectConfigFromForm();

  try {
    await api("/api/config", { method: "PUT", body: JSON.stringify(state.config) });
    await loadConfig();
    await loadAiAvailability();
    toast("Config saved.");
  } catch (error) {
    toast(`Config save failed: ${error.message}`);
  }
}

function collectConfigFromForm() {
  const existingAi   = state.config?.ai || {};
  const existingAuth = state.config?.auth || {};
  return {
    types: listStrings($("cfg-types").value),
    sizesMl: listNumbers($("cfg-sizes").value),
    abvPresets: listNumbers($("cfg-abv").value),
    remainingPresets: listNumbers($("cfg-remain").value),
    ai: {
      ...existingAi,
      enabled: $("cfg-ai-enabled").value === "true",
      provider: $("cfg-ai-provider").value,
      baseUrl: $("cfg-ai-base").value.trim(),
      model: $("cfg-ai-model").value.trim(),
      apiKey: $("cfg-ai-key").value,
      temperature: numberValue("cfg-ai-temperature", existingAi.temperature ?? 0.2),
      maxTokens: numberValue("cfg-ai-max-tokens", existingAi.maxTokens ?? 0),
      timeoutSec: numberValue("cfg-ai-timeout", existingAi.timeoutSec ?? 180),
      disableThinking: $("cfg-ai-disable-thinking").value === "true",
      systemPrompt: $("cfg-ai-system-prompt").value,
      modes: state.config?.ai?.modes || existingAi.modes || []
    },
    auth: {
      ...existingAuth,
      allowDefaultAdmin: $("cfg-auth-default-admin")?.checked ?? (existingAuth.allowDefaultAdmin ?? true)
    }
  };
}

function updateAiMaxTokensControl() {
  const input = $("cfg-ai-max-tokens");
  if (!input) return;

  const usesLmStudioDefaults = $("cfg-ai-provider").value === "lmstudio";
  input.disabled = usesLmStudioDefaults;
  if (usesLmStudioDefaults) input.value = "0";
}

function openModeModal(index = -1) {
  state.config = collectConfigFromForm();
  const modes = state.config?.ai?.modes || [];
  const mode = index >= 0 ? modes[index] : null;
  state.editingModeIndex = index;
  $("mode-form-title").textContent = mode ? "Edit Mode" : "Add Mode";
  $("mode-index").value = String(index);
  $("mode-label").value = mode?.label || "";
  $("mode-id").value = mode?.id || "";
  $("mode-instruction").value = mode?.instruction || "";
  $("mode-system-prompt").value = mode?.systemPrompt || "";
  $("mode-restrict").checked = !!mode?.restrictToInventory;
  $("mode-modal").hidden = false;
  $("mode-label").focus();
}

function closeModeModal() {
  $("mode-modal").hidden = true;
}

function saveMode(event) {
  event.preventDefault();
  const modes = [...(state.config?.ai?.modes || [])];
  const index = Number($("mode-index").value);
  const mode = {
    label: $("mode-label").value.trim(),
    id: normalizeModeId($("mode-id").value || $("mode-label").value),
    instruction: $("mode-instruction").value.trim(),
    systemPrompt: $("mode-system-prompt").value,
    restrictToInventory: $("mode-restrict").checked
  };

  if (!mode.label || !mode.id || !mode.instruction) {
    toast("Mode label, ID, and instruction are required.");
    return;
  }

  const duplicate = modes.some((candidate, candidateIndex) =>
    candidateIndex !== index && candidate.id.toLowerCase() === mode.id.toLowerCase());
  if (duplicate) {
    toast("Mode ID must be unique.");
    return;
  }

  if (index >= 0) {
    modes[index] = mode;
  } else {
    modes.push(mode);
  }

  state.config = {
    ...(state.config || {}),
    ai: {
      ...(state.config?.ai || {}),
      modes
    }
  };
  renderConfig();
  populateAiModeDropdown();
  closeModeModal();
}

function deleteMode(index) {
  state.config = collectConfigFromForm();
  const modes = [...(state.config?.ai?.modes || [])];
  const mode = modes[index];
  if (!mode) return;
  if (!confirm(`Delete AI mode "${mode.label}"? Save Config to persist this change.`)) {
    return;
  }
  modes.splice(index, 1);
  state.config = {
    ...(state.config || {}),
    ai: {
      ...(state.config?.ai || {}),
      modes
    }
  };
  renderConfig();
  populateAiModeDropdown();
  toast("Mode removed. Save Config to persist.");
}

function normalizeModeId(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

async function importJson(event) {
  event.preventDefault();
  const file = $("import-file").files?.[0];
  if (!file) {
    toast("Choose a JSON export first.");
    return;
  }

  try {
    const bundle = JSON.parse(await file.text());
    const result = await api("/api/import?mode=merge", {
      method: "POST",
      body: JSON.stringify(bundle)
    });
    await Promise.all([loadConfig(), loadItems(), loadStorage()]);
    toast(`Import complete. Added ${result.addCount ?? 0}, updated ${result.updateCount ?? 0}, conflicts ${result.conflictCount ?? 0}.`);
    $("import-form").reset();
  } catch (error) {
    toast(`Import failed: ${error.message}`);
  }
}

async function startAiTest() {
  try {
    const result = await api("/api/ai/test", { method: "POST", body: "{}" });
    showAiAnswer(`Test started: ${result.token}`);
    loadAiAvailability();
    activateView("inventory");
    pollAi();
  } catch (error) {
    toast(`AI test failed: ${error.message}`);
  }
}

async function startAiAsk() {
  try {
    const result = await api("/api/ai/ask", {
      method: "POST",
      body: JSON.stringify({
        question: $("ai-question").value,
        includeInventory: $("ai-include").checked,
        mode: $("ai-mode").value
      })
    });
    showAiAnswer(`Request started: ${result.token}`);
    loadAiAvailability();
    pollAi();
  } catch (error) {
    toast(`AI request failed: ${error.message}`);
  }
}

function pollAi() {
  clearInterval(state.poll);
  state.poll = setInterval(async () => {
    const status = await api("/api/ai/status");
    if (!status.done) {
      showAiAnswer("Working...");
      return;
    }
    clearInterval(state.poll);
    showAiAnswer(status.ok ? status.answer : `Error: ${status.error}`);
    loadAiAvailability();
  }, 1500);
}

function showAiAnswer(message) {
  state.aiAnswer = message;
  state.aiRawView = false;
  $("ai-response-modal").hidden = false;
  renderAiResponse();
}


function renderAiResponse() {
  $("ai-response-md").hidden = state.aiRawView;
  $("ai-response-raw").hidden = !state.aiRawView;
  $("ai-raw-toggle").textContent = state.aiRawView ? "Markdown View" : "Raw View";
  $("ai-response-raw").textContent = state.aiAnswer;
  $("ai-response-md").innerHTML = markdownToHtml(state.aiAnswer);
}

function toggleAiRawView() {
  state.aiRawView = !state.aiRawView;
  renderAiResponse();
}

async function copyAiResponse() {
  try {
    await navigator.clipboard.writeText(state.aiAnswer);
    toast("AI response copied.");
  } catch {
    const area = document.createElement("textarea");
    area.value = state.aiAnswer;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
    toast("AI response copied.");
  }
}

function exportAiResponse() {
  const blob = new Blob([state.aiAnswer], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `libation-locker-ai-response-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function closeAiResponseModal() {
  $("ai-response-modal").hidden = true;
}

function numberValue(id, fallback) {
  const value = Number($(id).value);
  return Number.isFinite(value) ? value : fallback;
}

function listStrings(value) {
  return value.split(/\r?\n|,/).map((part) => part.trim()).filter(Boolean);
}

function listNumbers(value) {
  return value.split(/\r?\n|,/).map((part) => Number(part.trim())).filter(Number.isFinite);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function iconButton(icon, label, attr, value, extraClass = "") {
  return `<button class="button icon-row-action ${extraClass}" type="button" ${attr}="${escapeHtml(value)}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${iconSvg(icon)}</button>`;
}

function iconSvg(icon) {
  const paths = {
    view:   '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    edit:   '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/>',
    delete: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/><path d="M10 11v5"/><path d="M14 11v5"/>',
    history:'<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/>',
    key:    '<circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2L13 10"/><path d="M15 6l2 2"/><path d="M18 3l2 2"/>',
    export: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths[icon] || ""}</svg>`;
}

function markdownToHtml(markdown) {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let paragraph = [];
  let listOpen = false;
  let codeOpen = false;
  let codeLines = [];
  let tableRows = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };
  const closeList = () => {
    if (listOpen) {
      html.push("</ul>");
      listOpen = false;
    }
  };
  const flushTable = () => {
    if (tableRows.length) {
      html.push(renderMarkdownTable(tableRows));
      tableRows = [];
    }
  };
  const closeBlocks = () => {
    flushParagraph();
    closeList();
    flushTable();
  };

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (line.trim().startsWith("```")) {
      if (codeOpen) {
        html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        codeLines = [];
        codeOpen = false;
      } else {
        closeBlocks();
        codeOpen = true;
      }
      continue;
    }
    if (codeOpen) {
      codeLines.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      closeBlocks();
      continue;
    }

    if (isMarkdownTableCandidate(trimmed)) {
      const next = lines[index + 1]?.trim() || "";
      if (!tableRows.length && isMarkdownTableSeparator(next)) {
        flushParagraph();
        closeList();
        tableRows.push(trimmed, next);
        index++;
        continue;
      }
      if (tableRows.length) {
        tableRows.push(trimmed);
        continue;
      }
    } else if (tableRows.length) {
      flushTable();
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      closeBlocks();
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const list = trimmed.match(/^[-*]\s+(.+)$/);
    if (list) {
      flushParagraph();
      if (!listOpen) {
        html.push("<ul>");
        listOpen = true;
      }
      html.push(`<li>${inlineMarkdown(list[1])}</li>`);
      continue;
    }

    paragraph.push(trimmed);
  }

  if (codeOpen) {
    html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
  }
  flushParagraph();
  closeList();
  flushTable();
  return html.join("");
}

function inlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function isMarkdownTableCandidate(line) {
  return line.includes("|") && splitMarkdownTableRow(line).length > 1;
}

function isMarkdownTableSeparator(line) {
  const cells = splitMarkdownTableRow(line);
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function splitMarkdownTableRow(line) {
  return line
    .replace(/^\s*\|?/, "")
    .replace(/\|?\s*$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderMarkdownTable(rows) {
  if (rows.length < 2 || !isMarkdownTableSeparator(rows[1])) {
    return `<p>${inlineMarkdown(rows.join(" "))}</p>`;
  }

  const headers = splitMarkdownTableRow(rows[0]);
  const alignments = splitMarkdownTableRow(rows[1]).map((cell) => {
    const value = cell.trim();
    if (value.startsWith(":") && value.endsWith(":")) return "center";
    if (value.endsWith(":")) return "right";
    return "";
  });
  const bodyRows = rows.slice(2).map(splitMarkdownTableRow);

  const head = headers.map((header, index) => markdownTableCell("th", header, alignments[index])).join("");
  const body = bodyRows.map((row) => {
    const cells = headers.map((_, index) => markdownTableCell("td", row[index] || "", alignments[index]));
    return `<tr>${cells.join("")}</tr>`;
  }).join("");

  return `<div class="markdown-table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function markdownTableCell(tag, value, align) {
  const style = align ? ` style="text-align: ${align}"` : "";
  return `<${tag}${style}>${inlineMarkdown(value)}</${tag}>`;
}

// ── User info & role gating ───────────────────────────────────────────────────

async function loadUserInfo() {
  try {
    state.currentUser = await api("/api/me");
  } catch {
    state.currentUser = { userId: null, email: null, role: null, isAdmin: false, isBuiltinAdmin: false };
  }
  applyRoleGating();
}

function applyRoleGating() {
  const isAdmin = state.currentUser?.isAdmin;
  document.querySelectorAll(".admin-only").forEach((el) => { el.hidden = !isAdmin; });
  document.querySelectorAll(".non-admin-only").forEach((el) => { el.hidden = !!isAdmin; });
}

// ── Auth settings ─────────────────────────────────────────────────────────────

async function saveAuthSettings() {
  try {
    const current = await api("/api/config");
    const updated = {
      ...current,
      auth: { ...current.auth, allowDefaultAdmin: $("cfg-auth-default-admin")?.checked ?? true }
    };
    await api("/api/config", { method: "PUT", body: JSON.stringify(updated) });
    state.config = updated;
    toast("Access settings saved.");
  } catch (error) {
    toast(`Save failed: ${error.message}`);
  }
}

// ── User management ───────────────────────────────────────────────────────────

async function loadUsers() {
  if (!state.currentUser?.isAdmin) return;
  try {
    state.users = await api("/api/users");
    renderUsers();
  } catch (error) {
    toast(`User load failed: ${error.message}`);
  }
}

function renderUsers() {
  const list = $("user-list");
  if (!list) return;
  if (!state.users.length) {
    list.innerHTML = `<p class="muted-copy" style="padding:8px 0">No users yet. Add one below.</p>`;
    return;
  }
  list.innerHTML = state.users.map((u) => `
    <div class="user-row${u.isActive ? "" : " user-inactive"}">
      <div class="user-row-info">
        <span class="user-email">${escapeHtml(u.email)}</span>
        <span class="role-badge role-${escapeHtml(u.role)}">${u.role === "admin" ? "Admin" : "User"}</span>
        ${!u.isActive ? `<span class="inactive-badge">Inactive</span>` : ""}
      </div>
      <div class="user-row-actions">
        ${iconButton("edit",   "Edit user",          "data-edit-user",     u.id)}
        ${iconButton("key",    "Change password",    "data-user-password", u.id)}
        ${iconButton("delete", "Delete user",        "data-delete-user",   u.id, "danger-action")}
      </div>
    </div>
  `).join("");

  list.querySelectorAll("[data-edit-user]").forEach((btn) => {
    btn.addEventListener("click", () => openUserModal(state.users.find((u) => u.id === btn.dataset.editUser)));
  });
  list.querySelectorAll("[data-user-password]").forEach((btn) => {
    btn.addEventListener("click", () => openPasswordModal(btn.dataset.userPassword));
  });
  list.querySelectorAll("[data-delete-user]").forEach((btn) => {
    btn.addEventListener("click", () => deleteUser(btn.dataset.deleteUser));
  });
}

function openUserModal(user = null) {
  state.editingUserId = user?.id ?? null;
  $("user-modal-title").textContent = user ? "Edit User" : "Add User";
  $("user-id").value      = user?.id      ?? "";
  $("user-email").value   = user?.email   ?? "";
  $("user-role").value    = user?.role    ?? "user";
  $("user-active").checked = user?.isActive ?? true;

  const pwSection = $("user-password-section");
  const pwInput   = $("user-password");
  if (user) {
    pwSection?.setAttribute("hidden", "");
    if (pwInput) { pwInput.required = false; pwInput.disabled = true; pwInput.value = ""; }
  } else {
    pwSection?.removeAttribute("hidden");
    if (pwInput) { pwInput.required = true; pwInput.disabled = false; pwInput.value = ""; }
  }

  $("user-modal").removeAttribute("hidden");
  $("user-email").focus();
}

function closeUserModal() {
  $("user-modal").setAttribute("hidden", "");
  $("user-form").reset();
  state.editingUserId = null;
}

async function saveUser(event) {
  event.preventDefault();
  const id       = $("user-id").value;
  const email    = $("user-email").value.trim();
  const role     = $("user-role").value;
  const isActive = $("user-active").checked;
  const password = $("user-password")?.value ?? "";
  const isNew    = !id;

  if (isNew && !password) {
    toast("Password is required for new users.");
    return;
  }

  try {
    if (isNew) {
      await api("/api/users", { method: "POST", body: JSON.stringify({ email, password, role }) });
    } else {
      await api(`/api/users/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify({ email, role, isActive }) });
    }
    closeUserModal();
    await loadUsers();
    toast(isNew ? "User created." : "User updated.");
  } catch (error) {
    toast(`Save failed: ${error.message}`);
  }
}

async function deleteUser(id) {
  const user = state.users.find((u) => u.id === id);
  if (!user) return;
  if (!confirm(`Delete user "${user.email}"? This cannot be undone.`)) return;
  try {
    await api(`/api/users/${encodeURIComponent(id)}`, { method: "DELETE" });
    await loadUsers();
    toast("User deleted.");
  } catch (error) {
    toast(`Delete failed: ${error.message}`);
  }
}

function openPasswordModal(userId) {
  $("password-user-id").value = userId;
  $("new-password").value     = "";
  $("confirm-password").value = "";
  $("set-password-modal").hidden = false;
  $("new-password").focus();
}

function closePasswordModal() {
  $("set-password-modal").hidden = true;
  $("set-password-form").reset();
}

async function setPassword(event) {
  event.preventDefault();
  const id       = $("password-user-id").value;
  const password = $("new-password").value;
  const confirm  = $("confirm-password").value;

  if (password !== confirm) {
    toast("Passwords do not match.");
    return;
  }
  if (password.length < 6) {
    toast("Password must be at least 6 characters.");
    return;
  }

  try {
    await api(`/api/users/${encodeURIComponent(id)}/password`, { method: "PUT", body: JSON.stringify({ password }) });
    closePasswordModal();
    toast("Password updated.");
  } catch (error) {
    toast(`Password change failed: ${error.message}`);
  }
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 3600);
}

// ── Statistics ─────────────────────────────────────────────────────────────────

// Start every chart in an SVG-based 2D mode, including browsers with WebGL.
const chartModes = {
  "inv-type-qty": "alt", "inv-abv-rating": "alt", "inv-ratings": "alt",
  "rec-category": "alt", "rec-ratings": "alt"
};

let webGlAvailable;
function supportsChartWebGl() {
  if (webGlAvailable !== undefined) return webGlAvailable;
  try {
    const canvas = document.createElement("canvas");
    const options = { failIfMajorPerformanceCaveat: true };
    const gl = canvas.getContext("webgl", options) || canvas.getContext("experimental-webgl", options);
    webGlAvailable = Boolean(gl && !gl.isContextLost());
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webGlAvailable = false;
  }
  return webGlAvailable;
}

function chartModeNeedsWebGl(chartId, isPrimary) {
  if (chartId === "inv-remaining") return !isPrimary;
  return ["inv-type-qty", "inv-abv-rating", "inv-ratings", "rec-category", "rec-ratings"].includes(chartId) && isPrimary;
}

function syncChartModeButton(chartId, button) {
  const def = CHART_DEFS[chartId];
  if (!def || !button) return;
  const isPrimary = chartModes[chartId] !== "alt";
  const unavailable = chartModeNeedsWebGl(chartId, !isPrimary) && !supportsChartWebGl();
  button.disabled = unavailable;
  button.textContent = unavailable ? "3D unavailable" : isPrimary ? def.labelP : def.labelA;
  button.title = unavailable ? "3D needs WebGL, which is unavailable in this browser. The 2D chart remains available." : "";
}

function toggleChartMode(chartId) {
  const nextIsPrimary = chartModes[chartId] === "alt";
  if (chartModeNeedsWebGl(chartId, nextIsPrimary) && !supportsChartWebGl()) return false;
  chartModes[chartId] = nextIsPrimary ? "primary" : "alt";
  syncChartModeButton(chartId, document.querySelector(`[data-chart="${chartId}"]`));
  return true;
}

const PALETTE = [
  "#c0392b", "#d35400", "#e67e22", "#f39c12",
  "#27ae60", "#16a085", "#2980b9", "#8e44ad",
  "#1abc9c", "#e74c3c"
];

function statsTheme() {
  const s = getComputedStyle(document.documentElement);
  const g = (v) => s.getPropertyValue(v).trim();
  return {
    text:   g("--text")      || "#2c1810",
    muted:  g("--muted")     || "#8a7060",
    border: g("--border")    || "#d4c4b0",
  };
}

function basePlotLayout(extra = {}) {
  const t = statsTheme();
  return {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor:  "rgba(0,0,0,0)",
    font: { family: "inherit", color: t.text, size: 12 },
    margin: { l: 50, r: 16, t: 12, b: 50 },
    colorway: PALETTE,
    ...extra
  };
}

function plotConfig() {
  return {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ["lasso2d", "select2d", "autoScale2d", "toImage"],
    displaylogo: false
  };
}

function plot3dConfig() {
  return { responsive: true, displayModeBar: true, displaylogo: false };
}

let plotElOverride = null;

function plotEl(id, traces, layout, cfg) {
  const targetId = plotElOverride || id;
  const el = document.getElementById(targetId);
  if (!el || typeof Plotly === "undefined") return;
  if (el._llPlotted) {
    Plotly.react(el, traces, layout, cfg);
  } else {
    Plotly.newPlot(el, traces, layout, cfg);
    el._llPlotted = true;
  }
}

function showNoData(id, msg) {
  const el = document.getElementById(plotElOverride || id);
  if (!el) return;
  if (el._llPlotted && typeof Plotly !== "undefined") {
    Plotly.purge(el);
    el._llPlotted = false;
  }
  disposeUsageChart(el);
  el.innerHTML = `<div class="chart-no-data">${escapeHtml(msg)}</div>`;
}

function make3dBar(xi, zTop, hw, color) {
  const x0 = xi - hw, x1 = xi + hw, d = 0.36;
  return {
    type: "mesh3d",
    x: [x0,x1,x1,x0, x0,x1,x1,x0],
    y: [-d,-d, d, d, -d,-d, d, d],
    z: [ 0, 0, 0, 0, zTop,zTop,zTop,zTop],
    i: [0,0, 4,4, 0,0, 1,1, 0,0, 3,3],
    j: [1,2, 6,7, 3,7, 5,6, 4,5, 2,6],
    k: [2,3, 5,6, 7,4, 6,2, 5,1, 6,7],
    color, flatshading: true, showscale: false,
    hoverinfo: "skip", opacity: 0.93
  };
}

function label3d(xi, zTop, text, textColor) {
  return {
    type: "scatter3d", mode: "text",
    x: [xi], y: [0], z: [zTop + Math.max(zTop * 0.06, 0.25)],
    text: [text], textfont: { color: textColor, size: 10 },
    showlegend: false, hoverinfo: "skip"
  };
}

// ── Inventory Charts ──────────────────────────────────────────────────────────

function renderChartInvTypeQty(isPrimary) {
  const id = "chart-inv-type-qty";
  if (!state.items.length) { showNoData(id, "No inventory data yet."); return; }
  const byType = {};
  state.items.forEach((item) => { byType[item.type] = (byType[item.type] || 0) + item.qty; });
  const types = Object.keys(byType).sort();
  const qtys  = types.map((t) => byType[t]);
  const tc = statsTheme();

  if (isPrimary) {
    const bars = types.map((_, i) => make3dBar(i, qtys[i] || 0, 0.4, PALETTE[i % PALETTE.length]));
    const labels = types.map((_, i) => label3d(i, qtys[i] || 0, String(qtys[i]), tc.text));
    plotEl(id, [...bars, ...labels], basePlotLayout({
      scene: {
        xaxis: { tickvals: types.map((_,i) => i), ticktext: types, title: "", tickfont: { size: 10 } },
        yaxis: { visible: false, range: [-1,1] },
        zaxis: { title: "Bottles", titlefont: { size: 10 } },
        camera: { eye: { x: 1.5, y: -1.9, z: 1.3 } },
        bgcolor: "rgba(0,0,0,0)",
        aspectmode: "manual", aspectratio: { x: 1.8, y: 0.5, z: 1 }
      },
      showlegend: false, margin: { l:0,r:0,t:12,b:0 }
    }), plot3dConfig());
  } else {
    plotEl(id, [{
      type: "bar", orientation: "h", x: qtys, y: types,
      marker: { color: types.map((_,i) => PALETTE[i % PALETTE.length]) },
      text: qtys.map(String), textposition: "outside",
      hovertemplate: "%{y}: %{x} bottles<extra></extra>"
    }], basePlotLayout({
      xaxis: { title: "Bottles", gridcolor: tc.border },
      yaxis: { automargin: true },
      showlegend: false, margin: { l:100,r:50,t:12,b:40 }
    }), plotConfig());
  }
}

function renderChartInvAbvRating(isPrimary) {
  const id = "chart-inv-abv-rating";
  const items = state.items.filter((i) => i.abv != null && i.rating > 0);
  if (!items.length) { showNoData(id, "No items with both ABV and rating set."); return; }
  const types = [...new Set(items.map((i) => i.type))].sort();
  const cmap  = Object.fromEntries(types.map((tp,i) => [tp, PALETTE[i % PALETTE.length]]));
  const tc = statsTheme();

  if (isPrimary) {
    const traces = types.map((tp) => {
      const sub = items.filter((i) => i.type === tp);
      return {
        type: "scatter3d", mode: "markers", name: tp,
        x: sub.map((i) => +i.abv), y: sub.map((i) => i.rating), z: sub.map((i) => i.qty),
        text: sub.map((i) => `${i.brand} ${i.name}`),
        hovertemplate: "<b>%{text}</b><br>ABV: %{x}%<br>Rating: %{y}/10<br>Qty: %{z}<extra></extra>",
        marker: { size: sub.map((i) => 5 + i.qty * 2.5), color: cmap[tp], opacity: 0.85,
                  line: { color: "rgba(255,255,255,0.3)", width: 1 } }
      };
    });
    plotEl(id, traces, basePlotLayout({
      scene: {
        xaxis: { title: "ABV %", titlefont: { size: 10 } },
        yaxis: { title: "Rating", titlefont: { size: 10 } },
        zaxis: { title: "Qty", titlefont: { size: 10 } },
        camera: { eye: { x: 1.6, y: -1.6, z: 1.1 } }, bgcolor: "rgba(0,0,0,0)"
      },
      margin: { l:0,r:0,t:12,b:0 },
      legend: { font:{ size:10 }, bgcolor:"rgba(0,0,0,0)", x:0, y:1 }
    }), plot3dConfig());
  } else {
    const traces = types.map((tp) => {
      const sub = items.filter((i) => i.type === tp);
      return {
        type: "scatter", mode: "markers", name: tp,
        x: sub.map((i) => +i.abv), y: sub.map((i) => i.rating),
        text: sub.map((i) => `${i.brand} ${i.name}`),
        hovertemplate: "<b>%{text}</b><br>ABV: %{x}%<br>Rating: %{y}/10<extra></extra>",
        marker: { size: sub.map((i) => 9 + i.qty * 2), color: cmap[tp], opacity: 0.8,
                  line: { color: "white", width: 1 } }
      };
    });
    const tc2 = statsTheme();
    plotEl(id, traces, basePlotLayout({
      xaxis: { title: "ABV %", gridcolor: tc2.border },
      yaxis: { title: "Rating (0–10)", gridcolor: tc2.border, range:[0,11] },
      legend: { font:{ size:10 }, bgcolor:"rgba(0,0,0,0)" }
    }), plotConfig());
  }
}

function renderChartInvStatus(isPrimary) {
  const id = "chart-inv-status";
  const tc = statsTheme();
  if (!state.items.length) { showNoData(id, "No inventory data yet."); return; }

  if (isPrimary) {
    const need = state.items.filter((i) => i.needToBuy).length;
    const have = state.items.filter((i) => !i.needToBuy).length;
    plotEl(id, [{
      type: "pie", hole: 0.55, labels: ["Need to Buy","Have"],
      values: [need, have], marker: { colors: ["#e05252","#27ae60"] },
      textinfo: "label+percent",
      hovertemplate: "%{label}: %{value} items (%{percent})<extra></extra>"
    }], basePlotLayout({
      showlegend: true,
      legend: { font:{ size:11 }, bgcolor:"rgba(0,0,0,0)", orientation:"h", y:-0.12 },
      margin: { l:20,r:20,t:12,b:30 },
      annotations: [{ text:`<b>${state.items.length}</b><br>items`, showarrow:false,
                      font:{ size:14, color:tc.text }, x:0.5, y:0.5 }]
    }), plotConfig());
  } else {
    const types = [...new Set(state.items.map((i) => i.type))].sort();
    plotEl(id, [
      { type:"bar", name:"Have",        x:types,
        y:types.map((tp) => state.items.filter((i) => i.type===tp && !i.needToBuy).length),
        marker:{ color:"#27ae60" }, hovertemplate:"%{x}: %{y} have<extra></extra>" },
      { type:"bar", name:"Need to Buy", x:types,
        y:types.map((tp) => state.items.filter((i) => i.type===tp && i.needToBuy).length),
        marker:{ color:"#e05252" }, hovertemplate:"%{x}: %{y} need<extra></extra>" }
    ], basePlotLayout({
      barmode:"stack",
      xaxis:{ automargin:true, gridcolor:"transparent" },
      yaxis:{ title:"Items", gridcolor:tc.border },
      legend:{ font:{size:11}, bgcolor:"rgba(0,0,0,0)", orientation:"h", y:-0.22 },
      margin:{ l:50,r:16,t:12,b:70 }
    }), plotConfig());
  }
}

function renderChartInvRatings(isPrimary) {
  const id = "chart-inv-ratings";
  const tc = statsTheme();
  const rated = state.items.filter((i) => i.rating > 0);
  if (!rated.length) { showNoData(id, "No items have been rated yet."); return; }
  const counts = Array.from({ length:10 }, (_,i) => rated.filter((it) => it.rating === i+1).length);
  const labels = Array.from({ length:10 }, (_,i) => String(i+1));

  if (isPrimary) {
    const bars = labels.map((_, i) => make3dBar(i, counts[i]||0, 0.4, PALETTE[i % PALETTE.length]));
    const lbls = labels.map((_, i) => label3d(i, counts[i]||0, counts[i]>0 ? String(counts[i]):"", tc.text));
    plotEl(id, [...bars, ...lbls], basePlotLayout({
      scene: {
        xaxis:{ tickvals:labels.map((_,i)=>i), ticktext:labels, title:"Rating", titlefont:{size:10} },
        yaxis:{ visible:false, range:[-1,1] },
        zaxis:{ title:"Items", titlefont:{size:10} },
        camera:{ eye:{ x:1.5, y:-1.9, z:1.3 } }, bgcolor:"rgba(0,0,0,0)",
        aspectmode:"manual", aspectratio:{ x:2, y:0.5, z:1 }
      },
      showlegend:false, margin:{ l:0,r:0,t:12,b:0 }
    }), plot3dConfig());
  } else {
    plotEl(id, [{
      type:"bar", x:labels, y:counts,
      marker:{ color:labels.map((_,i) => PALETTE[i % PALETTE.length]) },
      text:counts.map((c) => c>0?String(c):""), textposition:"outside",
      hovertemplate:"Rating %{x}: %{y} items<extra></extra>"
    }], basePlotLayout({
      xaxis:{ title:"Rating (1–10)", gridcolor:"transparent" },
      yaxis:{ title:"Items", gridcolor:tc.border },
      showlegend:false
    }), plotConfig());
  }
}

function renderChartInvRemaining(isPrimary) {
  const id = "chart-inv-remaining";
  const tc = statsTheme();
  if (!state.items.length) { showNoData(id, "No inventory data yet."); return; }
  const types = [...new Set(state.items.map((i) => i.type))].sort();

  if (!isPrimary) {
    // 3D scatter: each item plotted as a sphere, color = remaining%
    plotEl(id, [{
      type:"scatter3d", mode:"markers",
      x: state.items.map((i) => types.indexOf(i.type)),
      y: state.items.map((i) => i.qty),
      z: state.items.map((i) => i.remainingPct),
      text: state.items.map((i) => `${i.brand} ${i.name}`),
      hovertemplate:"<b>%{text}</b><br>Qty: %{y}<br>Remaining: %{z}%<extra></extra>",
      marker:{
        size:6,
        color: state.items.map((i) => i.remainingPct),
        colorscale:[[0,"#e05252"],[0.25,"#e07a52"],[0.5,"#e0c452"],[1,"#27ae60"]],
        showscale:true, colorbar:{ title:"%", thickness:12, titlefont:{size:10} }
      }
    }], basePlotLayout({
      scene:{
        xaxis:{ tickvals:types.map((_,i)=>i), ticktext:types, title:"", tickfont:{size:9} },
        yaxis:{ title:"Qty", titlefont:{size:10} },
        zaxis:{ title:"Remaining %", titlefont:{size:10} },
        camera:{ eye:{ x:1.5, y:-1.5, z:1.1 } }, bgcolor:"rgba(0,0,0,0)"
      },
      showlegend:false, margin:{ l:0,r:0,t:12,b:0 }
    }), plot3dConfig());
  } else {
    // 2D bar: avg remaining % per type, coloured by level
    const avgs = types.map((tp) => {
      const g = state.items.filter((i) => i.type === tp);
      return g.length ? Math.round(g.reduce((s,i) => s + i.remainingPct, 0) / g.length) : 0;
    });
    plotEl(id, [{
      type:"bar", x:types, y:avgs,
      marker:{ color:avgs.map((p) => p>=75?"#27ae60":p>=40?"#e0c452":p>=15?"#e07a52":"#e05252") },
      text:avgs.map((p) => p+"%"), textposition:"outside",
      hovertemplate:"%{x}: avg %{y}% remaining<extra></extra>"
    }], basePlotLayout({
      xaxis:{ automargin:true, gridcolor:"transparent" },
      yaxis:{ title:"Avg remaining %", range:[0,120], gridcolor:tc.border },
      showlegend:false, margin:{ l:55,r:16,t:12,b:70 }
    }), plotConfig());
  }
}

function renderChartInvSizes(isPrimary) {
  const id = "chart-inv-sizes";
  if (!state.items.length) { showNoData(id, "No inventory data yet."); return; }
  const sizeCount = {};
  state.items.forEach((i) => {
    const lbl = i.sizeMl >= 1000 && i.sizeMl % 1000 === 0 ? (i.sizeMl/1000)+"L" : i.sizeMl+"mL";
    sizeCount[lbl] = (sizeCount[lbl] || 0) + 1;
  });
  const labels = Object.keys(sizeCount).sort((a,b) => parseFloat(a)-parseFloat(b));
  const values = labels.map((l) => sizeCount[l]);
  const tc = statsTheme();

  if (isPrimary) {
    plotEl(id, [{
      type:"pie", hole:0.42, labels, values,
      marker:{ colors:labels.map((_,i) => PALETTE[i % PALETTE.length]) },
      textinfo:"label+percent",
      hovertemplate:"%{label}: %{value} bottles (%{percent})<extra></extra>"
    }], basePlotLayout({ showlegend:false, margin:{ l:20,r:20,t:12,b:20 } }), plotConfig());
  } else {
    plotEl(id, [{
      type:"bar", x:labels, y:values,
      marker:{ color:labels.map((_,i) => PALETTE[i % PALETTE.length]) },
      text:values.map(String), textposition:"outside",
      hovertemplate:"%{x}: %{y} bottles<extra></extra>"
    }], basePlotLayout({
      xaxis:{ gridcolor:"transparent" },
      yaxis:{ title:"Bottles", gridcolor:tc.border },
      showlegend:false
    }), plotConfig());
  }
}

function renderChartInvTypePie(isPrimary) {
  const id = "chart-inv-type-pie";
  if (!state.items.length) { showNoData(id, "No inventory data yet."); return; }
  const byCat = {};
  state.items.forEach((i) => { byCat[i.type] = (byCat[i.type]||0)+1; });
  const types = Object.keys(byCat).sort();
  const counts = types.map((t) => byCat[t]);
  const tc = statsTheme();

  if (isPrimary) {
    plotEl(id, [{
      type:"pie", hole:0.42, labels:types, values:counts,
      marker:{ colors:types.map((_,i) => PALETTE[i % PALETTE.length]) },
      textinfo:"label+value",
      hovertemplate:"%{label}: %{value} bottles (%{percent})<extra></extra>"
    }], basePlotLayout({ showlegend:false, margin:{ l:20,r:20,t:12,b:20 } }), plotConfig());
  } else {
    plotEl(id, [{
      type:"bar", x:types, y:counts,
      marker:{ color:types.map((_,i) => PALETTE[i % PALETTE.length]) },
      text:counts.map(String), textposition:"outside",
      hovertemplate:"%{x}: %{y} bottles<extra></extra>"
    }], basePlotLayout({
      xaxis:{ automargin:true, gridcolor:"transparent" },
      yaxis:{ title:"Bottles", gridcolor:tc.border },
      showlegend:false, margin:{ l:50,r:16,t:12,b:70 }
    }), plotConfig());
  }
}

function stockColor(pct) {
  return pct < 15 ? "#e05252" : pct < 30 ? "#e07a52" : pct < 55 ? "#e0c452" : "#27ae60";
}

function renderChartInvRemainingPie(isPrimary) {
  const id = "chart-inv-remaining-pie";
  if (!state.items.length) { showNoData(id, "No inventory data yet."); return; }
  const typeSet = [...new Set(state.items.map((i) => i.type))].sort();
  const avgs = typeSet.map((tp) => {
    const g = state.items.filter((i) => i.type === tp);
    return g.length ? Math.round(g.reduce((s, i) => s + i.remainingPct, 0) / g.length) : 0;
  });
  const tc = statsTheme();

  if (isPrimary) {
    // Donut — slice size = avg remaining %; color = urgency
    plotEl(id, [{
      type:"pie", hole:0.45, labels:typeSet, values:avgs,
      marker:{ colors:avgs.map(stockColor) },
      text:avgs.map((p) => p + "%"),
      textinfo:"label+text",
      hovertemplate:"%{label}: avg %{value}% remaining<extra></extra>"
    }], basePlotLayout({ showlegend:false, margin:{ l:20,r:20,t:12,b:20 } }), plotConfig());
  } else {
    const combined = typeSet.map((t, i) => ({ t, v: avgs[i] })).sort((a, b) => a.v - b.v);
    plotEl(id, [{
      type:"bar", orientation:"h",
      y:combined.map((c) => c.t), x:combined.map((c) => c.v),
      marker:{ color:combined.map((c) => stockColor(c.v)) },
      text:combined.map((c) => c.v + "%"), textposition:"outside",
      hovertemplate:"%{y}: avg %{x}% remaining<extra></extra>"
    }], basePlotLayout({
      xaxis:{ title:"Avg remaining %", range:[0,115], gridcolor:tc.border },
      yaxis:{ automargin:true },
      showlegend:false, margin:{ l:90,r:60,t:12,b:40 }
    }), plotConfig());
  }
}

function renderChartInvLowStock(isPrimary) {
  const id = "chart-inv-low-stock";
  if (!state.items.length) { showNoData(id, "No inventory data yet."); return; }
  const tc = statsTheme();

  if (isPrimary) {
    // Bottom 20 individual bottles sorted by remaining % (lowest first)
    const sorted = [...state.items].sort((a, b) => a.remainingPct - b.remainingPct).slice(0, 20);
    const names = sorted.map((i) => `${i.brand||""} ${i.name}`.trim());
    const pcts  = sorted.map((i) => i.remainingPct);
    if (!sorted.length) { showNoData(id, "No inventory data yet."); return; }
    plotEl(id, [{
      type:"bar", orientation:"h",
      y:[...names].reverse(), x:[...pcts].reverse(),
      marker:{ color:[...pcts].reverse().map(stockColor) },
      text:[...pcts].reverse().map((p) => p + "%"), textposition:"outside",
      hovertemplate:"%{y}: %{x}% remaining<extra></extra>"
    }], basePlotLayout({
      xaxis:{ title:"Remaining %", range:[0,115], gridcolor:tc.border },
      yaxis:{ automargin:true },
      showlegend:false, margin:{ l:180,r:60,t:12,b:40 }
    }), plotConfig());
  } else {
    // Avg remaining % per type, sorted worst first — bird's-eye view
    const typeSet = [...new Set(state.items.map((i) => i.type))].sort();
    const avgs = typeSet.map((tp) => {
      const g = state.items.filter((i) => i.type === tp);
      return g.length ? Math.round(g.reduce((s, i) => s + i.remainingPct, 0) / g.length) : 0;
    });
    const combined = typeSet.map((t, i) => ({ t, v: avgs[i] })).sort((a, b) => a.v - b.v);
    plotEl(id, [{
      type:"bar", orientation:"h",
      y:combined.map((c) => c.t), x:combined.map((c) => c.v),
      marker:{ color:combined.map((c) => stockColor(c.v)) },
      text:combined.map((c) => c.v + "%"), textposition:"outside",
      hovertemplate:"%{y}: avg %{x}% remaining<extra></extra>"
    }], basePlotLayout({
      xaxis:{ title:"Avg remaining %", range:[0,115], gridcolor:tc.border },
      yaxis:{ automargin:true },
      showlegend:false, margin:{ l:90,r:60,t:12,b:40 }
    }), plotConfig());
  }
}

function renderChartInvBrand(isPrimary) {
  const id = "chart-inv-brand";
  if (!state.items.length) { showNoData(id, "No inventory data yet."); return; }
  const byBrand = {};
  state.items.forEach((i) => { const b = (i.brand||"Unknown").trim()||"Unknown"; byBrand[b]=(byBrand[b]||0)+1; });
  const sorted = Object.entries(byBrand).sort((a,b) => b[1]-a[1]).slice(0,20);
  const brands = sorted.map(([b]) => b);
  const counts = sorted.map(([,c]) => c);
  const tc = statsTheme();

  if (isPrimary) {
    plotEl(id, [{
      type:"pie", hole:0.42, labels:brands, values:counts,
      marker:{ colors:brands.map((_,i) => PALETTE[i % PALETTE.length]) },
      textinfo:"label+value",
      hovertemplate:"%{label}: %{value} bottles (%{percent})<extra></extra>"
    }], basePlotLayout({ showlegend:false, margin:{ l:20,r:20,t:12,b:20 } }), plotConfig());
  } else {
    plotEl(id, [{
      type:"bar", orientation:"h",
      x:[...counts].reverse(), y:[...brands].reverse(),
      marker:{ color:[...brands].reverse().map((_,i) => PALETTE[i % PALETTE.length]) },
      text:[...counts].reverse().map(String), textposition:"outside",
      hovertemplate:"%{y}: %{x} bottles<extra></extra>"
    }], basePlotLayout({
      xaxis:{ title:"Bottles", gridcolor:tc.border },
      yaxis:{ automargin:true },
      showlegend:false, margin:{ l:110,r:55,t:12,b:40 }
    }), plotConfig());
  }
}

// ── Recipe Charts ─────────────────────────────────────────────────────────────

function renderChartRecCategory(isPrimary) {
  const id = "chart-rec-category";
  if (!state.recipes.length) { showNoData(id, "No recipes saved yet."); return; }
  const byCat = {};
  state.recipes.forEach((r) => { byCat[r.category] = (byCat[r.category]||0)+1; });
  const cats   = Object.keys(byCat).sort();
  const counts = cats.map((c) => byCat[c]);
  const tc = statsTheme();

  if (isPrimary) {
    const bars = cats.map((_, i) => make3dBar(i, counts[i]||0, 0.4, PALETTE[i % PALETTE.length]));
    const lbls = cats.map((_, i) => label3d(i, counts[i]||0, String(counts[i]), tc.text));
    plotEl(id, [...bars, ...lbls], basePlotLayout({
      scene:{
        xaxis:{ tickvals:cats.map((_,i)=>i), ticktext:cats, title:"", tickfont:{size:9} },
        yaxis:{ visible:false, range:[-1,1] },
        zaxis:{ title:"Recipes", titlefont:{size:10} },
        camera:{ eye:{ x:1.5, y:-1.9, z:1.3 } }, bgcolor:"rgba(0,0,0,0)",
        aspectmode:"manual", aspectratio:{ x:1.8, y:0.5, z:1 }
      },
      showlegend:false, margin:{ l:0,r:0,t:12,b:0 }
    }), plot3dConfig());
  } else {
    plotEl(id, [{
      type:"pie", hole:0.45, labels:cats, values:counts,
      marker:{ colors:cats.map((_,i) => PALETTE[i % PALETTE.length]) },
      textinfo:"label+value",
      hovertemplate:"%{label}: %{value} recipes (%{percent})<extra></extra>"
    }], basePlotLayout({ showlegend:false, margin:{ l:20,r:20,t:12,b:20 } }), plotConfig());
  }
}

function renderChartRecRatings(isPrimary) {
  const id = "chart-rec-ratings";
  const tc = statsTheme();
  const rated = state.recipes.filter((r) => r.rating > 0);
  if (!rated.length) { showNoData(id, "No recipes have been rated yet."); return; }
  const counts = Array.from({ length:10 }, (_,i) => rated.filter((r) => r.rating===i+1).length);
  const labels = Array.from({ length:10 }, (_,i) => String(i+1));

  if (isPrimary) {
    const bars = labels.map((_, i) => make3dBar(i, counts[i]||0, 0.4, PALETTE[i % PALETTE.length]));
    const lbls = labels.map((_, i) => label3d(i, counts[i]||0, counts[i]>0?String(counts[i]):"", tc.text));
    plotEl(id, [...bars, ...lbls], basePlotLayout({
      scene:{
        xaxis:{ tickvals:labels.map((_,i)=>i), ticktext:labels, title:"Rating", titlefont:{size:10} },
        yaxis:{ visible:false, range:[-1,1] },
        zaxis:{ title:"Recipes", titlefont:{size:10} },
        camera:{ eye:{ x:1.5, y:-1.9, z:1.3 } }, bgcolor:"rgba(0,0,0,0)",
        aspectmode:"manual", aspectratio:{ x:2, y:0.5, z:1 }
      },
      showlegend:false, margin:{ l:0,r:0,t:12,b:0 }
    }), plot3dConfig());
  } else {
    plotEl(id, [{
      type:"bar", x:labels, y:counts,
      marker:{ color:labels.map((_,i) => PALETTE[i % PALETTE.length]) },
      text:counts.map((c) => c>0?String(c):""), textposition:"outside",
      hovertemplate:"Rating %{x}: %{y} recipes<extra></extra>"
    }], basePlotLayout({
      xaxis:{ title:"Rating (1–10)", gridcolor:"transparent" },
      yaxis:{ title:"Recipes", gridcolor:tc.border },
      showlegend:false
    }), plotConfig());
  }
}

function renderChartRecTags(isPrimary) {
  const id = "chart-rec-tags";
  if (!state.recipes.length) { showNoData(id, "No recipes saved yet."); return; }
  const tagCount = {};
  state.recipes.forEach((r) => (r.tags||[]).forEach((tag) => { tagCount[tag] = (tagCount[tag]||0)+1; }));
  const sorted = Object.entries(tagCount).sort((a,b) => b[1]-a[1]).slice(0,20);
  if (!sorted.length) { showNoData(id, "No tags on recipes yet."); return; }
  const labels = sorted.map(([t]) => t);
  const values = sorted.map(([,v]) => v);
  const tc = statsTheme();

  if (isPrimary) {
    // horizontal bar (default — easier to read long labels)
    plotEl(id, [{
      type:"bar", orientation:"h",
      x:[...values].reverse(), y:[...labels].reverse(),
      marker:{ color:[...labels].reverse().map((_,i) => PALETTE[i % PALETTE.length]) },
      text:[...values].reverse().map(String), textposition:"outside",
      hovertemplate:"%{y}: %{x} uses<extra></extra>"
    }], basePlotLayout({
      xaxis:{ title:"Recipe count", gridcolor:tc.border },
      yaxis:{ automargin:true },
      showlegend:false, margin:{ l:110,r:55,t:12,b:40 }
    }), plotConfig());
  } else {
    plotEl(id, [{
      type:"bar", x:labels, y:values,
      marker:{ color:labels.map((_,i) => PALETTE[i % PALETTE.length]) },
      text:values.map(String), textposition:"outside",
      hovertemplate:"%{x}: %{y} uses<extra></extra>"
    }], basePlotLayout({
      xaxis:{ automargin:true, tickangle:-38, gridcolor:"transparent" },
      yaxis:{ title:"Count", gridcolor:tc.border },
      showlegend:false, margin:{ l:50,r:16,t:12,b:90 }
    }), plotConfig());
  }
}

function renderChartRecSavedBy(isPrimary) {
  const id = "chart-rec-savedby";
  if (!state.recipes.length) { showNoData(id, "No recipes saved yet."); return; }
  const byUser = {};
  state.recipes.forEach((r) => { const k = r.savedByEmail||"Unknown"; byUser[k]=(byUser[k]||0)+1; });
  const users  = Object.keys(byUser).sort();
  const counts = users.map((u) => byUser[u]);
  const tc = statsTheme();

  if (isPrimary) {
    plotEl(id, [{
      type:"pie", hole:0.42, labels:users, values:counts,
      marker:{ colors:users.map((_,i) => PALETTE[i % PALETTE.length]) },
      textinfo:"label+value",
      hovertemplate:"%{label}: %{value} recipes (%{percent})<extra></extra>"
    }], basePlotLayout({ showlegend:false, margin:{ l:20,r:20,t:12,b:20 } }), plotConfig());
  } else {
    plotEl(id, [{
      type:"bar", x:users, y:counts,
      marker:{ color:users.map((_,i) => PALETTE[i % PALETTE.length]) },
      text:counts.map(String), textposition:"outside",
      hovertemplate:"%{x}: %{y} recipes<extra></extra>"
    }], basePlotLayout({
      xaxis:{ automargin:true, gridcolor:"transparent" },
      yaxis:{ title:"Recipes", gridcolor:tc.border },
      showlegend:false, margin:{ l:50,r:16,t:12,b:70 }
    }), plotConfig());
  }
}

// ── Usage and item history ───────────────────────────────────────────────────

async function loadItemHistory() {
  try {
    state.itemHistory = await api(`/api/item-history?days=${state.historyDays}`);
    populateUsageItemSelect();
    renderUsageAnalytics();
  } catch (error) {
    state.itemHistory = [];
    renderUsageAnalytics();
    toast(`Item history load failed: ${error.message}`);
  }
}

function openItemHistory(itemId) {
  state.selectedHistoryItemId = itemId;
  history.replaceState(null, "", "#stats");
  activateView("stats");
  activateStatsTab("usage");
  populateUsageItemSelect();
  renderUsageAnalytics();
}

function itemDisplayName(item) {
  return [item?.brand, item?.name].filter(Boolean).join(" ") || item?.type || "Unnamed item";
}

function stockVolumeMl(sizeMl, qty, remainingPct) {
  const size = Number(sizeMl);
  const count = Number(qty);
  const remaining = Number(remainingPct);
  if (![size, count, remaining].every(Number.isFinite) || size <= 0 || count <= 0) return 0;
  return size * (Math.max(0, count - 1) + Math.max(0, Math.min(100, remaining)) / 100);
}

function historyEventVolume(event, side) {
  return stockVolumeMl(event[`${side}SizeMl`], event[`${side}Qty`], event[`${side}RemainingPct`]);
}

function historyDate(event) {
  return new Date(Number(event.changedAt) * 1000);
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date) {
  const result = startOfLocalDay(date);
  const mondayOffset = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - mondayOffset);
  return result;
}

function formatVolume(ml, maximumFractionDigits = 1) {
  const amount = Math.max(0, Number(ml) || 0);
  if (amount >= 1000) {
    return `${(amount / 1000).toLocaleString(undefined, { maximumFractionDigits })} L`;
  }
  return `${Math.round(amount).toLocaleString()} mL`;
}

function formatHistoryDate(date, includeTime = false) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString(undefined, includeTime
    ? { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }
    : { month: "short", day: "numeric", year: "numeric" });
}

function relativeHistoryDate(date) {
  const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return formatHistoryDate(date);
}

function currentItemLookup() {
  return new Map(state.items.map((item) => [item.id, item]));
}

function historyItemLookup() {
  const lookup = currentItemLookup();
  for (const event of state.itemHistory) {
    if (!lookup.has(event.itemId)) lookup.set(event.itemId, event);
  }
  return lookup;
}

function populateUsageItemSelect() {
  const select = $("usage-item-select");
  if (!select) return;
  const currentIds = new Set(state.items.map((item) => item.id));
  const items = [...historyItemLookup().entries()]
    .map(([id, item]) => ({ id, label: itemDisplayName(item), deleted: !currentIds.has(id) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  if (!items.some((item) => item.id === state.selectedHistoryItemId)) {
    const bestStockedItem = [...state.items]
      .sort((a, b) => stockVolumeMl(b.sizeMl, b.qty, b.remainingPct) - stockVolumeMl(a.sizeMl, a.qty, a.remainingPct))[0];
    state.selectedHistoryItemId = bestStockedItem?.id || items[0]?.id || "";
  }
  select.innerHTML = items.map((item) =>
    `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label)}${item.deleted ? " (deleted)" : ""}</option>`
  ).join("");
  select.value = state.selectedHistoryItemId;
}

function calculateUsageAnalytics() {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - state.historyDays);
  const currentItems = currentItemLookup();
  const perItem = new Map();
  const daily = new Map();
  const usageEvents = [];
  const restockEvents = [];
  const rangeEvents = state.itemHistory.filter((event) => historyDate(event) >= cutoff);

  for (const item of state.items) {
    perItem.set(item.id, {
      item,
      usedMl: 0,
      restockedMl: 0,
      firstObservedAt: cutoff,
      currentMl: stockVolumeMl(item.sizeMl, item.qty, item.remainingPct)
    });
  }

  for (const event of state.itemHistory) {
    const summary = perItem.get(event.itemId);
    if (summary && event.eventType === "baseline") {
      summary.firstObservedAt = historyDate(event) > cutoff ? historyDate(event) : cutoff;
    }
  }

  for (const event of rangeEvents) {
    if (event.eventType !== "update" || event.beforeSizeMl !== event.afterSizeMl) continue;
    const before = historyEventVolume(event, "before");
    const after = historyEventVolume(event, "after");
    const delta = before - after;
    if (Math.abs(delta) < 0.5) continue;
    const date = historyDate(event);
    const summary = perItem.get(event.itemId);
    if (delta > 0) {
      usageEvents.push({ event, date, amountMl: delta });
      if (summary) summary.usedMl += delta;
      const key = localDateKey(date);
      daily.set(key, (daily.get(key) || 0) + delta);
    } else {
      const amountMl = Math.abs(delta);
      restockEvents.push({ event, date, amountMl });
      if (summary) summary.restockedMl += amountMl;
    }
  }

  const forecasts = [...perItem.values()].map((summary) => {
    const observedMs = Math.max(86400000, now - summary.firstObservedAt);
    const observedDays = Math.min(state.historyDays, observedMs / 86400000);
    const dailyRateMl = summary.usedMl / observedDays;
    const daysRemaining = dailyRateMl > 0 ? summary.currentMl / dailyRateMl : null;
    const needsAttention = Boolean(summary.item.needToBuy)
      || Number(summary.item.remainingPct) <= 20
      || (daysRemaining !== null && daysRemaining <= 30);
    return { ...summary, observedDays, dailyRateMl, daysRemaining, needsAttention };
  });

  return {
    now,
    cutoff,
    currentItems,
    rangeEvents,
    usageEvents,
    restockEvents,
    daily,
    forecasts,
    totalUsedMl: usageEvents.reduce((sum, entry) => sum + entry.amountMl, 0),
    totalRestockedMl: restockEvents.reduce((sum, entry) => sum + entry.amountMl, 0)
  };
}

function usageAction(forecast) {
  if (forecast.item.needToBuy) return { label: "Need to buy", className: "is-urgent" };
  if (forecast.daysRemaining !== null && forecast.daysRemaining <= 7) return { label: "Buy this week", className: "is-urgent" };
  if (forecast.daysRemaining !== null && forecast.daysRemaining <= 30) return { label: "Buy soon", className: "is-soon" };
  if (Number(forecast.item.remainingPct) <= 20) return { label: "Low stock", className: "is-soon" };
  return { label: "Monitor", className: "" };
}

function describeHistoryEvent(event) {
  if (event.eventType === "create") return "Item created";
  if (event.eventType === "delete") return "Item deleted";
  if (event.eventType === "baseline") return "Tracking started";
  if (event.beforeSizeMl === event.afterSizeMl) {
    const delta = historyEventVolume(event, "before") - historyEventVolume(event, "after");
    if (delta > 0.5) return `Used ${formatVolume(delta)}`;
    if (delta < -0.5) return `Restocked ${formatVolume(Math.abs(delta))}`;
  }
  if (event.beforeNeedToBuy !== event.afterNeedToBuy) {
    return event.afterNeedToBuy ? "Marked need to buy" : "Cleared need to buy";
  }
  return "Inventory updated";
}

function renderUsageAnalytics() {
  if (!$("usage-total-volume")) return;
  const analytics = calculateUsageAnalytics();
  const baselineDates = state.itemHistory
    .filter((event) => event.eventType === "baseline")
    .map(historyDate)
    .filter((date) => !Number.isNaN(date.getTime()));
  const trackingStart = baselineDates.length
    ? new Date(Math.min(...baselineDates.map((date) => date.getTime())))
    : null;

  $("usage-total-volume").textContent = formatVolume(analytics.totalUsedMl);
  $("usage-items-used").textContent = new Set(analytics.usageEvents.map((entry) => entry.event.itemId)).size;
  $("usage-restocked-volume").textContent = formatVolume(analytics.totalRestockedMl);
  $("usage-attention-count").textContent = analytics.forecasts.filter((item) => item.needsAttention).length;
  $("usage-tracking-note").textContent = trackingStart
    ? `Tracking began ${formatHistoryDate(trackingStart)}. Usage is inferred from saved decreases in bottle count and remaining percentage; it is not pour-level telemetry.`
    : "History starts after the database history migration. Usage is inferred from saved inventory decreases.";

  const reorderBody = $("usage-reorder-body");
  const reorderRows = [...analytics.forecasts]
    .sort((a, b) => {
      if (a.item.needToBuy !== b.item.needToBuy) return a.item.needToBuy ? -1 : 1;
      if (a.daysRemaining === null && b.daysRemaining !== null) return 1;
      if (a.daysRemaining !== null && b.daysRemaining === null) return -1;
      return (a.daysRemaining ?? Number.MAX_VALUE) - (b.daysRemaining ?? Number.MAX_VALUE)
        || Number(a.item.remainingPct) - Number(b.item.remainingPct);
    })
    .slice(0, 12);
  reorderBody.innerHTML = reorderRows.length ? reorderRows.map((forecast) => {
    const action = usageAction(forecast);
    const estimate = forecast.daysRemaining === null
      ? "Not enough history"
      : forecast.daysRemaining < 1 ? "Less than 1 day" : `${Math.round(forecast.daysRemaining)} days`;
    return `<tr>
      <td><button class="usage-item-link" type="button" data-usage-select="${escapeHtml(forecast.item.id)}">${escapeHtml(itemDisplayName(forecast.item))}</button></td>
      <td>${escapeHtml(formatVolume(forecast.currentMl))}</td>
      <td>${escapeHtml(formatVolume(forecast.usedMl))}</td>
      <td>${forecast.dailyRateMl > 0 ? escapeHtml(`${formatVolume(forecast.dailyRateMl)}/day`) : "-"}</td>
      <td>${escapeHtml(estimate)}</td>
      <td><span class="usage-status ${action.className}">${escapeHtml(action.label)}</span></td>
    </tr>`;
  }).join("") : '<tr><td colspan="6" class="usage-empty-cell">No current inventory.</td></tr>';

  const recentBody = $("usage-recent-body");
  const recent = analytics.rangeEvents
    .filter((event) => event.eventType !== "baseline")
    .sort((a, b) => Number(b.changedAt) - Number(a.changedAt))
    .slice(0, 12);
  recentBody.innerHTML = recent.length ? recent.map((event) => `<tr>
    <td><button class="usage-item-link" type="button" data-usage-select="${escapeHtml(event.itemId)}">${escapeHtml(itemDisplayName(event))}</button></td>
    <td>${escapeHtml(describeHistoryEvent(event))}</td>
    <td title="${escapeHtml(formatHistoryDate(historyDate(event), true))}">${escapeHtml(relativeHistoryDate(historyDate(event)))}</td>
  </tr>`).join("") : '<tr><td colspan="3" class="usage-empty-cell">No changes have been recorded in this range.</td></tr>';

  const usedIds = new Set(analytics.usageEvents.map((entry) => entry.event.itemId));
  const unused = state.items
    .filter((item) => Number(item.qty) > 0 && !usedIds.has(item.id))
    .sort((a, b) => itemDisplayName(a).localeCompare(itemDisplayName(b)));
  const visibleUnused = state.showAllUnused ? unused : unused.slice(0, 24);
  $("usage-unused-summary").textContent = `${unused.length} item${unused.length === 1 ? "" : "s"} currently on hand with no stock decrease in this range`;
  $("usage-unused-list").innerHTML = unused.length
    ? visibleUnused.map((item) => `<button class="usage-unused-item" type="button" data-usage-select="${escapeHtml(item.id)}"><strong>${escapeHtml(itemDisplayName(item))}</strong><span>${item.qty} bottle${item.qty === 1 ? "" : "s"}, ${item.remainingPct}% open bottle remaining</span></button>`).join("")
      + (unused.length > 24 ? `<button class="usage-unused-more" type="button" data-toggle-unused>${state.showAllUnused ? "Show first 24" : `Show all ${unused.length}`}</button>` : "")
    : '<p class="usage-empty-cell">Every item currently on hand has recorded usage in this range.</p>';

  document.querySelectorAll("[data-usage-select]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedHistoryItemId = button.dataset.usageSelect;
      populateUsageItemSelect();
      renderChartUsageItemHistory(chartModes["usage-item-history"] !== "alt");
      $("usage-item-select")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
  $("usage-unused-list")?.querySelector("[data-toggle-unused]")?.addEventListener("click", () => {
    state.showAllUnused = !state.showAllUnused;
    renderUsageAnalytics();
  });

  if (document.querySelector('[data-stats-section="usage"]')?.classList.contains("is-active")) {
    requestAnimationFrame(renderAllStats);
  }
}

function renderChartUsageDaily(isPrimary) {
  const id = "chart-usage-daily";
  const analytics = calculateUsageAnalytics();
  if (!analytics.usageEvents.length) {
    showNoData(id, "No stock decreases have been recorded in this range.");
    return;
  }
  // Include zero-usage periods in both modes instead of connecting over gaps.
  const grouped = new Map();
  const cursor = isPrimary ? startOfLocalDay(analytics.cutoff) : startOfWeek(analytics.cutoff);
  const end = startOfLocalDay(analytics.now);
  while (cursor <= end) {
    grouped.set(localDateKey(cursor), 0);
    cursor.setDate(cursor.getDate() + (isPrimary ? 1 : 7));
  }
  for (const entry of analytics.usageEvents) {
    const key = localDateKey(isPrimary ? entry.date : startOfWeek(entry.date));
    grouped.set(key, (grouped.get(key) || 0) + entry.amountMl);
  }
  const keys = [...grouped.keys()].sort();
  const labels = keys.map(key => new Date(key + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" }));
  const values = keys.map(key => grouped.get(key));
  renderUsageChart(id, {
    xAxis: { ...usageChartAxis(isPrimary ? "Day" : "Week starting", "category"), data: labels, boundaryGap: false },
    yAxis: { ...usageChartAxis(""), min: 0, axisLabel: { color: statsTheme().muted, formatter: value => formatVolume(value) } },
    dataZoom: usageChartZoom(),
    tooltip: { formatter: entries => {
      const point = entries[0];
      return escapeHtml(labels[point.dataIndex]) + "<br>" + escapeHtml(formatVolume(point.value)) + " used";
    } },
    series: [{ name: "Recorded consumption", type: "line", data: values, smooth: false,
      showSymbol: keys.length <= 31, symbolSize: 7, lineStyle: { width: 2 },
      areaStyle: { opacity: 0.13 }, emphasis: { focus: "series" } }]
  }, (isPrimary ? "Daily" : "Weekly") + " recorded consumption. " + formatVolume(analytics.totalUsedMl) + " used in this range. Usage is inferred from inventory decreases.",
  id + ":" + state.historyDays + ":" + isPrimary);
}

function renderChartUsageRanked(isPrimary) {
  const id = "chart-usage-ranked";
  const title = isPrimary ? "Most Used Items" : "Estimated Days Remaining";
  const heading = $(id)?.closest(".chart-card")?.querySelector("h3");
  if (heading) heading.textContent = title;
  if (plotElOverride) $("chart-expanded-title").textContent = title;
  const analytics = calculateUsageAnalytics();
  const ranked = isPrimary
    ? analytics.forecasts.filter(item => item.usedMl > 0).sort((a, b) => b.usedMl - a.usedMl).slice(0, 10)
    : analytics.forecasts.filter(item => item.daysRemaining !== null).sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, 10);
  if (!ranked.length) {
    showNoData(id, isPrimary ? "No item usage has been recorded yet." : "More usage history is needed for a reorder forecast.");
    return;
  }
  const names = ranked.map(entry => itemDisplayName(entry.item));
  const values = ranked.map(entry => isPrimary ? entry.usedMl : entry.daysRemaining);
  const labels = ranked.map(entry => isPrimary ? formatVolume(entry.usedMl) : Math.round(entry.daysRemaining) + " days");
  const theme = statsTheme();
  const el = document.getElementById(plotElOverride || id);
  const labelWidth = Math.min(155, Math.max(80, (el?.clientWidth || 400) * 0.3));
  renderUsageChart(id, {
    grid: { left: 8, right: 64, top: 16, bottom: 52, containLabel: true },
    xAxis: { ...usageChartAxis(isPrimary ? "Volume used" : "Estimated days left"), min: 0,
      axisLabel: { color: theme.muted, hideOverlap: true, formatter: value => isPrimary ? formatVolume(value) : value } },
    yAxis: { ...usageChartAxis("", "category"), data: names, inverse: true,
      axisLabel: { color: theme.text, width: labelWidth, overflow: "truncate", fontSize: 11 } },
    tooltip: { trigger: "item", formatter: point => escapeHtml(names[point.dataIndex]) + "<br>" + escapeHtml(labels[point.dataIndex]) + (isPrimary ? " used" : " estimated remaining") },
    series: [{ name: isPrimary ? "Usage" : "Reorder estimate", type: "bar", barMaxWidth: 22,
      data: values.map((value, index) => ({ value, itemStyle: { color: isPrimary ? "#0ea5e9" : ranked[index].needsAttention ? "#f59e0b" : "#14b8a6", borderRadius: [0, 4, 4, 0] } })),
      label: { show: true, position: "right", color: theme.text, fontSize: 11, formatter: point => labels[point.dataIndex] } }]
  }, (isPrimary ? "Most used items. " : "Estimated days remaining; these are forecasts. ") + names.map((name, index) => name + ": " + labels[index]).join("; "),
  id + ":" + state.historyDays + ":" + isPrimary);
}

function renderChartUsageItemHistory(isPrimary) {
  const id = "chart-usage-item-history";
  const selectedId = state.selectedHistoryItemId;
  const itemEvents = state.itemHistory
    .filter(event => event.itemId === selectedId && event.eventType !== "delete" && event.afterQty !== null)
    .sort((a, b) => Number(a.changedAt) - Number(b.changedAt));
  const item = historyItemLookup().get(selectedId);
  $("usage-item-chart-title").textContent = item ? itemDisplayName(item) + " History" : "Item Stock History";
  if (!itemEvents.length) {
    showNoData(id, "Select an item with recorded history.");
    return;
  }
  const values = itemEvents.map(event => isPrimary ? historyEventVolume(event, "after") : Number(event.afterRemainingPct));
  const labels = values.map(value => isPrimary ? formatVolume(value) : value + "%");
  renderUsageChart(id, {
    xAxis: { ...usageChartAxis("Recorded change", "time"), axisLabel: { color: statsTheme().muted, hideOverlap: true,
      formatter: value => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" }) } },
    yAxis: { ...usageChartAxis(""), min: 0, ...(isPrimary ? {} : { max: 100 }),
      axisLabel: { color: statsTheme().muted, formatter: value => isPrimary ? formatVolume(value) : value + "%" } },
    dataZoom: usageChartZoom(),
    tooltip: { formatter: entries => {
      const index = entries[0].dataIndex;
      return escapeHtml(formatHistoryDate(historyDate(itemEvents[index]), true)) + "<br>" + escapeHtml(labels[index]) + "<br>" + escapeHtml(describeHistoryEvent(itemEvents[index]));
    } },
    series: [{ name: isPrimary ? "Stock volume" : "Open bottle remaining", type: "line", step: "end", smooth: false,
      data: itemEvents.map((event, index) => [historyDate(event).getTime(), values[index]]),
      symbolSize: 7, showSymbol: true, lineStyle: { width: 2 }, itemStyle: { color: "#14b8a6" }, areaStyle: { opacity: 0.08 } }]
  }, itemDisplayName(item) + ". " + (isPrimary ? "Stock volume" : "Open bottle remaining percentage") + " at " + itemEvents.length + " recorded changes. Latest value: " + labels[labels.length - 1] + ". Steps represent saved updates, not continuous measurements.",
  id + ":" + selectedId + ":" + state.historyDays + ":" + isPrimary);
}

// ── Chart dispatch & toggle ───────────────────────────────────────────────────

const CHART_DEFS = {
  "inv-type-qty":       { labelP:"2D View",    labelA:"3D View",    fn:renderChartInvTypeQty      },
  "inv-abv-rating":     { labelP:"2D View",    labelA:"3D View",    fn:renderChartInvAbvRating    },
  "inv-status":         { labelP:"By Type",    labelA:"Donut",      fn:renderChartInvStatus       },
  "inv-ratings":        { labelP:"2D View",    labelA:"3D View",    fn:renderChartInvRatings      },
  "inv-remaining":      { labelP:"3D View",    labelA:"2D View",    fn:renderChartInvRemaining    },
  "inv-sizes":          { labelP:"Bar View",   labelA:"Pie View",   fn:renderChartInvSizes        },
  "inv-type-pie":       { labelP:"Bar View",   labelA:"Pie View",   fn:renderChartInvTypePie      },
  "inv-remaining-pie":  { labelP:"Bar View",   labelA:"Pie View",   fn:renderChartInvRemainingPie },
  "inv-brand":          { labelP:"Bar View",   labelA:"Pie View",   fn:renderChartInvBrand        },
  "inv-low-stock":      { labelP:"By Type",    labelA:"By Item",    fn:renderChartInvLowStock     },
  "rec-category":       { labelP:"Pie View",   labelA:"3D View",    fn:renderChartRecCategory     },
  "rec-ratings":        { labelP:"2D View",    labelA:"3D View",    fn:renderChartRecRatings      },
  "rec-tags":           { labelP:"Vertical",   labelA:"Horizontal", fn:renderChartRecTags         },
  "rec-savedby":        { labelP:"Bar View",   labelA:"Pie View",   fn:renderChartRecSavedBy      },
  "usage-daily":        { labelP:"Weekly",     labelA:"Daily",      fn:renderChartUsageDaily      },
  "usage-ranked":       { labelP:"Reorder",    labelA:"Usage",      fn:renderChartUsageRanked     },
  "usage-item-history": { labelP:"Remaining %",labelA:"Stock amount",fn:renderChartUsageItemHistory },
};

function handleChartToggle(chartId) {
  const def = CHART_DEFS[chartId];
  if (!def) return;
  if (!toggleChartMode(chartId)) return;
  def.fn(chartModes[chartId] !== "alt");
}

function renderAllStats() {
  const active = document.querySelector("[data-stats-section].is-active")?.dataset.statsSection;
  const ids = active === "recipes"
    ? ["rec-category","rec-ratings","rec-tags","rec-savedby"]
    : active === "usage"
      ? ["usage-daily","usage-ranked","usage-item-history"]
      : ["inv-type-qty","inv-abv-rating","inv-status","inv-ratings","inv-remaining","inv-sizes","inv-type-pie","inv-remaining-pie","inv-brand","inv-low-stock"];
  ids.forEach((id) => {
    const def = CHART_DEFS[id];
    if (def) def.fn(chartModes[id] !== "alt");
  });
}

function activateStatsTab(tab) {
  document.querySelectorAll("[data-stats-tab]").forEach((b) => b.classList.toggle("is-active", b.dataset.statsTab === tab));
  document.querySelectorAll("[data-stats-section]").forEach((s) => s.classList.toggle("is-active", s.dataset.statsSection === tab));
  if (tab === "usage") renderUsageAnalytics();
  requestAnimationFrame(renderAllStats);
}

function openChartExpanded(chartId) {
  const def = CHART_DEFS[chartId];
  if (!def) return;

  // The shared expanded container can be owned by either chart renderer.
  const body = $("chart-expanded-body");
  disposeUsageChart(body);
  if (body && !body._llPlotted) body.replaceChildren();
  if (body && body._llPlotted && typeof Plotly !== "undefined") {
    Plotly.purge(body);
    body._llPlotted = false;
  }

  state.expandedChart = chartId;

  // Pull title from the card's h3
  const card = document.querySelector(`[data-expand-chart="${chartId}"]`)?.closest(".chart-card");
  $("chart-expanded-title").textContent = card?.querySelector("h3")?.textContent || "Chart";

  // Toggle button shows what clicking will switch TO
  const isPrimary = chartModes[chartId] !== "alt";
  syncChartModeButton(chartId, $("chart-expanded-toggle"));

  $("chart-expanded-modal").removeAttribute("hidden");
  document.body.style.overflow = "hidden";

  requestAnimationFrame(() => {
    plotElOverride = "chart-expanded-body";
    def.fn(isPrimary);
    plotElOverride = null;
  });
}

function closeChartExpanded() {
  const chartId = state.expandedChart;
  $("chart-expanded-modal").setAttribute("hidden", "");
  document.body.style.overflow = "";
  state.expandedChart = null;
  disposeUsageChart($("chart-expanded-body"));
  const button = document.querySelector(`[data-chart="${chartId}"]`);
  syncChartModeButton(chartId, button);

  // Re-render grid card to sync any mode changes made while expanded
  if (chartId) {
    const def = CHART_DEFS[chartId];
    if (def) def.fn(chartModes[chartId] !== "alt");
  }
}

function handleExpandedToggle() {
  const chartId = state.expandedChart;
  if (!chartId) return;
  const def = CHART_DEFS[chartId];
  if (!def) return;

  if (!toggleChartMode(chartId)) return;
  const isPrimary = chartModes[chartId] !== "alt";
  // Button now shows the other direction
  syncChartModeButton(chartId, $("chart-expanded-toggle"));

  plotElOverride = "chart-expanded-body";
  def.fn(isPrimary);
  plotElOverride = null;
}

// ── Recipes ────────────────────────────────────────────────────────────────────

async function loadRecipes() {
  try {
    state.recipes = await api("/api/recipes");
    renderRecipes();
    renderRecipeStats();
    renderRecipeCategoryFilter();
  } catch (error) {
    toast(`Recipes load failed: ${error.message}`);
  }
}

function filteredRecipes() {
  return state.recipes.filter((recipe) => {
    const haystack = [recipe.name, recipe.category, recipe.savedByEmail, ...(recipe.tags || []), recipe.fullMarkdown]
      .join(" ").toLowerCase();
    const matchesSearch   = !state.recipeFilters.search   || haystack.includes(state.recipeFilters.search);
    const matchesCategory = !state.recipeFilters.category || recipe.category === state.recipeFilters.category;
    const matchesRating   = !state.recipeFilters.rating   || recipe.rating >= Number(state.recipeFilters.rating);
    return matchesSearch && matchesCategory && matchesRating;
  });
}

function renderRecipes() {
  const body = $("recipes-body");
  body.innerHTML = "";
  const visible = filteredRecipes();
  if (!visible.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="6" class="empty-state">No recipes found. Add one or save an AI response as a recipe.</td>`;
    body.appendChild(tr);
    return;
  }
  for (const recipe of visible) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="item-actions-cell">
        <div class="item-actions">
          ${iconButton("view",   "View recipe",   "data-view-recipe",   recipe.id)}
          ${iconButton("edit",   "Edit recipe",   "data-edit-recipe",   recipe.id)}
          ${iconButton("export", "Export recipe", "data-export-recipe", recipe.id)}
          ${iconButton("delete", "Delete recipe", "data-delete-recipe", recipe.id, "danger-action")}
        </div>
      </td>
      <td data-label="Name">${escapeHtml(recipe.name)}</td>
      <td data-label="Category"><span class="category-chip">${escapeHtml(recipe.category)}</span></td>
      <td data-label="Rating">${recipe.rating > 0 ? `<span class="rating-chip">&#9733; ${recipe.rating}/10</span>` : ""}</td>
      <td data-label="Tags">${escapeHtml((recipe.tags || []).join(", "))}</td>
      <td data-label="Saved by">${escapeHtml(recipe.savedByEmail || "")}</td>
    `;
    body.appendChild(tr);
  }

  body.querySelectorAll("[data-view-recipe]").forEach((btn) => {
    btn.addEventListener("click", () => viewRecipe(btn.dataset.viewRecipe));
  });
  body.querySelectorAll("[data-edit-recipe]").forEach((btn) => {
    btn.addEventListener("click", () => editRecipe(btn.dataset.editRecipe));
  });
  body.querySelectorAll("[data-export-recipe]").forEach((btn) => {
    btn.addEventListener("click", () => exportRecipeTxt(btn.dataset.exportRecipe));
  });
  body.querySelectorAll("[data-delete-recipe]").forEach((btn) => {
    btn.addEventListener("click", () => deleteRecipe(btn.dataset.deleteRecipe));
  });
}

function renderRecipeStats() {
  $("recipe-stat-total").textContent      = state.recipes.length;
  $("recipe-stat-categories").textContent = new Set(state.recipes.map((r) => r.category).filter(Boolean)).size;
  $("recipe-stat-rated").textContent      = state.recipes.filter((r) => r.rating > 0).length;
}

function renderRecipeCategoryFilter() {
  const select  = $("recipe-filter-category");
  const current = select.value;
  const cats    = [...new Set(state.recipes.map((r) => r.category).filter(Boolean))].sort();
  select.innerHTML = `<option value="">All</option>${cats.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("")}`;
  select.value = cats.includes(current) ? current : "";
}

function openRecipeModal(recipe = null, mode = "edit") {
  state.editingRecipe = recipe;

  if (mode === "view" && recipe) {
    $("recipe-form-title").textContent = escapeHtml(recipe.name);
    $("recipe-prose").hidden = false;
    $("recipe-form").hidden  = true;
    populateRecipeProse(recipe);
  } else {
    $("recipe-form-title").textContent = recipe ? "Edit Recipe" : "Add Recipe";
    $("recipe-prose").hidden = true;
    $("recipe-form").hidden  = false;
    $("recipe-id").value      = recipe?.id      ?? "";
    $("recipe-version").value = recipe?.version ?? "0";
    $("recipe-name").value    = recipe?.name     ?? "";
    $("recipe-category").value = recipe?.category ?? "Cocktail";
    $("recipe-rating").value  = recipe?.rating   ?? 0;
    $("recipe-tags").value    = (recipe?.tags || []).join(", ");
    $("recipe-markdown").value = recipe?.fullMarkdown ?? "";
    $("recipe-name").focus();
  }

  $("recipe-modal").hidden = false;
}

function closeRecipeModal() {
  $("recipe-modal").hidden  = true;
  $("recipe-prose").hidden  = true;
  $("recipe-form").hidden   = false;
  state.editingRecipe        = null;
  $("recipe-form").reset();
  $("recipe-id").value       = "";
  $("recipe-version").value  = "0";
}

function populateRecipeProse(recipe) {
  const meta = [
    `<span class="category-chip">${escapeHtml(recipe.category)}</span>`,
    recipe.rating > 0 ? `<span class="rating-chip">&#9733; ${recipe.rating}/10</span>` : "",
    ...(recipe.tags || []).map((t) => `<span class="tag-pill">${escapeHtml(t)}</span>`),
    recipe.savedByEmail ? `<span class="prose-meta-label">Saved by ${escapeHtml(recipe.savedByEmail)}</span>` : ""
  ].filter(Boolean).join(" ");
  $("recipe-view-meta").innerHTML = meta;
  $("recipe-view-md").innerHTML   = markdownToHtml(recipe.fullMarkdown || "");
}

function switchRecipeToEditMode() {
  const recipe = state.editingRecipe;
  if (!recipe) return;
  $("recipe-form-title").textContent = "Edit Recipe";
  $("recipe-prose").hidden = true;
  $("recipe-form").hidden  = false;
  $("recipe-id").value      = recipe.id;
  $("recipe-version").value = recipe.version;
  $("recipe-name").value    = recipe.name;
  $("recipe-category").value = recipe.category;
  $("recipe-rating").value  = recipe.rating;
  $("recipe-tags").value    = (recipe.tags || []).join(", ");
  $("recipe-markdown").value = recipe.fullMarkdown || "";
  $("recipe-name").focus();
}

function viewRecipe(id) {
  const recipe = state.recipes.find((r) => r.id === id);
  if (!recipe) return;
  openRecipeModal(recipe, "view");
}

function editRecipe(id) {
  const recipe = state.recipes.find((r) => r.id === id);
  if (!recipe) return;
  openRecipeModal(recipe, "edit");
}

async function deleteRecipe(id) {
  const recipe = state.recipes.find((r) => r.id === id);
  if (!recipe) return;
  if (!confirm(`Delete "${recipe.name}"? This cannot be undone.`)) return;
  try {
    await api(`/api/recipe?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await loadRecipes();
    toast("Recipe deleted.");
  } catch (error) {
    toast(`Delete failed: ${error.message}`);
  }
}

async function saveRecipe(event) {
  event.preventDefault();
  const recipe = formRecipe();
  const isEdit = Boolean(recipe.id);
  try {
    await api("/api/recipe", {
      method: isEdit ? "PUT" : "POST",
      body: JSON.stringify(recipe)
    });
    closeRecipeModal();
    await loadRecipes();
    toast("Recipe saved.");
  } catch (error) {
    toast(`Save failed: ${error.message}`);
  }
}

function formRecipe() {
  return {
    id:           $("recipe-id").value,
    name:         $("recipe-name").value.trim(),
    category:     $("recipe-category").value,
    rating:       Number($("recipe-rating").value || 0),
    tags:         $("recipe-tags").value.split(",").map((t) => t.trim()).filter(Boolean),
    fullMarkdown: $("recipe-markdown").value,
    version:      Number($("recipe-version").value || 0)
  };
}

function exportRecipeTxt(id) {
  const recipe = state.recipes.find((r) => r.id === id);
  if (!recipe) return;
  downloadRecipeText(recipe);
}

function exportCurrentRecipeTxt() {
  if (state.editingRecipe) downloadRecipeText(state.editingRecipe);
}

function downloadRecipeText(recipe) {
  const header = `# ${recipe.name}\nCategory: ${recipe.category}${recipe.rating > 0 ? `  |  Rating: ${recipe.rating}/10` : ""}${recipe.tags?.length ? `\nTags: ${recipe.tags.join(", ")}` : ""}\n\n`;
  const content = header + (recipe.fullMarkdown || "");
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href  = url;
  link.download = `recipe-${recipe.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function openSaveAsRecipeModal() {
  const markdown = state.aiAnswer || "";
  const firstHeading = markdown.match(/^#{1,3}\s+(.+)$/m);
  const guessedName  = firstHeading ? firstHeading[1].trim() : "AI Generated Recipe";

  closeAiResponseModal();

  $("recipe-id").value       = "";
  $("recipe-version").value  = "0";
  $("recipe-name").value     = guessedName;
  $("recipe-category").value = "Cocktail";
  $("recipe-rating").value   = "0";
  $("recipe-tags").value     = "";
  $("recipe-markdown").value = markdown;
  $("recipe-form-title").textContent = "Save as Recipe";
  $("recipe-prose").hidden   = true;
  $("recipe-form").hidden    = false;
  $("recipe-modal").hidden   = false;
  $("recipe-name").focus();
  $("recipe-name").select();

  // Switch to recipes view so context is clear
  history.replaceState(null, "", "#recipes");
  activateView("recipes");
}
