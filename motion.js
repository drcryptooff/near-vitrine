// Animations au défilement : titres ligne par ligne, apparitions décalées,
// barre de progression et léger parallaxe. Rien ne s'active si le visiteur
// demande moins d'animations : le contenu reste alors visible tel quel.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reduce && 'IntersectionObserver' in window) {
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  document.documentElement.classList.add('motion');
  // Ce fichier remplace le fondu global d'app.js, qui doublerait les effets.
  $$('.reveal').forEach(el => el.classList.remove('reveal'));

  // Titres : chaque ligne glisse depuis sous sa propre ligne.
  $$('.hero h1, main h2').forEach(title => {
    if (title.closest('dialog')) return;
    const lines = title.innerHTML.split(/<br\s*\/?>/i);
    title.innerHTML = lines.map((line, i) => `<span class="m-line" style="--m-l:${i}"><span>${line}</span></span>`).join('');
    title.classList.add('m-title');
  });

  // Éléments isolés et groupes dont les enfants arrivent l'un après l'autre.
  const single = ['.hero-copy > *:not(h1)', '.hero-scene', '.section-kicker', '.intro-grid p', '.editorial-photo', '.section-heading > p', '.ai-copy > p', '.ai-copy > .text-link', '.ai-playground', '.difference-heading > p', '.comparison', '.trust-title > p', '.trust-symbol', '.swiss-card','.project-mark', '.project-grid > div > p', '.project-grid .text-link', '.faq-section > div > p', '.contact-section p', '.contact-section .button', '.email-link'];
  const groups = ['.promise-strip .wrap', '.two-world-grid', '.difference-list', '.day-grid', '.trust-points', '.swiss-points', '.faq-list', '.phrase-list'];
  single.forEach(selector => $$(selector).forEach(el => el.classList.add('m-item')));
  groups.forEach(selector => $$(selector).forEach(group => [...group.children].forEach(child => child.classList.add('m-item'))));
  $$('.difference-list > article').forEach(el => el.classList.add('m-left'));
  $$('.day-grid > article, .two-world-grid > .world, .swiss-card').forEach(el => el.classList.add('m-rise'));
  $$('.project-mark, .trust-symbol').forEach(el => el.classList.add('m-pop'));

  // Les éléments qui entrent ensemble à l'écran se suivent de 90 ms.
  const observer = new IntersectionObserver(entries => {
    let order = 0;
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.style.setProperty('--m-d', `${order++ * 90}ms`);
      entry.target.classList.add('m-in');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('.m-item, .m-title').forEach(el => observer.observe(el));

  // Barre de progression et parallaxe, calculés une fois par image.
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.prepend(bar);
  const layers = [
    ['.orbit-one', -60], ['.orbit-two', -100], ['.scene-star', -140],
    ['.editorial-photo > img', 45], ['.contact-spark', -80], ['.swiss-seal', -24]
  ].flatMap(([selector, speed]) => $$(selector).map(el => ({ el, speed })));
  let ticking = false;
  const update = () => {
    ticking = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
    const phone = innerWidth <= 600, factor = phone ? 0.5 : 1;
    for (const { el, speed } of layers) {
      // Sur téléphone, l’étoile du contact chevaucherait le titre.
      if (phone && el.classList.contains('contact-spark')) { el.style.removeProperty('--m-p'); continue; }
      const box = el.getBoundingClientRect();
      if (box.bottom < -200 || box.top > innerHeight + 200) continue;
      // -1 quand l'élément entre par le bas, 1 quand il sort par le haut.
      const progress = 1 - (box.top + box.height / 2) / (innerHeight / 2);
      el.style.setProperty('--m-p', (progress * speed * factor).toFixed(1) + 'px');
    }
  };
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request);
  update();
}
