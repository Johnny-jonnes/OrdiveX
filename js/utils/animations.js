/**
 * OrdiveX — Animations Utilitaires v9.4
 * Count-up KPIs (global auto-détection) + Charts reveal (CSS clip-path, zéro scintillement)
 */

// ═══════════════════════════════════════════════════════════════════
// 1. COUNT-UP ANIMATION POUR TOUS LES KPIs (GLOBAL)
// ═══════════════════════════════════════════════════════════════════

function animateValue(element, start, end, duration = 800, prefix = '', suffix = '') {
  if (!element) return;
  if (isNaN(end) || end === null || end === undefined) {
    element.textContent = prefix + '0' + suffix;
    return;
  }
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
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(start + range * eased);
    element.textContent = prefix + current.toLocaleString('fr-FR') + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function animateAllKPIs() {
  const kpis = document.querySelectorAll('[data-animate-value]');
  kpis.forEach((el, index) => {
    const end = parseFloat(el.getAttribute('data-animate-value'));
    const prefix = el.getAttribute('data-prefix') || '';
    const suffix = el.getAttribute('data-suffix') || '';
    const duration = 600 + (index * 100);
    setTimeout(() => animateValue(el, 0, end, duration, prefix, suffix), 150 + (index * 80));
  });
}

function animateKPI(selector, value, suffix = '') {
  const el = document.querySelector(selector);
  if (el) animateValue(el, 0, value, 800, '', suffix);
}

// ═══════════════════════════════════════════════════════════════════
// 2. AUTO-DETECT : Anime TOUS les .kpi-value de TOUTE page
// ═══════════════════════════════════════════════════════════════════

function _autoAnimateKPIValues() {
  // Priorité aux data-animate-value explicites
  if (document.querySelectorAll('[data-animate-value]').length > 0) {
    animateAllKPIs();
  }

  // Auto-détection : .kpi-value sans data-animate-value
  const kpis = document.querySelectorAll('.kpi-value:not([data-animate-value]):not([data-animated])');
  if (!kpis.length) return;
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) return;

  kpis.forEach((el, index) => {
    const raw = el.textContent.trim();
    // Extraire le nombre (ex: "15 450 000 GNF" → 15450000, "42,5%" → 42)
    const numMatch = raw.replace(/\u00a0/g, ' ').match(/^([^\d-]*?)([\d\s,.]+)(.*)/);
    if (!numMatch) return;

    const prefix = numMatch[1] || '';
    const numStr = numMatch[2].replace(/\s/g, '').replace(/,/g, '.');
    const suffix = numMatch[3] || '';
    const numVal = parseFloat(numStr);

    if (isNaN(numVal) || numVal === 0) return;

    el.setAttribute('data-animated', 'true'); // Marquer comme traité
    el.textContent = prefix + '0' + suffix;
    const duration = 600 + (index * 100);
    setTimeout(() => animateValue(el, 0, numVal, duration, prefix, suffix), 150 + (index * 80));
  });
}

// ═══════════════════════════════════════════════════════════════════
// 3. ANIMATION DES CHARTS PAR CSS (clip-path reveal)
//    Zéro redraw Canvas = zéro scintillement
// ═══════════════════════════════════════════════════════════════════

// Inject CSS pour l'animation reveal
(function _injectChartAnimCSS() {
  if (document.getElementById('ordivex-chart-anim-css')) return;
  const style = document.createElement('style');
  style.id = 'ordivex-chart-anim-css';
  style.textContent = `
    @keyframes chartRevealUp {
      from { clip-path: inset(100% 0 0 0); }
      to   { clip-path: inset(0 0 0 0); }
    }
    @keyframes chartRevealRight {
      from { clip-path: inset(0 100% 0 0); }
      to   { clip-path: inset(0 0 0 0); }
    }
    @keyframes chartFadeScale {
      from { opacity: 0; transform: scale(0.92); }
      to   { opacity: 1; transform: scale(1); }
    }
    canvas.chart-animate-bar {
      animation: chartRevealUp 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }
    canvas.chart-animate-line {
      animation: chartRevealRight 1s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }
    canvas.chart-animate-donut {
      animation: chartFadeScale 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }
  `;
  document.head.appendChild(style);
})();

/**
 * Appliquer l'animation CSS à un canvas après le dessin
 */
function _animateCanvas(canvasId, type) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) return;

  // Retirer les anciennes classes d'animation
  canvas.classList.remove('chart-animate-bar', 'chart-animate-line', 'chart-animate-donut');

  // Force reflow pour relancer l'animation
  void canvas.offsetWidth;

  const animClass = {
    bar: 'chart-animate-bar',
    line: 'chart-animate-line',
    donut: 'chart-animate-donut'
  }[type] || 'chart-animate-bar';

  canvas.classList.add(animClass);

  // Nettoyer après l'animation
  canvas.addEventListener('animationend', () => {
    canvas.classList.remove(animClass);
  }, { once: true });
}

/**
 * Wrapper : intercepter Charts.bar/line/donut pour ajouter l'animation CSS
 */
function _wrapChartAnimations() {
  if (!window.Charts) return;
  if (Charts._animWrapped) return; // Éviter double-wrap
  Charts._animWrapped = true;

  const _origBar = Charts.bar;
  const _origLine = Charts.line;
  const _origDonut = Charts.donut;

  Charts.bar = function(canvasId, labels, datasets, options) {
    _origBar.call(Charts, canvasId, labels, datasets, options);
    _animateCanvas(canvasId, 'bar');
  };

  Charts.line = function(canvasId, labels, datasets, options) {
    _origLine.call(Charts, canvasId, labels, datasets, options);
    _animateCanvas(canvasId, 'line');
  };

  Charts.donut = function(canvasId, labels, data, colors) {
    _origDonut.call(Charts, canvasId, labels, data, colors);
    _animateCanvas(canvasId, 'donut');
  };
}

// ═══════════════════════════════════════════════════════════════════
// 4. HOOK GLOBAL : Auto-animer à chaque navigation de page
// ═══════════════════════════════════════════════════════════════════

function _hookRouterForAnimations() {
  if (!window.Router || !Router.navigate) return;
  if (Router._animHooked) return;
  Router._animHooked = true;

  const _origNavigate = Router.navigate.bind(Router);
  Router.navigate = function(page) {
    _origNavigate(page);
    setTimeout(_autoAnimateKPIValues, 250);
  };
}

// ═══════════════════════════════════════════════════════════════════
// INITIALISATION
// ═══════════════════════════════════════════════════════════════════

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    _wrapChartAnimations();
    _hookRouterForAnimations();
  });
} else {
  setTimeout(() => {
    _wrapChartAnimations();
    _hookRouterForAnimations();
  }, 0);
}

window.animateValue = animateValue;
window.animateAllKPIs = animateAllKPIs;
window.animateKPI = animateKPI;
