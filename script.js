// item data (externalized)

let items = [];

/**
 * Flexibly parse date-like inputs.
 * Accepts: Date, timestamp (ms/s), "YYYY-MM-DD", "YYYY/MM/DD", "YYYY.MM.DD", "YYYY-MM"
 * Returns Date or null if invalid/empty (null/"0"/0).
 */
function parseDateFlexible(input) {
  if (!input && input !== 0) return null;
  if (input === null || input === "0" || input === 0) return null;

  if (input instanceof Date) {
    const t = input.getTime();
    return isNaN(t) ? null : input;
  }

  if (
    typeof input === "number" ||
    (typeof input === "string" && /^\d+$/.test(input))
  ) {
    const n = Number(input);
    // Heuristic: treat <= 1e11 as seconds, otherwise ms
    const d = new Date(n > 1e11 ? n : n * 1000);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof input === "string") {
    const s = input.trim().replace(/[./]/g, "-");
    const parts = s.split("-");
    let normalized = s;
    if (parts.length === 2) {
      normalized = `${parts[0]}-${parts[1]}-01`;
    }
    const d1 = new Date(normalized);
    if (!isNaN(d1.getTime())) return d1;
    const d2 = new Date(normalized + "T00:00:00");
    return isNaN(d2.getTime()) ? null : d2;
  }

  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Load items from external JSON and refresh UI.
 */
async function loadItems() {
  try {
    const res = await fetch("items.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data)) {
      items = data;
    } else if (data && Array.isArray(data.items)) {
      items = data.items;
    } else {
      items = [];
      console.warn("items.json format not recognized");
    }
  } catch (err) {
    console.error("Failed to load items.json:", err);
    items = [];
  }
  // Refresh UI if functions are ready
  if (typeof updateStatistics === "function") updateStatistics();
  if (typeof animateStatsCounters === "function") animateStatsCounters();
  if (typeof renderItems === "function") renderItems(items);
  document.dispatchEvent(
    new CustomEvent("itemsLoaded", { detail: { count: items.length } }),
  );
}

// Kick off loading ASAP
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => loadItems());
} else {
  loadItems();
}

window.getItems = () => items;

window.parseDateFlexible = parseDateFlexible;

// debounce utility
function debounce(fn, wait = 300) {
  let timer;
  const debounced = function (...args) {
    const ctx = this;
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(ctx, args), wait);
  };
  debounced.flush = function (...args) {
    clearTimeout(timer);
    return fn.apply(this, args);
  };
  return debounced;
}

let globalTotalValue = 0;

let globalTotalItems = 0;
let globalAvgDailyCost = 0;
let titleSplitInstance = null;
let auroraAnimationController = null;
const springEaseCache = {};

function animeIsReady() {
  return typeof anime !== "undefined" && typeof anime.animate === "function";
}

function getSpringEase(key, config, fallback = "easeOutQuad") {
  if (springEaseCache[key]) return springEaseCache[key];
  if (!animeIsReady() || typeof anime.spring !== "function") {
    springEaseCache[key] = fallback;
    return fallback;
  }
  const spring = anime.spring(config);
  springEaseCache[key] = spring?.ease || fallback;
  return springEaseCache[key];
}

function initTitleIntro() {
  if (!animeIsReady() || !anime.text || typeof anime.text.split !== "function") return;
  if (titleSplitInstance && typeof titleSplitInstance.revert === "function") {
    titleSplitInstance.revert();
  }
  titleSplitInstance = anime.text.split("#appTitle", {
    chars: { class: "title-char" },
    accessible: true,
  });
  const chars = document.querySelectorAll("#mainHeader .title-char");
  if (!chars.length) return;
  anime.animate(chars, {
    opacity: [0, 1],
    translateY: [18, 0],
    rotateX: [-25, 0],
    delay: anime.stagger(40),
    duration: 900,
    easing: getSpringEase(
      "titleChars",
      { mass: 1, stiffness: 120, damping: 18 },
      "easeOutExpo",
    ),
  });
}

