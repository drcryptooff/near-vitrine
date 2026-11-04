// Both fictional participants have pre-recorded voices; one audio owner plays them in turn.
// The words are those of the tablet application (Near 1.1.3 and the new home, November 2026).
export const lines = {
  hello: 'Bonjour Jeanne. Vous avez un nouveau message d’Alice.',
  photo: 'Alice vous a envoyé une photo. Elle vous écrit : Les fleurs du jardin sont enfin sorties ! Je t’embrasse.',
  answer: 'Répondre à Alice ?',
  speak: 'Message pour Alice. Vous pouvez parler.',
  check: 'Envoyer à Alice ?',
  done: 'Message envoyé à Alice.'
};
export const assistantFile = clip => `${clip}-flow`;
const assistant = (clip, view, title, extra = {}) => ({ speaker: 'assistant', text: lines[clip], clip, file:assistantFile(clip), view, title, gap:120, ...extra });
export const seniorLines = {
  flowers: 'Quelles jolies fleurs ! Tu as vraiment la main verte. Je t’embrasse aussi, ma chérie.',
  send: 'Oui, envoie-le à Alice.'
};
/** The two large answers the tablet shows under each question: the proposed action first (green), the other below (yellow). */
export const tabletChoices = {
  photo: [['Suivante', 'arrow'], ['Relire', 'reset']],
  answer: [['Répondre', 'mic'], ['Non', 'close']],
  record: [['Fini', 'check'], ['Recommencer', 'reset']],
  check: [['Envoyer', 'send'], ['Non', 'close']]
};
export const JEANNE_VOICE='shimmer';
const senior = (id, view, title, extra = {}) => ({ speaker: 'senior', text: seniorLines[id], clip: `jeanne-${JEANNE_VOICE}-flow-${id}`, view, title, gap: 100, ...extra });
/** Jeanne answers with her finger: a short tap on one of the two large buttons. */
const touch = (label, view, choices, title, extra = {}) => ({ speaker: 'senior', touch: label, text: `Elle touche « ${label} »`, clip: 'tablet-tap', view, choices, title, gap: 260, ...extra });
const transition = (clip, title) => ({speaker:'system',clip,view:'loading',title,text:'',gap:100});
export const scenarios = {
  reply: {
    label: 'Un message d’Alice', description: 'Alice partage une photo. Jeanne la regarde et lui répond.',
    steps: [
      // Media starts on the visitor’s gesture, unlocking the same audio owner
      // before the recorded conversation (including on mobile browsers).
      { speaker: 'family', clip: 'family-compose-keys-apple', view: 'compose', title: 'Alice prépare un petit mot pour sa maman', text: 'Alice joint une photo et écrit son message.',gap:100 },
      { speaker: 'family', clip: 'family-send-pop', view: 'send', title: 'Sa photo arrive chez Jeanne', text: 'Alice envoie sa photo à Jeanne.', gap:220 },
      { speaker: 'senior', touch: 'Messages', hold: true, text: 'Elle garde le doigt sur « Messages »', clip: 'tablet-wake', view: 'home', title: 'Jeanne ouvre ses messages', gap: 260 },
      assistant('hello', 'greeting', 'L’assistante annonce le message', { gap:200, person:true }),
      assistant('photo', 'photo', 'La photo d’Alice', { choices:'photo' }),
      touch('Suivante', 'photo', 'photo', 'Jeanne a fini de regarder'),
      assistant('answer', 'question', 'Une question, deux grands boutons', { choices:'answer', person:true, gap:320 }),
      touch('Répondre', 'question', 'answer', 'Jeanne choisit de répondre'),
      assistant('speak', 'record', 'L’assistante lui laisse la parole', { person:true, gap:200 }),
      senior('flowers', 'record', 'Jeanne enregistre son message', { choices:'record' }),
      touch('Fini', 'record', 'record', 'Jeanne a terminé'),
      transition('tablet-thinking','Near prépare la confirmation'),
      assistant('check', 'question', 'L’envoi attend son accord', { choices:'check', person:true, gap:320 }),
      senior('send', 'question', 'Jeanne donne son accord à la voix', { choices:'check', gap:280 }),
      assistant('done', 'sent', 'Le message est parti', { gap:80 }),
      {speaker:'system',clip:'family-notification',view:'receipt',title:'Alice reçoit le vocal de Jeanne',text:'Un message vocal de Jeanne arrive sur le téléphone d’Alice.',delivered:true,gap:0},
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
  const recorded=steps.findIndex(step=>step.speaker==='senior'&&step.view==='record'&&!step.touch);
  const sent=steps.findIndex(step=>step.view==='sent');
  // Touching « Fini » still shows the recording that it ends.
  const ending=steps[index]?.touch&&steps[index].view==='record';
  return index===recorded||ending?'recording':recorded>=0&&index>recorded&&index<sent?'ready':'none';
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
