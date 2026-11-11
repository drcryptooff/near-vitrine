// Both fictional participants have pre-recorded voices; one audio owner plays them in turn.
// The words are those of the tablet application (Near 1.1.3 and the new home, November 2026).
// The steps are mixed into one film (scripts/showcase-film.mjs); chapter names the moments one can jump to.
export const lines = {
  hello: 'Bonjour Jeanne. Vous avez un nouveau message d’Alice.',
  photo: 'Alice vous a envoyé une photo. Elle vous écrit : Les fleurs du jardin sont enfin sorties ! Je t’embrasse.',
  answer: 'Répondre à Alice ?',
  speak: 'Message pour Alice. Vous pouvez parler.',
  check: 'Envoyer à Alice ?',
  done: 'Message envoyé à Alice.'
};
export const assistantFile = clip => `${clip}-flow`;
const assistant = (clip, view, title, extra = {}) => ({ speaker: 'assistant', text: lines[clip], clip, file:assistantFile(clip), view, title, cue:'sound', gap:800, ...extra });
export const seniorLines = {
  photo: 'Quelle jolie photo !',
  reply: 'Oui, j’aimerais lui répondre.',
  flowers: 'Quelles jolies fleurs ! Tu as vraiment la main verte. Je t’embrasse aussi, ma chérie.',
  send: 'Oui, envoie-le à Alice.'
};
/** The large answers the tablet shows under each question (a photo has only « Suivante », Near 1.1.52): the proposed action (green, on the right), the other (yellow, on the left). Jeanne never touches them in the demo: she answers aloud. */
export const tabletChoices = {
  photo: [['Suivante', 'arrow']],
  answer: [['Répondre', 'mic'], ['Non', 'close']],
  record: [['Fini', 'check'], ['Recommencer', 'reset']],
  check: [['Envoyer', 'send'], ['Non', 'close']]
};
export const JEANNE_VOICE='shimmer';
// Jeanne comes in from the side and is seen before she speaks (`lead`, in ms).
const senior = (id, view, title, extra = {}) => ({ speaker: 'senior', text: seniorLines[id], clip: `jeanne-${JEANNE_VOICE}-flow-${id}`, view, title, lead: 900, gap: 1000, ...extra });
export const scenarios = {
  reply: {
    label: 'Un message d’Alice', description: 'Alice partage une photo. Jeanne la regarde et lui répond.',
    steps: [
      // Media starts on the visitor’s gesture, unlocking the same audio owner
      // before the recorded conversation (including on mobile browsers).
      { speaker: 'family', clip: 'family-compose-keys-apple', view: 'compose', title: 'Alice prépare un petit mot pour sa maman', text: 'Alice joint une photo et écrit son message.', chapter:'Alice écrit', gap:600 },
      { speaker: 'family', clip: 'family-send-pop', view: 'send', title: 'Sa photo arrive chez Jeanne', text: 'Alice envoie sa photo à Jeanne.', gap:900 },
      // The message arrives: the tablet wakes and the assistant reads it at once. Jeanne touches nothing.
      { speaker: 'system', clip: 'tablet-wake', view: 'home', title: 'Le message arrive chez Jeanne', text: '', chapter:'La tablette lit', gap:1000 },
      assistant('hello', 'greeting', 'L’assistante annonce le message', { person:true, cue:'hand', gap:900 }),
      // Time to look at the photo; then Jeanne comes in and says what she thinks of it.
      assistant('photo', 'photo', 'La photo d’Alice', { choices:'photo', gap:1500 }),
      senior('photo', 'photo', 'Jeanne découvre la photo', { choices:'photo', gap:1100 }),
      assistant('answer', 'question', 'Une question, et Jeanne répond à la voix', { choices:'answer', person:true, chapter:'Jeanne répond', gap:1300 }),
      senior('reply', 'question', 'Jeanne choisit de répondre', { choices:'answer', gap:1000 }),
      assistant('speak', 'record', 'L’assistante lui laisse la parole', { person:true, gap:700 }),
      senior('flowers', 'record', 'Jeanne enregistre son message', { choices:'record', gap:1300 }),
      assistant('check', 'question', 'L’envoi attend son accord', { choices:'check', person:true, chapter:'Son accord', gap:1300 }),
      senior('send', 'question', 'Jeanne donne son accord à la voix', { choices:'check', gap:1000 }),
      assistant('done', 'sent', 'Le message est parti', { cue:'send', gap:1200 }),
      {speaker:'system',clip:'family-notification',view:'receipt',title:'Alice reçoit le vocal de Jeanne',text:'Un message vocal de Jeanne arrive sur le téléphone d’Alice.',delivered:true,chapter:'Alice reçoit',gap:0},
      {speaker:'system',view:'transcript',title:'Les mots de Jeanne, à lire aussi',text:seniorLines.flowers,duration:650,delivered:true},
      {speaker:'system',view:'transcript',title:'Alice découvre le message de Jeanne',text:seniorLines.flowers,duration:900,delivered:true,alice:'reading'},
      {speaker:'system',clip:'alice-happy-chime-v2',view:'transcript',title:'Des nouvelles qui font sourire Alice',text:seniorLines.flowers,gap:1500,delivered:true,alice:'happy'},
      {speaker:'system',view:'ending',title:'La démo est terminée',text:'Alice a reçu le message vocal et sa transcription.',duration:0,delivered:true,alice:'happy'}
    ]
  }
};

export function demoPresentation(steps,index,state) {
  const idle=state==='idle',step=steps[index];
  const delivered=!idle&&steps.slice(0,index+1).some(item=>item.delivered);
  return {delivered,focus:delivered||(!idle&&step.speaker==='family')?'family':'tablet',receipt:delivered?(step.view==='transcript'||step.view==='ending'?'transcript':'audio'):'none'};
}

export function demoAudioState(steps,index,state){
  if(state==='idle')return 'none';
  const recorded=steps.findIndex(step=>step.speaker==='senior'&&step.view==='record');
  const sent=steps.findIndex(step=>step.view==='sent');
  return index===recorded?'recording':recorded>=0&&index>recorded&&index<sent?'ready':'none';
}

export const ALICE_MESSAGE='Les fleurs du jardin sont enfin sorties ! Je t’embrasse 🌷';
const typingCharacters=Array.from(ALICE_MESSAGE);
const typingWeights=typingCharacters.map(char=>/[!.?]/u.test(char)?3:char===' '?.5:1);
const typingWeight=typingWeights.reduce((sum,value)=>sum+value,0);
const typingStart=.25,typingDuration=3.6;
// One schedule drives both the visible letters and the offline keyboard track.
let typingTotal=0;
export const aliceTypingSchedule=typingWeights.map((weight,index)=>{
  typingTotal+=weight;
  return {at:typingStart+typingDuration*typingTotal/typingWeight,char:typingCharacters[index]};
});
export function aliceTypingAt(seconds) {
  const position=Math.max(0,Math.min(1,(seconds-typingStart)/typingDuration))*typingWeight;
  let total=0,count=0;
  for(const weight of typingWeights){total+=weight;if(total>position+.00001)break;count++;}
  return {text:typingCharacters.slice(0,count).join(''),active:seconds>=typingStart&&count<typingCharacters.length};
}