function initPageIntroTimeline() {
  if (!animeIsReady()) return;
  const targets = ["#mainHeader", ".time-banner", ".stat-card", ".items-section"];
  anime.set(targets, { opacity: 0, translateY: 30 });
  anime
    .timeline({ easing: "easeOutExpo", duration: 650 })
    .add({ targets: "#mainHeader", opacity: [0, 1], translateY: [-30, 0] })
    .add(
      {
        targets: ".time-banner",
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 600,
      },
      "-=250",
    )
    .add(
      {
        targets: ".stat-card",
        opacity: [0, 1],
        translateY: [40, 0],
        delay: anime.stagger(120),
        duration: 700,
      },
      "-=200",
    )
    .add(
      {
        targets: ".items-section",
        opacity: [0, 1],
        scale: [0.95, 1],
        duration: 600,
      },
      "-=250",
    );
}

function startAuroraBackgroundAnimation() {
  if (!animeIsReady()) return;
  if (auroraAnimationController?.cancel) {
    auroraAnimationController.cancel();
  }
  const keyframes = [
    {
      "--aurora-hue-1": "205",
      "--aurora-hue-2": "285",
      "--aurora-angle": "-15deg",
    },
    {
      "--aurora-hue-1": "325",
      "--aurora-hue-2": "125",
      "--aurora-angle": "345deg",
    },
  ];
  const shared = {
    duration: 28000,
    direction: "alternate",
    easing: "linear",
    iterations: Infinity,
  };
  if (anime.waapi && typeof anime.waapi.animate === "function") {
    auroraAnimationController = anime.waapi.animate(document.documentElement, {
      keyframes,
      ...shared,
    });
  } else {
    auroraAnimationController = anime.animate(document.documentElement, {
      "--aurora-hue-1": [205, 325],
      "--aurora-hue-2": [285, 125],
      "--aurora-angle": ["-15deg", "345deg"],
      duration: shared.duration,
      direction: shared.direction,
      easing: shared.easing,
      loop: true,
    });
  }
}

function initAmbientOrbs(count = 6) {
  if (!animeIsReady()) return;
  if (document.getElementById("ambientOrbs")) return;
  const layer = document.createElement("div");
  layer.id = "ambientOrbs";
  document.body.appendChild(layer);
  Array.from({ length: count }).forEach((_, index) => {
    const orb = document.createElement("span");
    orb.className = "ambient-orb";
    orb.style.top = `${Math.random() * 100}%`;
    orb.style.left = `${Math.random() * 100}%`;
    layer.appendChild(orb);
    anime.animate(orb, {
      translateX: () => anime.random(-80, 80),
      translateY: () => anime.random(-80, 80),
      scale: () => anime.random(0.6, 1.4),
      easing: "easeInOutSine",
      direction: "alternate",
      loop: true,
      duration: anime.random(5000, 11000),
      delay: index * 250,
      opacity: [{ value: 0.15, duration: 0 }, { value: 0.45, duration: 1800 }],
    });
  });
}

function pulseStatCards() {
  if (!animeIsReady()) return;
  anime.animate(".stat-card .icon", {
    keyframes: [
      { scale: 0.9, opacity: 0.15, duration: 0 },
      { scale: 1.25, opacity: 0.3, duration: 900 },
      { scale: 1, opacity: 0.2, duration: 800 },
    ],
    easing: getSpringEase(
      "statPulse",
      { mass: 0.5, stiffness: 90, damping: 14 },
      "easeInOutSine",
    ),
    delay: anime.stagger(350),
    loop: true,
  });
}

function runItemCardAnimation() {
  if (!animeIsReady()) return;
  const cards = document.querySelectorAll(".item-card");
  if (!cards.length) return;
  anime.animate(cards, {
    opacity: [0, 1],
    translateY: [40, 0],
    rotateX: [-8, 0],
    scale: [0.96, 1],
    delay: anime.stagger(85),
    duration: 900,
    easing: getSpringEase(
      "cardEntrance",
      { mass: 0.8, stiffness: 140, damping: 18 },
      "easeOutQuint",
    ),
  });
  anime.animate(cards, {
    "--blur-amount": ["14px", "0px"],
    delay: anime.stagger(85),
    duration: 1100,
    easing: "easeOutCubic",
  });
}

