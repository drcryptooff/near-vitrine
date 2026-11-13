// Keep the tablet, invitation and playback controls together, without starting the film.
export function demoScrollTop({ top, tabletTop, tabletBottom, bottom, viewportHeight, pageHeight }) {
  const margin = 16;
  const height = bottom - top;
  const target = height <= viewportHeight - 2 * margin
    ? top - (viewportHeight - height) / 2
    : tabletTop - Math.max(margin, (viewportHeight - (tabletBottom - tabletTop)) / 2);
  return Math.max(0, Math.min(target, pageHeight - viewportHeight));
}

export function frameDemo({ focus = true } = {}) {
  const demo = document.querySelector('#demo-player');
  const tablet = demo.querySelector('.demo-tablet');
  if (focus) tablet.focus({ preventScroll: true });
  const bounds = tablet.getBoundingClientRect();
  const parts = ['.demo-player-controls', '#demo-start-hint', '.demo-stage', '.demo-bottom']
    .map(selector => demo.querySelector(selector).getBoundingClientRect())
    .filter(rect => rect.height > 0);
  window.scrollTo({
    top: demoScrollTop({
      top: Math.min(...parts.map(rect => rect.top)) + window.scrollY,
      bottom: Math.max(...parts.map(rect => rect.bottom)) + window.scrollY,
      tabletTop: bounds.top + window.scrollY,
      tabletBottom: bounds.bottom + window.scrollY,
      viewportHeight: window.innerHeight,
      pageHeight: document.documentElement.scrollHeight
    }),
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
  });
}

export function setupDemoNavigation() {
  document.querySelectorAll('a[href="#demo"]').forEach(link => link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    // Retain the site's home-entry policy and any campaign query parameters.
    history.replaceState(history.state, '', `${location.pathname}${location.search}`);
    frameDemo();
  }));
}
