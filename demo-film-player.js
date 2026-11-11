// One recorded film: a single mixed track is the only clock.
// The step on screen, the word being said and every animation are read from its position.

/**
 * Where each step sits on the film, in seconds. `at` is when the step appears, `audioAt`/`audioEnd`
 * frame its recording (Jeanne is seen `lead` ms before she speaks), `end` is where the next step starts.
 */
export function filmCues(steps, clipDuration) {
  let time = 0;
  return steps.map(step => {
    const at = time;
    if (!step.clip) {
      time += (step.duration ?? 0) / 1000;
      return { at, audioAt: at, audioEnd: at, end: time };
    }
    const audioAt = at + (step.speaker === 'senior' ? (step.lead ?? 100) / 1000 : 0);
    const audioEnd = audioAt + clipDuration(step.file || step.clip);
    time = audioEnd + (step.gap ?? 650) / 1000;
    return { at, audioAt, audioEnd, end: time };
  }).map(cue => Object.fromEntries(Object.entries(cue).map(([key, value]) => [key, Math.round(value * 1000) / 1000])));
}

/** The chapters of the film: the steps that carry a `chapter` title, with the time they start at. */
export function filmChapters(steps, cues) {
  return steps.flatMap((step, index) => step.chapter ? [{ title: step.chapter, index, at: cues[index].at }] : [])
    .map((chapter, index, all) => ({ ...chapter, end: all[index + 1]?.at ?? cues.at(-1).end }));
}

export class FilmPlayer {
  constructor({ audio, onChange, source = 'assets/voice/film.mp3', setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = id => clearTimeout(id) }) {
    this.audio = audio; this.onChange = onChange; this.source = source;
    this.setTimer = setTimer; this.clearTimer = clearTimer;
    this.steps = []; this.cues = []; this.index = 0; this.state = 'idle'; this.sourced = false;
    audio.addEventListener('ended', () => {
      if (this.state !== 'playing') return;
      this.clearTimer(this.watchdog); this.index = this.steps.length - 1; this.state = 'ended'; this.emit();
    });
    audio.addEventListener('error', () => this.fail());
    // The track also moves while the page is in the background, where no frame is drawn.
    audio.addEventListener('timeupdate', () => { if (this.state === 'playing') { this.armWatchdog(); this.sync(); } });
  }
  emit() { this.onChange({ state: this.state, index: this.index, total: this.steps.length, step: this.steps[this.index], muted: this.audio.muted }); }
  load(steps, cues) {
    this.clearTimer(this.watchdog); this.audio.pause();
    if (this.sourced) this.audio.currentTime = 0;
    this.steps = steps; this.cues = cues; this.index = 0; this.state = 'idle'; this.emit();
  }
  /** Position on the film, in seconds. */
  time() { return this.state === 'idle' ? 0 : this.state === 'ended' ? this.cues.at(-1).end : this.audio.currentTime || 0; }
  indexAt(time) {
    let index = 0;
    while (index + 1 < this.cues.length && this.cues[index + 1].at <= time) index++;
    return index;
  }
  /** The recording of the current step: its own clock (negative before it starts), length, and whether it is sounding or over. */
  clip() {
    const cue = this.cues[this.index], time = this.time();
    return { time: time - cue.audioAt, duration: cue.audioEnd - cue.audioAt, sounding: time >= cue.audioAt && time < cue.audioEnd, ended: time >= cue.audioEnd };
  }
  /** Show the step the track has reached. Called on every drawn frame, and by the track itself. */
  sync() {
    if (this.state !== 'playing' && this.state !== 'paused') return;
    const index = this.indexAt(this.time());
    if (index !== this.index) { this.index = index; this.emit(); }
  }
  ensureSource() { if (!this.sourced) { this.audio.src = this.source; this.sourced = true; } }
  play() {
    if (this.state === 'playing') return;
    this.ensureSource();
    if (this.state === 'idle' || this.state === 'ended') { this.audio.currentTime = 0; this.index = 0; }
    this.state = 'playing'; this.emit(); this.armWatchdog();
    try {
      Promise.resolve(this.audio.play()).catch(error => { if (error?.name !== 'AbortError') this.fail(); });
    } catch { this.fail(); }
  }
  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused'; this.clearTimer(this.watchdog); this.audio.pause(); this.emit();
  }
  /** Jump to a moment of the film and play from there (a chapter). */
  seek(time) {
    this.ensureSource();
    this.audio.currentTime = Math.max(0, Math.min(time, this.cues.at(-1).end));
    this.index = this.indexAt(this.audio.currentTime);
    if (this.state === 'playing') { this.emit(); return; }
    this.state = 'paused'; this.play();
  }
  setMuted(value) { this.audio.muted = value; this.emit(); }
  armWatchdog() {
    this.clearTimer(this.watchdog);
    this.watchdog = this.setTimer(() => this.fail(), 18000);
  }
  fail() {
    if (this.state !== 'playing') return;
    this.clearTimer(this.watchdog); this.audio.pause(); this.state = 'error'; this.emit();
  }
}