/**
 * Updates the current date and time displayed in the banner.
 */
function updateRealTime() {
  const now = new Date();
  const dateOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  };
  const timeOptions = {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };

  const lang = typeof currentLang === "function" ? currentLang() : "zh-CN";
  const locale = lang === "en" ? "en-US" : "zh-CN";
  const dateStr = now.toLocaleDateString(locale, dateOptions);
  const timeStr = now.toLocaleTimeString(locale, timeOptions);
  const dayNames =
    typeof t === "function"
      ? t().dayNames
      : ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  const dayOfWeek = dayNames[now.getDay()];
  const ordinalPrefix = typeof t === "function" ? t().dayOrdinalPrefix : "第";
  const ordinalSuffix = typeof t === "function" ? t().dayOrdinalSuffix : "天";

  document.getElementById("currentDateTime").textContent = dateStr;
  document.getElementById("currentDayInfo").textContent =
    `${dayOfWeek} | ${ordinalPrefix}${Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000)}${ordinalSuffix}`;
  document.getElementById("systemTime").textContent = timeStr;
}

/**
 * Calculates the daily cost, total lifespan days, days used, and consumed value for an item.
 * Handles cases where retirementDate is null, 0, "0", or an invalid date string.
 * @param {object} item - The item object.
 * @returns {object} An object containing dailyCost, totalDays, daysUsed, and consumedValue.
 */

function calculateDailyCost(item) {
  const purchaseDate = parseDateFlexible(item.purchaseDate);

  const now = new Date();

  if (!purchaseDate) {
    return {
      dailyCost: "0.00",
      totalDays: 0,
      daysUsed: 0,
      consumedValue: "0.00",
    };
  }

  // 判断是否已退役

  const parsedRetirementDate = parseDateFlexible(item.retirementDate);

  const isIndefiniteUse =
    item.retirementDate === null ||
    item.retirementDate === 0 ||
    item.retirementDate === "0" ||
    !parsedRetirementDate;

  // 计算使用天数（关键修改）
  let daysUsed;
  if (isIndefiniteUse) {
    // 未退役：使用当前时间计算
    daysUsed = Math.max(
      0,
      Math.ceil((now.getTime() - purchaseDate.getTime()) / (1000 * 3600 * 24)),
    );
  } else {
    // 已退役：使用退役时间计算
    const retirementDate = parsedRetirementDate;
    daysUsed = Math.max(
      0,
      Math.ceil(
        (retirementDate.getTime() - purchaseDate.getTime()) /
          (1000 * 3600 * 24),
      ),
    );
  }

  let dailyCost;
  let totalDaysForDisplay;
  let consumedValue;

  if (isIndefiniteUse) {
    // 如果物品处于无限期使用状态
    dailyCost = daysUsed > 0 ? (item.price / daysUsed).toFixed(2) : "0.00";
    totalDaysForDisplay = Infinity;

    consumedValue = (parseFloat(dailyCost) * daysUsed).toFixed(2);
    consumedValue = Math.min(item.price, parseFloat(consumedValue)).toFixed(2);
  } else {
    // 对于有明确退役日期的物品
    const retirementDate = parsedRetirementDate;
    const totalDaysLifeSpan = Math.ceil(
      (retirementDate.getTime() - purchaseDate.getTime()) / (1000 * 3600 * 24),
    );

    if (totalDaysLifeSpan <= 0) {
      dailyCost = "0.00";
      consumedValue = item.price.toFixed(2);
      totalDaysForDisplay = totalDaysLifeSpan;
    } else {
      dailyCost = (item.price / totalDaysLifeSpan).toFixed(2);
      consumedValue = Math.min(
        item.price,
        parseFloat(dailyCost) * daysUsed,
      ).toFixed(2);
      totalDaysForDisplay = totalDaysLifeSpan;
    }
  }

  return {
    dailyCost,
    totalDays: totalDaysForDisplay,
    daysUsed,
    consumedValue,
  };
}

