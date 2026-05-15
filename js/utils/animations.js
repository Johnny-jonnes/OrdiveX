/**
 * OrdiveX — Animations Utilitaires v9.4
 * Effets Count-up pour KPIs + Animation progressive pour Charts
 * S'applique AUTOMATIQUEMENT à toutes les pages (global)
 */

// ═══════════════════════════════════════════════════════════════════
// 1. COUNT-UP ANIMATION POUR LES KPIs
// ═══════════════════════════════════════════════════════════════════

/**
 * Anime un nombre de `start` à `end` dans un élément HTML
 */
function animateValue(element, start, end, duration = 800, prefix = '', suffix = '') {
  if (!element) return;
  if (isNaN(end) || end === null || end === undefined) {
    element.textContent = prefix + '0' + suffix;
    return;
  }
  // Détection appareil lent : skip l'animation
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
    element.textContent = prefix + Math.floor(end).toLocaleString('fr-FR') + suffix;
    return;
  }
  const range = end - start;
  if (range === 0) {
    element.textContent = prefix + Math.floor(end).toLocaleString('fr-FR') + suffix;
    return;
  }
  const startTime = performance.now();
  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
    const current = Math.floor(start + range * eased);
    element.textContent = prefix + current.toLocaleString('fr-FR') + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/**
 * Anime tous les KPIs avec data-animate-value sur la page
 */
function animateAllKPIs() {
  const kpis = document.querySelectorAll('[data-animate-value]');
  kpis.forEach((el, index) => {
    const end = parseFloat(el.getAttribute('data-animate-value'));
    const prefix = el.getAttribute('data-prefix') || '';
    const suffix = el.getAttribute('data-suffix') || '';
    const duration = 600 + (index * 100);
    setTimeout(() => {
      animateValue(el, 0, end, duration, prefix, suffix);
    }, 150 + (index * 80));
  });
}

/**
 * Anime un élément KPI manuellement
 */
function animateKPI(selector, value, suffix = '') {
  const el = document.querySelector(selector);
  if (el) animateValue(el, 0, value, 800, '', suffix);
}

// ═══════════════════════════════════════════════════════════════════
// 2. AUTO-DETECT : Anime automatiquement les .kpi-value sur TOUTE page
//    Détecte les chiffres affichés (même sans data-animate-value)
// ═══════════════════════════════════════════════════════════════════

function _autoAnimateKPIValues() {
  // Déjà traités via data-animate-value
  if (document.querySelectorAll('[data-animate-value]').length > 0) {
    animateAllKPIs();
    return;
  }

  // Auto-détection : trouver les .kpi-value qui contiennent un chiffre
  const kpis = document.querySelectorAll('.kpi-value');
  if (!kpis.length) return;

  // Si appareil lent, ne pas animer
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) return;

  kpis.forEach((el, index) => {
    const raw = el.textContent.trim();
    // Extraire le nombre du texte (ex: "15 450 000 GNF" → 15450000)
    const numMatch = raw.replace(/\s/g, '').match(/^([^\d]*)([\d,\.]+)(.*)/);
    if (!numMatch) return;

    const prefix = numMatch[1] || '';
    const numStr = numMatch[2].replace(/,/g, '');
    const suffix = numMatch[3] || '';
    const numVal = parseFloat(numStr);

    if (isNaN(numVal) || numVal === 0) return;

    // Stocker la valeur finale et afficher 0
    el.textContent = prefix + '0' + suffix;
    const duration = 600 + (index * 100);
    setTimeout(() => {
      animateValue(el, 0, numVal, duration, prefix, suffix);
    }, 150 + (index * 80));
  });
}

// ═══════════════════════════════════════════════════════════════════
// 3. ANIMATION PROGRESSIVE DES CHARTS (Canvas 2D)
//    Les barres montent, les lignes se tracent, le donut se remplit
// ═══════════════════════════════════════════════════════════════════

