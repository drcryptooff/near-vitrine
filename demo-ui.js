import { DemoPlayer } from './demo-player.js';
import { scenarios, seniorLines, tabletChoices, demoPresentation, demoAudioState, aliceTypingAt } from './demo-script.js?v=20261104-two-buttons';
import { homeScreen, assistantScreen } from './tablet-app.js?v=20261104-two-buttons';
import { DemoMedia } from './demo-media.js';
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
const scenario = 'reply';
let lastRender = '';
let lastAssistant = '';
let lastPerson = false;
let snapshot, caption, highlighted, frame;
const tablet = $('.demo-tablet');
let demoInView = false;

function updateCharactersVisibility() {
  const visible = demoInView && snapshot?.step.speaker === 'senior' && !['idle', 'ended'].includes(snapshot.state);
  $('#demo-player').dataset.jeanne = visible ? 'visible' : 'hidden';
  $('.demo-senior-column').setAttribute('aria-hidden', String(!visible));
  const receiving=!!snapshot?.step.alice&&snapshot?.state!=='idle';
  const aliceVisible=demoInView&&(receiving||snapshot?.step.speaker==='family')&&snapshot?.state!=='idle';
  $('#demo-player').dataset.alice=aliceVisible?'visible':'hidden';
  $('#demo-player').dataset.aliceMood=receiving?snapshot.step.alice:'typing';
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
  const textNode = text => document.createTextNode(text.replace(/ (?=[!?:;])/gu, '\u00a0'));
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

function animateCaption() {
  const voicing = snapshot.state === 'playing' && !audio.paused && !audio.ended;
  // A tap of Jeanne's finger is not her voice: her mouth stays still.
  const nextVoicing = voicing ? snapshot.step.touch ? 'touch' : snapshot.step.speaker : 'none';
  if ($('#demo-player').dataset.voicing !== nextVoicing) $('#demo-player').dataset.voicing = nextVoicing;
  const composing=snapshot.step.speaker==='family'&&snapshot.step.view==='compose'&&snapshot.state!=='idle';
  const typed=composing?aliceTypingAt(audio.currentTime):{text:'',active:false};
  const draft=$('#alice-draft-text');
  if(draft&&draft.textContent!==typed.text)draft.textContent=typed.text;
  const typing=composing&&typed.text&&!typed.active?'done':composing&&typed.active&&voicing?'active':'none';
  if($('#demo-player').dataset.typing!==typing)$('#demo-player').dataset.typing=typing;
  const timer=screen.querySelector('.tablet-audio.recording .tablet-audio-time');
  if(timer){const seconds=Math.floor(audio.currentTime||0);timer.textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;}
  const speaking = snapshot.step.speaker === 'assistant' && ['playing', 'paused'].includes(snapshot.state) && !audio.ended;
  const index = speaking && caption ? captionWordAt(caption.timings, audio.currentTime, audio.duration, caption.recorded) : -1;
  const next = index < 0 ? null : caption?.words.find(word => word.index === index)?.element;
  if (next !== highlighted) {
    highlighted?.classList.remove('spoken-current');
    next?.classList.add('spoken-current');
    highlighted = next;
  }
  if (snapshot.state === 'playing') frame = requestAnimationFrame(animateCaption);
}

function draw({state, index, total, step, muted}) {
  snapshot = { state, step, recording:demoAudioState(scenarios[scenario].steps,index,state) };
  cancelAnimationFrame(frame);
  const idle = state === 'idle', ended = state === 'ended', senior = step.speaker === 'senior';
  const family = !idle && step.speaker === 'family';
  const presentation=demoPresentation(scenarios[scenario].steps,index,state);
  const {delivered,receipt}=presentation;
  const complete = !idle && (step.view === 'ending' || ended);
  demo.dataset.complete = String(complete);
  finish.inert = !complete;
  finish.setAttribute('aria-hidden', String(!complete));
  sceneLayers.forEach(element => { element.inert = complete; });
  const key = `${scenario}:${index}:${idle}`;
  $('#demo-player').dataset.state = state;
  $('#demo-player').dataset.speaker = idle ? 'none' : step.speaker;
  $('#demo-player').dataset.clip = idle ? '' : step.clip || 'hold';
  $('#demo-player').dataset.family = idle ? 'idle' : family ? step.view : 'sent';
  $('#demo-player').dataset.focus=presentation.focus;
  $('#demo-player').dataset.receipt=receipt;
  $('#demo-player').dataset.recording=snapshot.recording;
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
      lastAssistant = ''; lastPerson = false;
      screen.innerHTML = homeScreen({ received: false });
    } else if (family) {
      screen.innerHTML = homeScreen({ received: step.view === 'send' });
    } else if (step.view === 'home') {
      // Jeanne keeps her finger on Messages while the ring fills.
      screen.innerHTML = homeScreen({ received: true, holding: true });
    } else if (step.speaker === 'system' && step.view === 'loading') {
      screen.innerHTML = assistantScreen({ view: 'loading', audio: snapshot.recording });
    } else {
      if (step.speaker === 'assistant') { lastAssistant = step.text; lastPerson = !!step.person; }
      const done = ['sent','receipt','transcript','ending'].includes(step.view);
      // The senior's words belong to the site's caption, not to the product UI.
      screen.innerHTML = assistantScreen({ view: done ? 'sent' : step.view, words: lastAssistant, choices: step.choices ? tabletChoices[step.choices] : null,
        touched: step.touch, withPerson: lastPerson, audio: snapshot.recording, status: senior && !step.touch ? 'Je vous écoute' : 'Votre assistante parle' });
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
      $('#demo-caption').dataset.touch=String(!idle&&!!step.touch);
      $('#caption-person').textContent=idle?'':'Jeanne';
      $('#caption-words').textContent=idle?'':step.text;
      $('#demo-player').dataset.jeanneText=!idle&&step.text.length>65?'long':'short';
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
  $('#demo-progress').innerHTML = `<span class="film-track"><i style="width:${idle ? 0 : ended ? 100 : (index + 1) / total * 100}%"></i></span>`;
  // Wait until the player's current clip is assigned before reading its clock.
  if (playing) frame = requestAnimationFrame(animateCaption);
  else animateCaption();
}

const hero = $('#hero-screen');
// The homes show the visitor's time and date, like the tablet.
function drawHomes() {
  if (hero) hero.innerHTML = homeScreen({ received: true });
  if (snapshot?.state === 'idle') { lastRender = ''; screen.innerHTML = homeScreen({ received: false }); }
}
setInterval(drawHomes, 30000);
const media = new DemoMedia();
const player = new DemoPlayer({ audio, onChange: draw,resolveClip:clip=>media.url(clip),preload:clips=>media.preload(clips) });
window.addEventListener('pagehide',event=>{if(!event.persisted)media.dispose();});
if('ResizeObserver' in window) new ResizeObserver(()=> {
  if($('#demo-player').dataset.receipt!=='none') $('.phone-chat').scrollTop=$('.phone-chat').scrollHeight;
}).observe($('.phone-chat'));
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
  $('#demo-player').scrollIntoView({behavior: 'instant', block: 'start'});
  startFromTablet();
});
$('#demo-play').addEventListener('click', () => {
  if (player.state === 'playing') player.pause();
  else {
    if (window.matchMedia('(max-width: 600px)').matches && (player.state === 'idle' || player.state === 'ended')) {
      $('#demo-player').scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start'});
    }
    player.play();
  }
});
$('.sound-toggle').addEventListener('click', () => player.setMuted(!audio.muted));
$('.reset-button').addEventListener('click', () => { player.load(scenarios[scenario].steps); });
$('#demo-replay').addEventListener('click', () => {
  player.load(scenarios[scenario].steps);
  player.play();
});
player.load(scenarios[scenario].steps);
drawHomes();
if ('IntersectionObserver' in window) {
  new IntersectionObserver(entries => {
    demoInView = entries[0].isIntersecting;
    updateCharactersVisibility();
  }).observe($('#demo'));
} else { demoInView = true; updateCharactersVisibility(); }
