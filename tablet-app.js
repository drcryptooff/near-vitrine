// The tablet screens of the demo, drawn like the application (apps/tablet, November 2026):
// home with three large buttons, then the assistant with its two large answers under each question.
const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const face = (size = '') => `<span class="na-face ${size}" aria-hidden="true"><img src="assets/alice-typing.png" alt="" decoding="async"></span>`;

/** Today as the tablet shows it: « 9:41 » and « Mardi 4 novembre ». */
export function tabletNow(now = new Date()) {
  return { time: `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`, date: `${DAYS[now.getDay()]} ${now.getDate() === 1 ? '1er' : now.getDate()} ${MONTHS[now.getMonth()]}` };
}

/** The home: time, date and weather in the dark band, then Messages, Musique and Journal. */
export function homeScreen({ received = false, waking = false, now = new Date() } = {}) {
  const today = tabletNow(now);
  const picture = received
    ? `<span class="na-picture">${face('na-face-big')}<span class="na-badge">1</span></span>`
    : `<span class="na-picture na-picture-icon">${icon('people')}</span>`;
  return `<div class="na na-home" role="img" aria-label="Accueil de la tablette : ${today.time}, ${today.date}, 8 degrés. Trois grands boutons : Messages${received ? ', un nouveau message d’Alice' : ''}, Musique et Journal.">
    <div class="na-band"><div class="na-clock"><b>${today.time}</b><span>${today.date}</span></div><span class="na-sky">${icon('cloud')}<b>8°</b></span></div>
    <div class="na-tiles">
      <div class="na-tile na-messages ${waking ? 'na-waking' : ''}">${picture}<span class="na-word">${icon('chat')}Messages</span></div>
      <div class="na-row">
        <div class="na-tile na-music">${icon('music')}<span class="na-word">Musique</span></div>
        <div class="na-tile na-journal">${icon('paper')}<span class="na-word">Journal</span></div>
      </div>
    </div>
  </div>`;
}

// The assistant screen of the tablet (AssistantScreen, November 2026): a small status line, the white card
// with the portrait and the words, the round cue under it, the two answers, and Quitter across the bottom.
const statusLine = text => `<p class="na-status">${text}</p>`;
const quit = `<div class="na-quit"><span class="na-quit-disc">${icon('close')}</span>Quitter</div>`;
// The other answer (yellow) on the left, the proposed action (green) on the right, the icon above the word.
// Their place stays reserved at the bottom, even when there is no question.
const choicesBar = choices => `<div class="na-choices"${choices ? ' role="group" aria-label="Les deux grands boutons de la tablette, qu’elle peut aussi toucher"' : ' aria-hidden="true"'}>${choices ? [choices[1], choices[0]].map(([label, symbol], index) =>
  `<span class="na-choice ${index ? 'na-first' : 'na-second'}">${icon(symbol)}${label}</span>`).join('') : ''}</div>`;
const person = (inline = false) => `<div class="na-person${inline ? ' na-person-inline' : ''}">${face(inline ? 'na-face-small' : '')}<strong>Alice</strong></div>`;
const recording = state => `<div class="na-audio na-${state}" role="img" aria-label="${state === 'recording' ? 'Le message de Jeanne s’enregistre' : 'Le message vocal de Jeanne, prêt à envoyer'}"><span class="na-audio-dot">${state === 'recording' ? icon('mic') : icon('music')}</span><span class="na-audio-bars" aria-hidden="true">${[14, 26, 40, 24, 48, 32, 18, 30, 12].map((height, index) => `<i style="--h:${height};--bar:${index}"></i>`).join('')}</span>${state === 'recording' ? '<span class="na-audio-time">0:00</span>' : ''}</div>`;
/**
 * Under the card, a light round cue says what the assistant is doing while she speaks.
 * At a question, once she has finished, it becomes the microphone (ListeningCue): her turn to answer aloud.
 */
const cueBlock = (cue, listens) => `<div class="na-cue${listens ? ' na-listens' : ''}"><span class="na-cue-icon">${icon(cue)}${cue === 'send' ? `<i class="na-cue-done">${icon('check')}</i>` : ''}</span>${listens ? `<div class="na-mic" role="img" aria-label="Le micro de la tablette : Jeanne répond à la voix"><span class="na-mic-ring"></span><span class="na-mic-ring"></span><span class="na-mic-ring"></span><span class="na-mic-disc">${icon('mic')}</span></div>` : ''}</div>`;

/**
 * One screen of the assistant. `words` is what the assistant says (highlighted word by word),
 * `choices` its two large answers. Jeanne answers aloud; the answers stay there for those who prefer to touch.
 */
export function assistantScreen({ view, words = '', status = 'Votre assistante parle', choices, withPerson = false, audio = 'none', cue = 'sound' }) {
  const recordingNow = audio === 'recording';
  const sent = view === 'sent';
  let main;
  if (view === 'photo') main = `<div class="na-card na-card-photo">${person(true)}<p class="assistant-words">${words}</p></div>
    <img class="na-photo-image" src="assets/garden.svg" alt="La photo du jardin envoyée par Alice">
    ${cueBlock('sound', !!choices)}`;
  else if (recordingNow) main = `<div class="na-card">${person()}<p class="assistant-words na-listening-words">Je vous écoute.</p>${recording('recording')}</div>`;
  else main = `<div class="na-card">${withPerson && !sent ? person() : ''}<p class="assistant-words">${words}</p>${audio === 'ready' ? recording('ready') : ''}</div>
    ${cueBlock(sent ? 'send' : cue, !!choices)}`;
  return `<div class="na na-assistant${view === 'photo' ? ' na-with-photo' : ''}">${statusLine(recordingNow ? 'Enregistrement en cours' : status)}
    <div class="na-main">${main}</div>
    ${choicesBar(choices)}
    ${quit}
  </div>`;
}
