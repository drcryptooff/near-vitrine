import { DemoPlayer } from './demo-player.js';
import { scenarios, seniorLines, demoPresentation, demoAudioState, aliceTypingAt } from './demo-script.js?v=20261024-finale-2';
import { DemoMedia } from './demo-media.js';
import { captionMapping, captionWordAt } from './demo-captions.js';
import { recordedTimings } from './demo-word-timings-flow.js';

const $ = selector => document.querySelector(selector);
const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const tabletBrand='<span class="tablet-brand" aria-label="Near"><img class="near-logo" src="assets/near-logo.svg" alt="" aria-hidden="true"><span>Near.</span></span>';
const waveHeights=[7,12,5,16,21,12,8,17,24,14,7,11,20,15,9,23,18,7,13,20,10,15,8,5];
const voiceWave=()=>waveHeights.map(height=>`<i style="height:${height}px"></i>`).join('');
const tabletAudio=state=>`<div class="tablet-audio ${state}" role="img" aria-label="${state==='recording'?'Votre message s’enregistre':'Votre message vocal, prêt à envoyer'}"><div class="tablet-audio-body"><span class="tablet-audio-icon" aria-hidden="true">${state==='recording'?icon('mic'):'♫'}</span><span class="tablet-audio-wave" aria-hidden="true">${[14,26,40,24,48,32,18].map((height,index)=>`<i style="height:${height*.55}px;--bar:${index}"></i>`).join('')}</span><span class="tablet-audio-time">${state==='recording'?'0:00':'0:05'}</span></div><small>${state==='recording'?'Votre message s’enregistre':'Votre message vocal'}</small></div>`;
const screen = $('#tablet-screen');
const audio = $('#demo-audio');
const demo = $('#demo-player');
const finish = $('#demo-finish');
const sceneLayers = [...demo.children].filter(element => element !== finish);
const scenario = 'reply';
let lastRender = '';
let lastAssistant = '';
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
  const nextVoicing = voicing ? snapshot.step.speaker : 'none';
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
      lastAssistant = '';
      screen.innerHTML = `<div class="demo-home"><span class="message-pill">${icon('heart')} Un moment en famille</span><span class="touch-halo">${icon('hand')}</span><strong>Touchez pour<br>démarrer</strong></div>`;
    } else if (family) {
      screen.innerHTML = `<div class="demo-home family-arrival"><span class="message-pill">${icon('mail')} ${step.view === 'send' ? '1 nouveau message' : 'Votre famille, tout près.'}</span><span class="touch-halo">${icon(step.view === 'send' ? 'mail' : 'heart')}</span><strong>${step.view === 'send' ? 'Des nouvelles<br>d’Alice ♡' : 'Bonjour<br>Jeanne'}</strong></div>`;
    } else if (step.speaker === 'system' && step.view === 'loading') {
      screen.innerHTML = `<div class="demo-topline">${tabletBrand}<span>Jeanne</span></div><div class="tablet-loading" role="status" aria-label="Near prépare la suite"><span class="loading-orb">${icon('heart')}</span><span class="loading-dots" aria-hidden="true"><i></i><i></i><i></i></span>${snapshot.recording==='ready'?tabletAudio('ready'):''}</div>`;
    } else {
      if (step.speaker === 'assistant') lastAssistant = step.text;
      const photo = step.view === 'photo';
      const central = photo
        ? `<div class="demo-person"><span class="avatar peach">A</span><strong>Alice</strong><small>${scenario === 'photo' ? 'La semaine dernière' : 'Aujourd’hui'}</small></div><img class="demo-photo" src="assets/garden.svg" alt="Illustration de la photo du jardin d’Alice"><p class="caption">« Les fleurs du jardin sont enfin sorties ! Je t’embrasse. »</p>`
        : snapshot.recording!=='none'
        ? `<p class="assistant-words">${snapshot.recording==='recording'?'Je vous écoute.':lastAssistant}</p>${tabletAudio(snapshot.recording)}`
        : `<span class="demo-avatar ${['sent','receipt','transcript','ending'].includes(step.view) ? 'complete' : ''}">${icon(['sent','receipt','transcript','ending'].includes(step.view) ? 'check' : 'sound')}</span><p class="assistant-words">${lastAssistant}</p>`;
      // The senior's words belong to the site's caption, not to the product UI.
      screen.innerHTML = `<div class="demo-topline">${tabletBrand}<span>Jeanne</span></div><div class="demo-scene-content ${photo ? 'with-photo' : ''}">${central}<div class="listening-place">${senior&&snapshot.recording!=='recording' ? `<span class="listening-mic">${icon('mic')}</span>` : ''}</div></div>`;
    }
    prepareCaption(!idle && step.speaker==='assistant' ? step.text : '');
    $('#alice-composer').innerHTML = family && step.view === 'compose'
      ? `<div class="family-draft"><img src="assets/garden.svg" alt="La photo jointe au message"><p><span id="alice-draft-text"></span><span class="draft-caret" aria-hidden="true"></span></p></div><span class="send-symbol" aria-hidden="true">↑</span>`
      : `<span class="compose-plus" aria-hidden="true">+</span><span class="compose-placeholder">Message</span><span class="send-symbol ${family ? 'send-pulse' : ''}" aria-hidden="true">${family ? '✓' : icon('mic')}</span>`;
    $('#family-stage-note').textContent = family ? step.view === 'compose' ? 'Alice prépare son message…' : 'Et hop, envoyé à maman ♡' : delivered ? 'Alice reçoit sa réponse ♡' : '';
    $('#phone-response').innerHTML = delivered
      ? `<div class="received-message" aria-label="Message vocal de Jeanne"><div class="voice-note"><span class="voice-face">J<span>${icon('mic')}</span></span><span class="voice-play">${icon('play')}</span><div class="voice-body"><span class="voice-wave" aria-hidden="true">${voiceWave()}</span><span class="voice-duration">0:05</span></div></div>${receipt==='transcript'?`<div class="phone-transcript" aria-label="Transcription du message vocal"><p>${seniorLines.flowers}</p></div>`:''}<small class="message-time">09:41</small></div>`
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
if ('IntersectionObserver' in window) {
  new IntersectionObserver(entries => {
    demoInView = entries[0].isIntersecting;
    updateCharactersVisibility();
  }).observe($('#demo'));
} else { demoInView = true; updateCharactersVisibility(); }
