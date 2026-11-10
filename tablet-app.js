// The tablet screens of the demo, drawn like the application (apps/tablet, November 2026):
// home with three large buttons, then the assistant with its two large answers under each question.
const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const face = (size = '') => `<span class="na-face ${size}" aria-hidden="true"><img src="assets/alice-typing.png" alt="" decoding="async"></span>`;
/** The microphone of the app (ListeningCue): a green disc whose three rings open while Jeanne speaks. */
const mic = () => `<div class="na-mic" role="img" aria-label="Le micro de la tablette : Jeanne répond à la voix"><span class="na-mic-ring"></span><span class="na-mic-ring"></span><span class="na-mic-ring"></span><span class="na-mic-disc">${icon('mic')}</span></div>`;

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

const top = status => `<div class="na-top"><span class="na-status">${status}</span><span class="na-quit">${icon('close')}Quitter</span></div>`;
// As on the tablet: the other answer (yellow) on the left, the proposed action (green) on the right, the icon above the word.
const choicesBar = choices => choices ? `<div class="na-choices" role="group" aria-label="Les deux grands boutons de la tablette, qu’elle peut aussi toucher">${[choices[1], choices[0]].map(([label, symbol], index) =>
  `<span class="na-choice ${index ? 'na-first' : 'na-second'}">${icon(symbol)}${label}</span>`).join('')}</div>` : '';
const person = () => `<div class="na-person">${face()}<strong>Alice</strong></div>`;
const recording = state => `<div class="na-audio na-${state}" role="img" aria-label="${state === 'recording' ? 'Le message de Jeanne s’enregistre' : 'Le message vocal de Jeanne, prêt à envoyer'}"><span class="na-audio-dot">${state === 'recording' ? icon('mic') : icon('music')}</span><span class="na-audio-bars" aria-hidden="true">${[14, 26, 40, 24, 48, 32, 18].map((height, index) => `<i style="--h:${height};--bar:${index}"></i>`).join('')}</span><span class="na-audio-time">${state === 'recording' ? '0:00' : '0:05'}</span></div>`;

/**
 * One screen of the assistant. `words` is what the assistant says (highlighted word by word),
 * `choices` its two large answers. Jeanne answers aloud: the microphone sits under the words, above the answers.
 */
export function assistantScreen({ view, words = '', status = 'Votre assistante parle', choices, withPerson = false, audio = 'none' }) {
  if (view === 'photo') return `<div class="na na-photo">
    <img class="na-photo-image" src="assets/garden.svg" alt="La photo du jardin envoyée par Alice">
    <div class="na-photo-caption"><div class="na-person na-person-inline">${face('na-face-small')}<strong>Alice</strong></div><p class="caption">« Les fleurs du jardin sont enfin sorties ! Je t’embrasse. »</p></div>
    <div class="na-photo-bottom">${mic()}${choicesBar(choices)}</div>
  </div>`;
  if (view === 'loading') return `<div class="na na-assistant">${top('Un instant…')}<div class="na-card na-loading" role="status" aria-label="Near prépare la suite"><span class="loading-orb">${icon('heart')}</span><span class="loading-dots" aria-hidden="true"><i></i><i></i><i></i></span>${audio === 'ready' ? recording('ready') : ''}</div></div>`;
  const sent = view === 'sent';
  const mark = sent ? `<span class="na-done">${icon('check')}</span>` : withPerson ? person() : '';
  const recordingNow = audio === 'recording';
  return `<div class="na na-assistant">${top(recordingNow ? 'Enregistrement en cours' : status)}
    <div class="na-card">${mark}<p class="assistant-words">${words}</p>${audio !== 'none' ? recording(audio) : ''}</div>
    ${sent ? '' : mic()}${choicesBar(choices)}
  </div>`;
}
