const Theme = (() => {
  const key = "ll-theme";
  const fallback = "cellar-light";
  const valid = new Set([
    "cellar-light",    "cellar-dark",
    "botanical-light", "botanical-dark",
    "midnight-light",  "midnight-dark",
    "ocean-light",     "ocean-dark",
    "sapphire-light",  "sapphire-dark",
    "steel-light",     "steel-dark",
    "ember-light",     "ember-dark",
    "copper-light",    "copper-dark",
    "terminal-light",  "terminal-dark"
  ]);

  function init() {
    apply(localStorage.getItem(key) || fallback);
    syncSelectors();
    document.querySelectorAll("[data-theme-select]").forEach((select) => {
      select.addEventListener("change", () => set(select.value));
    });
  }

  function set(name) {
    if (!valid.has(name)) return;
    localStorage.setItem(key, name);
    apply(name);
    syncSelectors();
  }

  function current() {
    const active = document.documentElement.getAttribute("data-theme");
    return valid.has(active) ? active : fallback;
  }

  function apply(name) {
    document.documentElement.setAttribute("data-theme", valid.has(name) ? name : fallback);
  }

  function syncSelectors() {
    const active = current();
    document.querySelectorAll("[data-theme-select]").forEach((select) => {
      select.value = active;
    });
  }

  return { init, set, current };
})();

document.addEventListener("DOMContentLoaded", Theme.init);

const Density = (() => {
  const key = "ll-density";
  const fallback = "normal";
  const valid = new Set(["normal", "compact", "dense", "large", "xlarge"]);

  function init() {
    apply(localStorage.getItem(key) || fallback);
    syncSelectors();
    document.querySelectorAll("[data-density-select]").forEach((select) => {
      select.addEventListener("change", () => set(select.value));
    });
  }

  function set(name) {
    if (!valid.has(name)) return;
    localStorage.setItem(key, name);
    apply(name);
    syncSelectors();
  }

  function apply(name) {
    document.documentElement.setAttribute("data-density", valid.has(name) ? name : fallback);
  }

  function syncSelectors() {
    const active = document.documentElement.getAttribute("data-density") || fallback;
    document.querySelectorAll("[data-density-select]").forEach((select) => {
      select.value = active;
    });
  }

  return { init, set };
})();

document.addEventListener("DOMContentLoaded", Density.init);