/**
 * Determines the status of an item based on its warranty date.
 * @param {object} item - The item object.
 * @returns {object} An object with status text and CSS class.
 */

function getItemStatus(item) {
  const today = new Date();

  const warrantyDate = parseDateFlexible(item.warrantyDate);

  const dict = typeof t === "function" ? t() : null;

  if (!warrantyDate) {
    return { text: dict ? dict.statusActive : "使用中", class: "active-tag" };
  }

  const daysToWarranty = Math.ceil((warrantyDate - today) / (1000 * 3600 * 24));

  if (warrantyDate < today) {
    return { text: dict ? dict.statusExpired : "已过保", class: "expired-tag" };
  } else if (daysToWarranty <= 30 && daysToWarranty > 0) {
    const text = dict
      ? dict.statusExpiring(daysToWarranty)
      : `保修即将到期 (${daysToWarranty}天)`;
    return { text, class: "expiring-tag" };
  }
  return { text: dict ? dict.statusActive : "使用中", class: "active-tag" };
}

/**
 * Renders the list of items in the items grid.
 * @param {Array<object>} itemsToRender - An array of item objects to display.
 */

function renderItems(itemsToRender) {
  const container = document.getElementById("itemsContainer");

  container.innerHTML = ""; // Clear previous items

  if (itemsToRender.length === 0) {
    const dict = typeof t === "function" ? t() : null;

    const emptyTitle = dict ? dict.emptyTitle : "未找到任何物品";

    const emptyText = dict
      ? dict.emptyText
      : "请尝试不同的搜索词或清除搜索条件。";

    container.innerHTML = `<div class="empty-state">

            <i class="fas fa-search"></i>

            <h3>${emptyTitle}</h3>

            <p>${emptyText}</p>

        </div>`;

    return;
  }

  const template = document.getElementById("itemCardTemplate");

  itemsToRender.forEach((item) => {
    const cost = calculateDailyCost(item);

    const status = getItemStatus(item);

    const dict = typeof t === "function" ? t() : null;

    // Clone template if available; otherwise fallback to previous HTML method
    if (template && template.content) {
      const node = template.content.cloneNode(true);
      const card = node.querySelector(".item-card");
      if (card) {
        card.style.opacity = 0; // initial opacity for animation
      }

      // helpers
      const setText = (sel, value) => {
        const el = node.querySelector(sel);
        if (el) el.textContent = value;
      };
      const setLabel = (key, value) => {
        const el = node.querySelector(`[data-i18n-key="${key}"]`);
        if (el) el.textContent = value;
      };

      // Fill fields
      setText('[data-field="name"]', item.name);
      const priceEl = node.querySelector('[data-field="price"]');
      if (priceEl) priceEl.textContent = item.price.toLocaleString();
      node.querySelectorAll('[data-field="currency"]').forEach((c) => {
        c.textContent = "¥";
      });

      const statusEl = node.querySelector('[data-field="statusText"]');
      if (statusEl) {
        statusEl.textContent = status.text;
        statusEl.classList.add(status.class);
      }

      setText('[data-field="purchaseDate"]', item.purchaseDate);
      setText('[data-field="warrantyDate"]', item.warrantyDate);
      setText(
        '[data-field="retirementDate"]',
        item.retirementDate === null ||
          item.retirementDate === 0 ||
          item.retirementDate === "0"
          ? dict
            ? dict.inUse
            : "使用中"
          : item.retirementDate,
      );

      const daysUsedDisplay = `${cost.daysUsed} ${dict ? dict.dayWord : "天"}`;

      setText('[data-field="dailyCost"]', cost.dailyCost);

      setText('[data-field="daysUsed"]', daysUsedDisplay);

      // Set translatable labels from lang.js
      setLabel("purchaseDate", dict ? dict.purchaseDate : "购买日期");
      setLabel("warrantyUntil", dict ? dict.warrantyUntil : "保修至");
      setLabel("retirementDate", dict ? dict.retirementDate : "退役时间");
      setLabel("costCalcTitle", dict ? dict.costCalcTitle : "成本计算");
      setLabel("dailyCost", dict ? dict.dailyCost : "日均成本");
      setLabel("daysUsed", dict ? dict.daysUsed : "已使用天数");

      container.appendChild(node);
    } else {
      // Fallback: previous innerHTML method (kept for safety)
      const card = document.createElement("div");
      card.className = "item-card";
      card.style.opacity = 0;

      const daysUsedDisplay = `${cost.daysUsed} ${dict ? dict.dayWord : "天"}`;
      card.innerHTML = `
                <div class="item-header">

                    <h3>${item.name}</h3>

                    <div class="price">¥${item.price.toLocaleString()}</div>

                    <span class="status-tag ${status.class}">${status.text}</span>

                </div>

                <div class="item-body">

                    <div class="item-detail">

                        <span class="detail-label">${dict ? dict.purchaseDate : "购买日期"}</span>

                        <span class="detail-value">${item.purchaseDate}</span>

                    </div>

                    <div class="item-detail">

                        <span class="detail-label">${dict ? dict.warrantyUntil : "保修至"}</span>

                        <span class="detail-value">${item.warrantyDate}</span>

                    </div>

                    <div class="item-detail">

                        <span class="detail-label">${dict ? dict.retirementDate : "退役时间"}</span>

                        <span class="detail-value">${item.retirementDate === null || item.retirementDate === 0 || item.retirementDate === "0" ? (dict ? dict.inUse : "使用中") : item.retirementDate}</span>

                    </div>

                    <div class="cost-calculation">

                        <div class="title">${dict ? dict.costCalcTitle : "成本计算"}</div>

                        <div class="item-detail">

                            <span class="detail-label">${dict ? dict.dailyCost : "日均成本"}</span>

                            <span class="detail-value">¥${cost.dailyCost}</span>

                        </div>

                        <div class="item-detail">

                            <span class="detail-label">${dict ? dict.daysUsed : "已使用天数"}</span>

                            <span class="detail-value">${daysUsedDisplay}</span>

                        </div>

                    </div>

                </div>
            `;
      container.appendChild(card);
    }
  });

  // Staggered slide-in animation for item cards

  requestAnimationFrame(() => runItemCardAnimation());
}

