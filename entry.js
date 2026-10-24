// Run before the document is parsed, so old demo links cannot trigger an
// animated fragment jump and mobile browsers cannot restore a previous scene.
(() => {
  const navigation = performance.getEntriesByType('navigation')[0];
  const homeEntry = !location.hash || location.hash === '#demo';
  if (!homeEntry || navigation?.type === 'back_forward') return;

  const restoresScroll = 'scrollRestoration' in history;
  const previousRestoration = history.scrollRestoration;
  if (restoresScroll) history.scrollRestoration = 'manual';
  if (location.hash === '#demo') {
    history.replaceState(history.state, '', `${location.pathname}${location.search}`);
  }

  let visitorMoved = false;
  const respectVisitor = () => { visitorMoved = true; };
  const inputEvents = ['pointerdown', 'touchstart', 'wheel', 'keydown'];
  inputEvents.forEach(type => window.addEventListener(type, respectVisitor, { passive: true }));
  const showHome = () => {
    if (!visitorMoved && !location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  };

  showHome();
  window.addEventListener('pageshow', () => {
    showHome();
    requestAnimationFrame(() => {
      showHome();
      // Once entry is complete, normal Back/Forward navigation can restore
      // its position. Never pull a visitor back after they start interacting.
      if (restoresScroll) history.scrollRestoration = previousRestoration;
      inputEvents.forEach(type => window.removeEventListener(type, respectVisitor));
    });
  }, { once: true });
})();
