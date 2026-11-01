// Usage & History owns up to three SVG charts plus one expanded chart.
// Plotly continues to own the inventory and recipe charts.
const usageChartObserver = new ResizeObserver((entries) => {
  for (const { target } of entries) {
    if (target.clientWidth && target.clientHeight) {
      const chart = window.echarts?.getInstanceByDom(target);
      chart?.resize();
      if (chart?.getOption().yAxis?.[0]?.type === "category") {
        chart.setOption({ yAxis: { axisLabel: { width: Math.min(155, Math.max(80, target.clientWidth * 0.3)) } } });
      }
    }
  }
});

function disposeUsageChart(el) {
  if (!el) return;
  usageChartObserver.unobserve(el);
  window.echarts?.getInstanceByDom(el)?.dispose();
  delete el.dataset.usageChartKey;
  el.removeAttribute("role");
  el.removeAttribute("aria-label");
}

function usageChartAxis(name, type = "value") {
  const theme = statsTheme();
  return {
    type, name, nameLocation: "middle", nameGap: 32,
    nameTextStyle: { color: theme.muted, fontSize: 11 },
    axisLabel: { color: theme.muted, hideOverlap: true },
    axisLine: { lineStyle: { color: theme.border } },
    axisTick: { show: false },
    splitLine: { show: type === "value", lineStyle: { color: theme.border, opacity: 0.5 } }
  };
}

function usageChartZoom() {
  const theme = statsTheme();
  return [
    { type: "inside", xAxisIndex: 0, zoomOnMouseWheel: false, moveOnMouseWheel: false },
    { type: "slider", xAxisIndex: 0, bottom: 8, height: 22,
      borderColor: theme.border, textStyle: { color: theme.muted },
      handleSize: "130%", brushSelect: false, showDetail: false }
  ];
}

function renderUsageChart(id, option, description, key) {
  const el = document.getElementById(plotElOverride || id);
  if (!el) return;
  if (!window.echarts) {
    showNoData(id, "Charts could not load. Refresh the page to try again; summary tables remain available.");
    return;
  }
  // Hidden tabs are rendered when activated, after layout has a real size.
  if (!el.clientWidth || !el.clientHeight) return;
  let chart = echarts.getInstanceByDom(el);
  const previousZoom = el.dataset.usageChartKey === key ? chart?.getOption().dataZoom : null;
  if (!chart) {
    el.replaceChildren();
    chart = echarts.init(el, null, { renderer: "svg" });
    usageChartObserver.observe(el);
  }
  const theme = statsTheme();
  const css = getComputedStyle(document.documentElement);
  const background = css.getPropertyValue("--surface").trim() || css.getPropertyValue("--bg").trim() || "#fff";
  if (previousZoom && option.dataZoom) {
    option.dataZoom.forEach((zoom, index) => {
      if (previousZoom[index]) Object.assign(zoom, { start: previousZoom[index].start, end: previousZoom[index].end });
    });
  }
  chart.setOption({
    animation: !matchMedia("(prefers-reduced-motion: reduce)").matches,
    animationDuration: 250, animationDurationUpdate: 200,
    backgroundColor: "transparent", color: ["#0ea5e9", "#14b8a6", "#f59e0b"],
    textStyle: { color: theme.text, fontFamily: getComputedStyle(el).fontFamily },
    grid: { left: 12, right: 24, top: 20, bottom: 86, containLabel: true },
    ...option,
    tooltip: {
      trigger: "axis", confine: true, backgroundColor: background,
      borderColor: theme.border, textStyle: { color: theme.text },
      extraCssText: "max-width: min(320px, 80vw); white-space: normal; overflow-wrap: anywhere;",
      ...option.tooltip
    }
  }, { notMerge: true });
  el.dataset.usageChartKey = key;
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", description);
}

// Theme changes need a fresh option; density/layout changes are handled by resize.
new MutationObserver(() => {
  if (typeof renderAllStats !== "function") return;
  requestAnimationFrame(() => {
    if (document.querySelector('[data-view="stats"]')?.classList.contains("is-active")) renderAllStats();
    if (state.expandedChart?.startsWith("usage-")) {
      plotElOverride = "chart-expanded-body";
      try { CHART_DEFS[state.expandedChart].fn(chartModes[state.expandedChart] !== "alt"); }
      finally { plotElOverride = null; }
    }
  });
}).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
