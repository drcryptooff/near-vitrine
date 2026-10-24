// Both fictional participants have pre-recorded voices; one audio owner plays them in turn.
export const lines = {
  welcome: 'Bonjour Jeanne. Vous avez un message d’Alice. Voulez-vous le voir ?',
  photo: 'Alice vous a envoyé une photo. Elle vous écrit : Les fleurs du jardin sont enfin sorties ! Je t’embrasse.',
  offer: 'Voilà pour Alice. Voulez-vous lui répondre ?',
  record: 'Je vous écoute. Prenez votre temps, et arrêtez-vous quand vous avez fini.',
  confirm: 'Voulez-vous envoyer votre message à Alice ?',
  sent: 'Votre message a été envoyé à Alice. Passez une bonne journée Jeanne !'
};
export const assistantFile = clip => ({welcome:'welcome-view-flow',sent:'sent-good-day-flow'}[clip]||`${clip}-flow`);
const assistant = (clip, view, title, extra = {}) => ({ speaker: 'assistant', text: lines[clip], clip, file:assistantFile(clip), view, title, gap:120, ...extra });
export const seniorLines = {
  see: 'Oui, j’aimerais le voir.',
  reply: 'Oui, j’aimerais lui répondre.',
  flowers: 'Quelles jolies fleurs ! Tu as vraiment la main verte. Je t’embrasse aussi, ma chérie.',
  send: 'Oui, envoie-le à Alice.'
};
export const JEANNE_VOICE='shimmer';
const senior = (id, view, title, extra = {}) => ({ speaker: 'senior', text: seniorLines[id], clip: `jeanne-${JEANNE_VOICE}-flow-${id}`, view, title, gap: 100, ...extra });
const transition = (clip, title) => ({speaker:'system',clip,view:'loading',title,text:'',gap:100});
export const scenarios = {
  reply: {
    label: 'Un message d’Alice', description: 'Alice partage une photo. Jeanne lui répond à la voix.',
    steps: [
      // Media starts on the visitor’s gesture, unlocking the same audio owner
      // before the recorded conversation (including on mobile browsers).
      { speaker: 'family', clip: 'family-compose-keys-apple', view: 'compose', title: 'Alice prépare un petit mot pour sa maman', text: 'Alice joint une photo et écrit son message.',gap:100 },
      { speaker: 'family', clip: 'family-send-pop', view: 'send', title: 'Sa photo arrive chez Jeanne', text: 'Alice envoie sa photo à Jeanne.', gap:120 },
      transition('tablet-wake','La mini-tablette s’éveille'),
      assistant('welcome', 'greeting', 'Les nouvelles arrivent', { gap:320 }),
      senior('see', 'greeting', 'Jeanne souhaite voir le message', { gap:280 }),
      assistant('photo', 'photo', 'La photo d’Alice'),
      assistant('offer', 'question', 'Une invitation à répondre', { gap:320 }),
      senior('reply', 'question', 'Jeanne répond à la voix', { gap:280 }),
      assistant('record', 'record', 'L’assistante lui laisse la parole', { gap:320 }),
      senior('flowers', 'record', 'Jeanne enregistre son message'),
      transition('tablet-thinking','Near prépare la confirmation'),
      assistant('confirm', 'question', 'La confirmation, à la voix', { gap:320 }),
      senior('send', 'question', 'Jeanne donne son accord', { gap:280 }),
      assistant('sent', 'sent', 'La mini-tablette termine son message', { gap:80 }),
      {speaker:'system',clip:'family-notification',view:'receipt',title:'Alice reçoit le vocal de Jeanne',text:'Un message vocal de Jeanne arrive sur le téléphone d’Alice.',delivered:true,gap:0},
      {speaker:'system',view:'transcript',title:'Les mots de Jeanne, à lire aussi',text:seniorLines.flowers,duration:650,delivered:true},
      {speaker:'system',view:'transcript',title:'Alice découvre le message de Jeanne',text:seniorLines.flowers,duration:900,delivered:true,alice:'reading'},
      {speaker:'system',view:'transcript',title:'Des nouvelles qui font sourire Alice',text:seniorLines.flowers,duration:2300,delivered:true,alice:'happy'}
    ]
  }
};

export function demoPresentation(steps,index,state) {
  const idle=state==='idle',step=steps[index];
  const delivered=!idle&&steps.slice(0,index+1).some(item=>item.delivered);
  return {delivered,focus:delivered||(!idle&&step.speaker==='family')?'family':'tablet',receipt:delivered?(step.view==='transcript'?'transcript':'audio'):'none'};
}

export function demoAudioState(steps,index,state){
  if(state==='idle')return 'none';
  const recorded=steps.findIndex(step=>step.speaker==='senior'&&step.view==='record');
  const sent=steps.findIndex(step=>step.clip==='sent');
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
