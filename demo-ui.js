import { FilmPlayer } from './demo-film-player.js?v=20261111-film';
import { film } from './demo-film.js?v=20261111-film';
import { scenarios, seniorLines, tabletChoices, demoPresentation, demoAudioState, aliceTypingAt } from './demo-script.js?v=20261111-film';
import { homeScreen, assistantScreen } from './tablet-app.js?v=20261111-film';
import { captionMapping, captionWordAt } from './demo-captions.js';
import { recordedTimings } from './demo-word-timings-flow.js';

const $ = selector => document.querySelector(selector);
const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const waveHeights=[7,12,5,16,21,12,8,17,24,14,7,11,20,15,9,23,18,7,13,20,10,15,8,5];
const voiceWave=()=>waveHeights.map(height=>`<i style="height:${height}px"></i>`).join('');
const screen = $('#tablet-screen');
const audio = $('#demo-audio');
const demo = $('#demo-player');
const finish = $('#demo-finish');
const sceneLayers = [...demo.children].filter(element => element !== finish);
const steps = scenarios.reply.steps;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let lastRender = '';
let lastScreen = '';
let snapshot, caption, highlighted, frame;
const tablet = $('.demo-tablet');
let demoInView = false;

// The chapters under the scene: each one fills while it plays, and a touch jumps to it.
const chapters = $('#film-chapters');
chapters.innerHTML = film.chapters.map((chapter, index) => `<button type="button" class="film-chapter" data-chapter="${index}" aria-label="Aller au chapitre ${index + 1} : ${chapter.title}"><span class="film-seg"><i></i></span><span class="film-label">${chapter.title}</span></button>`).join('');
const chapterButtons = [...chapters.children];
const chapterFills = chapterButtons.map(button => button.querySelector('i'));
const chapterNow = $('#film-now');
let currentChapter = -2;
function updateChapters(time) {
  const idle = snapshot.state === 'idle';
  let current = -1;
  film.chapters.forEach((chapter, index) => {
    const progress = idle ? 0 : Math.max(0, Math.min(1, (time - chapter.at) / (chapter.end - chapter.at)));
    chapterFills[index].style.transform = `scaleX(${progress})`;
    if (!idle && time >= chapter.at && time < chapter.end) current = index;
  });
  if (current === currentChapter) return;
  currentChapter = current;
  chapterNow.textContent = current < 0 ? '' : film.chapters[current].title;
  chapterButtons.forEach((button, index) => { if (index === current) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current'); });
}

// What travels between the two devices: Alice's photo to the tablet, then Jeanne's voice to the phone.
// Both follow the film's clock, so a pause freezes them in the air and a jump places them where they belong.
const flight = document.createElement('div');
flight.className = 'demo-flight'; flight.hidden = true; flight.setAttribute('aria-hidden', 'true');
demo.append(flight);
const sendCue = film.cues[steps.findIndex(step => step.view === 'send')];
const sentCue = film.cues[steps.findIndex(step => step.view === 'sent')];
const flights = [
  { kind: 'photo', from: sendCue.audioAt + .35, to: sendCue.end, html: '<img src="assets/garden.svg" alt="">',
    source: () => $('#alice-message img'), target: () => screen.querySelector('.na-messages .na-picture') },
  { kind: 'voice', from: sentCue.audioEnd + .1, to: sentCue.end, html: `${icon('mic')}<span class="voice-wave">${voiceWave()}</span>`,
    source: () => screen.querySelector('.na-cue-icon'), target: () => $('.phone-chat') }
];
function updateFlight(time) {
  const moving = ['playing', 'paused'].includes(snapshot.state) && !reducedMotion.matches ? flights.find(item => time >= item.from && time < item.to) : null;
  const from = moving?.source()?.getBoundingClientRect(), to = moving?.target()?.getBoundingClientRect();
  if (!from?.width || !to?.width) { if (!flight.hidden) { flight.hidden = true; flight.dataset.kind = ''; } return; }
  if (flight.dataset.kind !== moving.kind) { flight.dataset.kind = moving.kind; flight.innerHTML = moving.html; }
  const base = demo.getBoundingClientRect();
  const progress = (time - moving.from) / (moving.to - moving.from);
  const eased = progress < .5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
  const start = { x: from.left + from.width / 2, y: from.top + from.height / 2, w: from.width, h: from.height };
  // The photo lands on Messages and takes its round shape; the voice lands at the bottom of the conversation as a small pill.
  const end = moving.kind === 'photo'
    ? { x: to.left + to.width / 2, y: to.top + to.height / 2, w: to.width, h: to.height }
    : { x: to.left + to.width / 2, y: to.bottom - 34, w: Math.min(120, to.width * .7), h: 30 };
  const mix = (a, b) => a + (b - a) * eased;
  const width = mix(start.w, end.w), height = mix(start.h, end.h);
  const lift = Math.sin(Math.PI * progress) * Math.min(70, Math.abs(end.x - start.x) * .22);
  flight.hidden = false;
  flight.style.width = `${width}px`; flight.style.height = `${height}px`;
  flight.style.transform = `translate(${mix(start.x, end.x) - base.left - width / 2}px,${mix(start.y, end.y) - lift - base.top - height / 2}px)`;
  flight.style.opacity = String(Math.max(0, Math.min(1, progress / .1, (1 - progress) / .12)));
  flight.style.borderRadius = `${moving.kind === 'photo' ? mix(8, Math.min(width, height) / 2) : height / 2}px`;
}

function updateCharactersVisibility() {
  const visible = demoInView && snapshot?.step.speaker === 'senior' && !['idle', 'ended'].includes(snapshot.state);
  demo.dataset.jeanne = visible ? 'visible' : 'hidden';
  $('.demo-senior-column').setAttribute('aria-hidden', String(!visible));
  const receiving=!!snapshot?.step.alice&&snapshot?.state!=='idle';
  const aliceVisible=demoInView&&(receiving||snapshot?.step.speaker==='family')&&snapshot?.state!=='idle';
  demo.dataset.alice=aliceVisible?'visible':'hidden';
  demo.dataset.aliceMood=receiving?snapshot.step.alice:'typing';
  $('.demo-alice-column').setAttribute('aria-hidden',String(!aliceVisible));
  $('.alice-portrait').setAttribute('aria-label',receiving?snapshot.step.alice==='happy'?'Alice, téléphone en main, est heureuse de recevoir le message de Jeanne':'Alice, téléphone en main, lit le message de Jeanne':'Alice, téléphone en main, écrit un message à Jeanne');
  $('.alice-name span').textContent=receiving?'Des nouvelles de maman ♡':'Un petit mot pour Jeanne';
}

function prepareCaption(spokenText) {
  const element = screen.querySelector('.assistant-words, .caption');
  caption = null;
  highlighted = null;
  if (!element) return;
  const mapping = captionMapping(spokenText, element.textContent, recordedTimings[snapshot.step.clip]);
  element.replaceChildren();
  let end = 0;
  const textNode = text => document.createTextNode(text.replace(/ (?=[!?:;])/gu, ' '));
  const words = mapping.words.map(word => {
    element.append(textNode(mapping.text.slice(end, word.start)));
    const span = document.createElement('span');
    span.className = 'spoken-word';
    span.textContent = mapping.text.slice(word.start, word.end);
    element.append(span);
    end = word.end;
    return { element: span, index: word.spokenIndex };
  });
  element.append(textNode(mapping.text.slice(end)));
  caption = { ...mapping, words };
}

// One screen glides into the next: the previous one fades out above the new one.
function showScreen(html) {
  if (html === lastScreen) return;
  const previous = lastScreen && !reducedMotion.matches ? screen.firstElementChild : null;
  lastScreen = html;
  screen.innerHTML = html;
  if (!previous) return;
  previous.classList.add('na-leaving'); previous.setAttribute('aria-hidden', 'true');
  previous.addEventListener('animationend', () => previous.remove(), { once: true });
  screen.append(previous);
}

// Every drawn frame reads the film's clock: the step, the word, Alice's typing, the chapters, what is in the air.
function animate() {
  if (snapshot.state === 'playing') {
    const before = snapshot;
    player.sync();
    if (snapshot !== before) return; // The new step has drawn itself and carries the next frame.
  }
  const time = player.time(), clip = player.clip();
  const playing = snapshot.state === 'playing', idle = snapshot.state === 'idle';
  const nextVoicing = playing && clip.sounding ? snapshot.step.speaker : 'none';
  if (demo.dataset.voicing !== nextVoicing) demo.dataset.voicing = nextVoicing;
  // As on the tablet, the two answers appear only once the assistant has finished her sentence.
  const answers = snapshot.step.speaker === 'assistant' && !clip.ended && !idle ? 'wait' : 'shown';
  if (demo.dataset.answers !== answers) demo.dataset.answers = answers;
  const composing=snapshot.step.speaker==='family'&&snapshot.step.view==='compose'&&!idle;
  const typed=composing?aliceTypingAt(clip.time):{text:'',active:false};
  const draft=$('#alice-draft-text');
  if(draft&&draft.textContent!==typed.text)draft.textContent=typed.text;
  const typing=composing&&typed.text&&!typed.active?'done':composing&&typed.active&&playing?'active':'none';
  if(demo.dataset.typing!==typing)demo.dataset.typing=typing;
  const timer=screen.querySelector('.na-recording .na-audio-time');
  if(timer){const seconds=Math.floor(Math.max(0,clip.time));timer.textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;}
  const speaking = snapshot.step.speaker === 'assistant' && ['playing', 'paused'].includes(snapshot.state) && !clip.ended;
  const index = speaking && caption ? captionWordAt(caption.timings, clip.time, clip.duration, caption.recorded) : -1;
  const next = index < 0 ? null : caption?.words.find(word => word.index === index)?.element;
  if (next !== highlighted) {
    highlighted?.classList.remove('spoken-current');
    next?.classList.add('spoken-current');
    highlighted = next;
  }
  updateChapters(time);
  updateFlight(time);
  if (playing) frame = requestAnimationFrame(animate);
}

function draw({state, index, total, step, muted}) {
  snapshot = { state, step, recording:demoAudioState(steps,index,state) };
  cancelAnimationFrame(frame);
  const idle = state === 'idle', ended = state === 'ended', senior = step.speaker === 'senior';
  const family = !idle && step.speaker === 'family';
  const presentation=demoPresentation(steps,index,state);
  const {delivered,receipt}=presentation;
  const complete = !idle && (step.view === 'ending' || ended);
  demo.dataset.complete = String(complete);
  finish.inert = !complete;
  finish.setAttribute('aria-hidden', String(!complete));
  sceneLayers.forEach(element => { element.inert = complete; });
  const key = `${index}:${idle}`;
  demo.dataset.state = state;
  demo.dataset.speaker = idle ? 'none' : step.speaker;
  demo.dataset.clip = idle ? '' : step.clip || 'hold';
  demo.dataset.family = idle ? 'idle' : family ? step.view : 'sent';
  demo.dataset.focus=presentation.focus;
  // The camera: wide before and after the film, then on whichever device the scene is about.
  demo.dataset.camera = idle || complete ? 'wide' : presentation.focus;
  demo.dataset.receipt=receipt;
  demo.dataset.recording=snapshot.recording;
  updateCharactersVisibility();
  const pose = !idle && (ended || ['sent', 'kept'].includes(step.view) || index === total - 1) ? 'smiling' : !idle && senior ? 'speaking' : 'listening';
  $('.jeanne-portrait').dataset.pose = pose;
  $('.jeanne-portrait').setAttribute('aria-label', `Jeanne, illustrée, ${pose === 'speaking' ? 'parle à sa mini-tablette' : pose === 'smiling' ? 'sourit à la fin de l’échange' : 'regarde sa mini-tablette'}`);
  $('#jeanne-status').textContent = idle ? 'Un moment en famille' : pose === 'smiling' ? 'Tout simplement, ensemble.' : senior ? 'Elle répond à la voix' : 'Elle écoute Near';
  screen.dataset.stage = idle ? 'home' : step.view;
  screen.dataset.speaker = idle ? 'none' : step.speaker;
  screen.classList.toggle('home', idle || family);
  if (key !== lastRender) {
    lastRender = key;
    if (idle) {
      lastScreen = '';
      showScreen(homeScreen({ received: false }));
    } else if (family) {
      // Messages stays empty until the photo has crossed over and landed on it.
      showScreen(homeScreen({ received: false }));
    } else if (step.view === 'home') {
      // The tablet wakes on the new message: no finger, the assistant reads it at once.
      showScreen(homeScreen({ received: true, waking: true }));
    } else {
      // What the assistant last said stays on the card while Jeanne answers; read from the script, so a jump to a chapter shows the right words.
      const said = steps.slice(0, index + 1).findLast(item => item.speaker === 'assistant');
      const done = ['sent','receipt','transcript','ending'].includes(step.view);
      // The senior's words belong to the site's caption, not to the product UI.
      showScreen(assistantScreen({ view: done ? 'sent' : step.view, words: said?.text || '', choices: step.choices ? tabletChoices[step.choices] : null,
        withPerson: !!said?.person, cue: said?.cue || 'sound', audio: snapshot.recording }));
    }
    prepareCaption(!idle && step.speaker==='assistant' ? step.text : '');
    $('#alice-composer').innerHTML = family && step.view === 'compose'
      ? `<div class="family-draft"><img src="assets/garden.svg" alt="La photo jointe au message"><p><span id="alice-draft-text"></span><span class="draft-caret" aria-hidden="true"></span></p></div><span class="send-symbol" aria-hidden="true">↑</span>`
      : `<span class="compose-plus" aria-hidden="true">+</span><span class="compose-placeholder">Message</span><span class="send-symbol ${family ? 'send-pulse' : ''}" aria-hidden="true">${family ? '✓' : icon('mic')}</span>`;
    $('#family-stage-note').textContent = family ? step.view === 'compose' ? 'Alice prépare son message…' : 'Et hop, envoyé à maman ♡' : delivered ? 'Alice reçoit sa réponse ♡' : '';
    $('#phone-response').innerHTML = delivered
      ? `<div class="received-message" aria-label="Message vocal de Jeanne"><div class="voice-note"><span class="voice-face"><i class="jeanne-profile" aria-hidden="true"></i><span>${icon('mic')}</span></span><span class="voice-play">${icon('play')}</span><div class="voice-body"><span class="voice-wave" aria-hidden="true">${voiceWave()}</span><span class="voice-duration">0:05</span></div></div>${receipt==='transcript'?`<div class="phone-transcript" aria-label="Transcription du message vocal"><p>${seniorLines.flowers}</p></div>`:''}<small class="message-time">09:41</small></div>`
      : '';
    const phaseKey=key;
    requestAnimationFrame(()=> {
      if(lastRender!==phaseKey)return;
      const chat=$('.phone-chat');
      // The newest incoming bubble stays in view, just like the family app.
      chat.scrollTo({top:delivered?chat.scrollHeight:0,behavior:'instant'});
    });
    // Keep her last bubble intact while the column glides out of view.
    if(idle||senior){
      $('#demo-caption').dataset.speaker=idle?'intro':'senior';
      $('#caption-person').textContent=idle?'':'Jeanne';
      $('#caption-words').textContent=idle?'':step.text;
      demo.dataset.jeanneText=!idle&&step.text.length>65?'long':'short';
    }
    $('#demo-announcement').textContent = idle ? '' : step.speaker === 'system' ? step.title : `${senior ? 'Jeanne' : family ? 'Alice' : 'Assistante'} : ${step.text}`;
  }
  const playing = state === 'playing';
  tablet.setAttribute('aria-disabled', String(playing));
  tablet.setAttribute('aria-label', playing ? 'Mini-tablette Near, démonstration en cours' : state === 'paused' ? 'Reprendre la démonstration sur la mini-tablette' : ended ? 'Revoir la démonstration sur la mini-tablette' : 'Lancer la démonstration sur la mini-tablette');
  const label = idle ? 'Voir et écouter la démo' : playing ? 'Mettre en pause' : ended ? 'Revoir la scène' : state === 'error' ? 'Réessayer la voix' : 'Reprendre la scène';
  $('#demo-play').innerHTML = `${playing ? '<span class="pause-icon" aria-hidden="true">Ⅱ</span>' : icon('play')}<span>${label}</span>`;
  $('#demo-play').setAttribute('aria-label', label);
  $('#demo-play').setAttribute('aria-pressed', String(playing));
  $('.sound-toggle').setAttribute('aria-pressed', String(!muted));
  $('.sound-toggle').setAttribute('aria-label', muted ? 'Activer le son' : 'Couper le son');
  $('.sound-toggle').innerHTML = `${icon('sound')}<span>${muted ? 'Son coupé' : 'Avec le son'}</span>`;
  $('#demo-playback-status').textContent = state === 'error' ? 'La voix n’a pas pu démarrer. Touchez Réessayer.' : state === 'paused' ? 'En pause' : ended ? 'La scène est terminée.' : '';
  // The frame reads the clock of the step that has just been drawn.
  if (playing) frame = requestAnimationFrame(animate);
  else animate();
}

const hero = $('#hero-screen');
// The homes show the visitor's time and date, like the tablet.
function drawHomes() {
  if (hero) hero.innerHTML = homeScreen({ received: true });
  if (snapshot?.state === 'idle') { lastRender = ''; lastScreen = ''; showScreen(homeScreen({ received: false })); }
}
setInterval(drawHomes, 30000);
const player = new FilmPlayer({ audio, onChange: draw, source: `assets/voice/${film.file}?v=${film.version}` });
export function pauseDemo() { player.pause(); }
function startFromTablet() {
  if (player.state !== 'playing') player.play();
}
tablet.addEventListener('click', startFromTablet);
tablet.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); startFromTablet(); }
});
$('.hero-tablet').addEventListener('click', event => {
  event.preventDefault();
  // Instant navigation keeps the screen visible before playback/offscreen checks.
  history.replaceState(null, '', `${location.pathname}${location.search}`);
  demo.scrollIntoView({behavior: 'instant', block: 'start'});
  startFromTablet();
});
$('#demo-play').addEventListener('click', () => {
  if (player.state === 'playing') player.pause();
  else {
    if (window.matchMedia('(max-width: 600px)').matches && (player.state === 'idle' || player.state === 'ended')) {
      demo.scrollIntoView({behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start'});
    }
    player.play();
  }
});
chapters.addEventListener('click', event => {
  const button = event.target.closest('[data-chapter]');
  if (button) player.seek(film.chapters[button.dataset.chapter].at);
});
$('.sound-toggle').addEventListener('click', () => player.setMuted(!audio.muted));
$('.reset-button').addEventListener('click', () => { player.load(steps, film.cues); });
$('#demo-replay').addEventListener('click', () => {
  player.load(steps, film.cues);
  player.play();
});
player.load(steps, film.cues);
drawHomes();
if ('IntersectionObserver' in window) {
  new IntersectionObserver(entries => {
    demoInView = entries[0].isIntersecting;
    updateCharactersVisibility();
  }).observe($('#demo'));
  // The track starts loading as the visitor approaches, so the film begins at once.
  const near = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    near.disconnect(); audio.preload = 'auto'; player.ensureSource();
  }, { rootMargin: '800px 0px' });
  near.observe($('#demo'));
} else { demoInView = true; updateCharactersVisibility(); }