/**
 * Wrapper animé pour Charts.bar — les barres montent progressivement
 */
function _wrapChartAnimations() {
  if (!window.Charts) return;

  const _origBar = Charts.bar.bind(Charts);
  const _origLine = Charts.line.bind(Charts);
  const _origDonut = Charts.donut.bind(Charts);

  Charts.bar = function(canvasId, labels, datasets, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4)) {
      return _origBar(canvasId, labels, datasets, options);
    }

    // Animer les barres de 0 à leur valeur sur 40 frames
    const totalFrames = 40;
    let frame = 0;
    const origDatasets = datasets.map(d => ({ ...d, data: [...d.data] }));

    function animateFrame() {
      frame++;
      const progress = 1 - Math.pow(1 - (frame / totalFrames), 3); // easeOutCubic
      const animatedDatasets = origDatasets.map(d => ({
        ...d,
        data: d.data.map(v => v * progress)
      }));
      _origBar(canvasId, labels, animatedDatasets, options);
      if (frame < totalFrames) requestAnimationFrame(animateFrame);
      else _origBar(canvasId, labels, origDatasets, options); // Rendu final précis
    }
    requestAnimationFrame(animateFrame);
  };

  Charts.line = function(canvasId, labels, datasets, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4)) {
      return _origLine(canvasId, labels, datasets, options);
    }

    // La courbe monte de 0 à sa hauteur sur 40 frames
    const totalFrames = 40;
    let frame = 0;
    const origDatasets = datasets.map(d => ({ ...d, data: [...d.data] }));

    function animateFrame() {
      frame++;
      const progress = 1 - Math.pow(1 - (frame / totalFrames), 3);
      const animatedDatasets = origDatasets.map(d => ({
        ...d,
        data: d.data.map(v => v * progress)
      }));
      _origLine(canvasId, labels, animatedDatasets, options);
      if (frame < totalFrames) requestAnimationFrame(animateFrame);
      else _origLine(canvasId, labels, origDatasets, options);
    }
    requestAnimationFrame(animateFrame);
  };

  Charts.donut = function(canvasId, labels, data, colors) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4)) {
      return _origDonut(canvasId, labels, data, colors);
    }

    // Le donut se remplit progressivement (angle de 0 à 360°)
    const totalFrames = 45;
    let frame = 0;

    function animateFrame() {
      frame++;
      const progress = 1 - Math.pow(1 - (frame / totalFrames), 3);
      const animatedData = data.map(v => v * progress);
      _origDonut(canvasId, labels, animatedData, colors);
      if (frame < totalFrames) requestAnimationFrame(animateFrame);
      else _origDonut(canvasId, labels, data, colors); // Rendu final précis
    }
    requestAnimationFrame(animateFrame);
  };
}

// ═══════════════════════════════════════════════════════════════════
// 4. HOOK GLOBAL : Intercepter chaque navigation de page
//    pour déclencher les animations automatiquement
// ═══════════════════════════════════════════════════════════════════

function _hookRouterForAnimations() {
  if (!window.Router || !Router.navigate) return;

  const _origNavigate = Router.navigate.bind(Router);
  Router.navigate = function(page) {
    _origNavigate(page);
    // Après le rendu de la page, animer les KPIs
    // Petit délai pour laisser le DOM se construire
    setTimeout(_autoAnimateKPIValues, 200);
  };
}

// ═══════════════════════════════════════════════════════════════════
// INITIALISATION GLOBALE
// ═══════════════════════════════════════════════════════════════════

// Wraper les Charts dès que disponibles
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    _wrapChartAnimations();
    _hookRouterForAnimations();
  });
} else {
  // DOM déjà prêt
  setTimeout(() => {
    _wrapChartAnimations();
    _hookRouterForAnimations();
  }, 0);
}

// Exposer globalement
window.animateValue = animateValue;
window.animateAllKPIs = animateAllKPIs;
window.animateKPI = animateKPI;
