// Recorded word timestamps take priority. Weighting remains a fallback for new clips.
export const normalizeCaption = text => text.replace(/\s+/gu, ' ').trim();
const letters = text => text.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');

export function captionTimings(text) {
  const words = [...normalizeCaption(text).matchAll(/[\p{L}\p{N}]+(?:[’'‐‑-][\p{L}\p{N}]+)*/gu)];
  let elapsed = 0;
  return words.map((match, index) => {
    const start = match.index, end = start + match[0].length;
    const punctuation = normalizeCaption(text).slice(end, words[index + 1]?.index);
    const duration = Math.min(620, 140 + match[0].length * 42)
      + (/[.!?…]/u.test(punctuation) ? 280 : /[,;:]/u.test(punctuation) ? 140 : 0);
    const at = elapsed;
    elapsed += duration;
    return { start, end, at, until: elapsed };
  });
}

export function captionWordAt(timings, currentTime, duration, recorded = false) {
  if (!timings.length || !Number.isFinite(duration) || duration <= 0 || currentTime < 0 || currentTime >= duration) return -1;
  const position = recorded ? currentTime * 1000 : currentTime / duration * timings.at(-1).until;
  return timings.findIndex(word => position >= word.at && position < word.until);
}

// Photo captions omit the spoken introduction; never highlight them during it.
export function captionMapping(spokenText, displayedText, recording) {
  const spoken = normalizeCaption(spokenText), displayed = normalizeCaption(displayedText);
  const wrapped=displayed.startsWith('«')&&displayed.endsWith('»');
  const inner=wrapped?displayed.slice(1,-1):displayed;
  const match=inner.trim();
  const prefix=wrapped?1+inner.length-inner.trimStart().length:0;
  const found=spoken.indexOf(match);
  const offset=found<0?null:found-prefix;
  let timings = captionTimings(spoken);
  const recorded = recording?.text === spokenText && recording?.words?.length === timings.length;
  if (recorded) timings = timings.map((word,index) => ({...word, at:recording.words[index].at, until:recording.words[index].until}));
  return { text: displayed, timings, recorded, words: captionTimings(displayed).map(word => ({
    ...word,
    spokenIndex: offset === null ? -1 : timings.findIndex(t => t.start === offset + word.start && t.end === offset + word.end),
  })) };
}

// Split/joined apostrophes and hyphens from transcription still map to the written word.
export function alignRecordedWords(text, recognized) {
  let stream = ''; const chars = [];
  for (const word of recognized) {
    const clean = letters(word.word);
    for (let i=0;i<clean.length;i++) {
      stream += clean[i];
      chars.push({at:word.start+(word.end-word.start)*i/clean.length, until:word.start+(word.end-word.start)*(i+1)/clean.length});
    }
  }
  const written = captionTimings(text).map(word => text.slice(word.start,word.end));
  const script = written.map(letters).join('');
  if (!chars.length) throw new Error('Recording has no word timestamps.');
  // Align spellings as a character sequence: e.g. j’t’embrasse / je t’embrasse.
  const costs = Array.from({length:script.length+1},()=>new Uint16Array(stream.length+1));
  for (let i=0;i<=script.length;i++) costs[i][0]=i;
  for (let j=0;j<=stream.length;j++) costs[0][j]=j;
  for (let i=1;i<=script.length;i++) for (let j=1;j<=stream.length;j++) {
    costs[i][j]=Math.min(costs[i-1][j]+1,costs[i][j-1]+1,costs[i-1][j-1]+Number(script[i-1]!==stream[j-1]));
  }
  if (costs[script.length][stream.length] > script.length*.18) throw new Error('Recording transcript differs too far from the script.');
  const map = []; let i=script.length,j=stream.length;
  while (i || j) {
    if (i && j && costs[i][j]===costs[i-1][j-1]+Number(script[i-1]!==stream[j-1])) { map[i-1]=j-1; i--; j--; }
    else if (i && costs[i][j]===costs[i-1][j]+1) { map[i-1]=null; i--; }
    else j--;
  }
  let cursor = 0;
  const words = written.map(token => {
    const clean = letters(token), indexes = map.slice(cursor,cursor+clean.length).filter(index=>index!==null && index!==undefined);
    cursor += clean.length;
    if (!indexes.length) throw new Error(`Unmatched word in recording: ${token}`);
    return {word:token,at:Math.round(chars[indexes[0]].at*1000),until:Math.round(chars[indexes.at(-1)].until*1000)};
  });
  return words.map((word,index) => ({...word, until:Math.min(word.until+70,words[index+1]?.at ?? Infinity)}));
}
