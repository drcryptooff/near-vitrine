import { pauseDemo } from './demo-ui.js?v=20261024-alice-profile-2';
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const phrases = {
  reply: ['Vous voulez répondre à Alice.', 'Near sait de quel message il s’agit et lance l’enregistrement de votre réponse.', 'L’envoi attend votre accord.'],
  redo: ['Vous voulez recommencer.', 'L’ancien enregistrement est mis de côté, vous en dites un nouveau.', 'Changer d’avis n’envoie rien.'],
  photo: ['Vous cherchez une photo précise.', 'Near retrouve les photos d’Alice de la semaine passée, grâce au prénom et à la date.', 'Aucune analyse du contenu des images.']
};
$$('[data-phrase]').forEach(button => button.addEventListener('click', () => {
  $$('[data-phrase]').forEach(b => { const active = b === button; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
  const [title, description, boundary] = phrases[button.dataset.phrase];
  $('#ai-title').textContent = title; $('#ai-description').textContent = description; $('#ai-boundary').textContent = boundary;
}));

$('.menu-toggle').addEventListener('click', () => {
  const open = $('#nav-links').classList.toggle('open');
  $('.menu-toggle').setAttribute('aria-expanded', String(open));
  $('.menu-toggle').setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
});
$('#nav-links').addEventListener('click', (event) => { if(event.target.closest('a')) { $('#nav-links').classList.remove('open'); $('.menu-toggle').setAttribute('aria-expanded','false'); $('.menu-toggle').setAttribute('aria-label','Ouvrir le menu'); } });
document.addEventListener('keydown', event => { if (event.key === 'Escape') { $('#nav-links').classList.remove('open'); $('.menu-toggle').setAttribute('aria-expanded', 'false'); $('.menu-toggle').setAttribute('aria-label', 'Ouvrir le menu'); } });

const dialogContent = {
  privacy: '<h2>Votre visite, simplement.</h2><p>Aucun traceur publicitaire, aucune mesure d’audience, aucun formulaire. Polices, images et voix sont fournies avec le site.</p><p>La démo est fictive : elle n’utilise pas votre micro, n’appelle aucun service d’IA et n’envoie aucun message.</p><p>Le bouton de contact ouvre votre messagerie ; votre e-mail n’est adressé qu’à Marvin (Marvinnussberger@gmail.com).</p>',
  legal: '<h2>Near, un projet en développement.</h2><p>Ce site présente le projet Near ; aucune offre commerciale n’y est proposée. Prix, matériel et disponibilité seront précisés plus tard.</p><p>Jeanne et Alice sont fictives. La photo est générée par IA et le jardin est une illustration : ce ne sont pas des témoignages.</p><p>Contact : Marvin — Marvinnussberger@gmail.com.</p>'
};
$$('[data-dialog]').forEach(button => button.addEventListener('click', () => { pauseDemo(); $('#dialog-content').innerHTML = dialogContent[button.dataset.dialog]; $('#info-dialog').showModal(); }));
$('.dialog-close').addEventListener('click', () => $('#info-dialog').close());
$('.dialog-done').addEventListener('click', () => $('#info-dialog').close());
$('#info-dialog').addEventListener('click', event => { if (event.target === $('#info-dialog')) { const r = event.target.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) event.target.close(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseDemo(); });
window.addEventListener('pagehide', pauseDemo);
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if(entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: .08 });
  $$('.intro-grid, .two-world-grid, .ai-grid, .difference-heading, .day-grid, .trust-title, .swiss-card, .project-grid').forEach(element => { element.classList.add('reveal'); observer.observe(element); });
  const demoObserver = new IntersectionObserver(entries => { if (!entries[0].isIntersecting) pauseDemo(); }); demoObserver.observe($('#demo'));
}