/**
 * Updates the overall statistics in the dashboard, including total value,
 * total items, and average daily cost. Asset health calculation and display are removed.
 */
function updateStatistics() {
  let totalValue = 0;
  let totalDailyCost = 0;

  items.forEach((item) => {
    totalValue += item.price;
    const cost = calculateDailyCost(item);
    totalDailyCost += parseFloat(cost.dailyCost);
  });

  // Store values for main counter animations
  globalTotalValue = totalValue;
  globalTotalItems = items.length;
  globalAvgDailyCost = totalDailyCost;

  // Build translated footer labels
  const dict = typeof t === "function" ? t() : null;
  const updatedLabel = dict ? dict.systemDataUpdated : "系统数据更新时间：";
  const itemsLabel = dict ? dict.currentItemsCount : "当前物品总数：";
  const valueLabel = dict ? dict.totalValueFooter : "总价值：";

  const now = new Date();
  const locale =
    typeof currentLang === "function" && currentLang() === "en"
      ? "en-US"
      : "zh-CN";
  const dateStr = now.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const footer = document.getElementById("systemDataInfo");
  if (footer) {
    footer.innerHTML = `${updatedLabel}<span id="updateTime">${dateStr}</span> | ${itemsLabel}<span id="infoTotalItems">${items.length}</span> | ${valueLabel}<span id="infoTotalValue">¥${totalValue.toLocaleString()}</span>`;
  }
}

/**
 * Animates the main statistics counters (Total Value, Total Items, Average Daily Cost).
 */
function animateStatsCounters() {
  const totalValueElement = document.getElementById("totalValue");
  const totalItemsElement = document.getElementById("totalItems");
  const avgDailyCostElement = document.getElementById("avgDailyCost");

  // Reset text content to 0 before animation to ensure consistent animation start
  totalValueElement.textContent = "¥0";
  totalItemsElement.textContent = "0";
  avgDailyCostElement.textContent = "¥0.00";

  const counterEase = getSpringEase(
    "counters",
    { mass: 1, stiffness: 80, damping: 20 },
    "easeOutQuad",
  );

  // Animate total value
  anime.animate({ num: 0 }, {
    num: globalTotalValue,
    easing: counterEase,
    duration: 1500,
    update: (anim) => {
      totalValueElement.textContent = `¥${Math.round(anim.animatables[0].target.num).toLocaleString()}`;
    },
    complete: () => {
      totalValueElement.textContent = `¥${globalTotalValue.toLocaleString()}`;
    },
  });

  // Animate total items
  anime.animate({ num: 0 }, {
    num: globalTotalItems,
    easing: counterEase,
    duration: 1200,
    round: 1,
    update: (anim) => {
      totalItemsElement.textContent = anim.animatables[0].target.num;
    },
    complete: () => {
      totalItemsElement.textContent = globalTotalItems;
    },
  });

  // Animate average daily cost
  anime.animate({ num: 0 }, {
    num: globalAvgDailyCost,
    easing: counterEase,
    duration: 1500,
    update: (anim) => {
      avgDailyCostElement.textContent = `¥${anim.animatables[0].target.num.toFixed(2)}`;
    },
    complete: () => {
      avgDailyCostElement.textContent = `¥${globalAvgDailyCost.toFixed(2)}`;
    },
  });
}

/**

 * Handles the search functionality based on user input.

 */

function handleSearch() {
  const inputEl = document.getElementById("searchInput");
  const raw = inputEl ? inputEl.value : "";
  const searchTerm = String(raw || "")
    .toLowerCase()
    .trim();

  const list = Array.isArray(items) ? items : [];
  const filteredItems = list.filter((item) => {
    const name = String(item?.name ?? "").toLowerCase();
    const category = String(item?.category ?? "").toLowerCase();
    const notes = String(item?.notes ?? "").toLowerCase();
    return (
      name.includes(searchTerm) ||
      category.includes(searchTerm) ||
      notes.includes(searchTerm)
    );
  });
  renderItems(filteredItems);
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  updateRealTime();
  setInterval(updateRealTime, 1000);
  initPageIntroTimeline();
  startAuroraBackgroundAnimation();
  initAmbientOrbs();
  pulseStatCards();
  initTitleIntro();

  const initialRender = () => {
    updateStatistics();

    animateStatsCounters();

    renderItems(items);
  };
  if (Array.isArray(items) && items.length) initialRender();
  document.addEventListener("itemsLoaded", initialRender);

  const runSearch = debounce(handleSearch, 300);

  document
    .getElementById("searchBtn")
    .addEventListener("click", () => runSearch.flush());

  document.getElementById("searchInput").addEventListener("input", runSearch);

  document

    .getElementById("searchInput")

    .addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        if (typeof runSearch?.flush === "function") {
          runSearch.flush();
        } else {
          handleSearch();
        }
      }
    });

  // Re-render translated dynamic areas when language changes
  const langSel = document.getElementById("langSwitcher");
  if (langSel) {
    langSel.addEventListener("change", () => {
      updateStatistics();
      renderItems(items);
    });
  }
  // Listen for global languageChanged event and re-render visible UI
  document.addEventListener("languageChanged", () => {
    updateStatistics();
    renderItems(items);
    updateRealTime();
    initTitleIntro();
  });
  document.addEventListener("themeChanged", () => {
    startAuroraBackgroundAnimation();
  });

  // i18n definitions removed from script.js.
  // Use global currentLang() and t() provided by lang.js.
});
