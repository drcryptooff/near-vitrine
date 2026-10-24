// A single audio owner for both voices, entrance delays and optional silent turns.
export class DemoPlayer {
  constructor({ audio, onChange, resolveClip = clip => `assets/voice/${clip}.mp3`, preload = () => {}, now = () => performance.now(), setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = id => clearTimeout(id) }) {
    this.audio = audio; this.onChange = onChange; this.now = now;
    this.setTimer = setTimer; this.clearTimer = clearTimer;
    this.resolveClip=resolveClip; this.preload=preload;
    this.steps = []; this.index = 0; this.state = 'idle'; this.revision = 0;
    this.remaining = 0; this.delayActive = false; this.cleanup = () => {};
  }
  emit() { this.onChange({ state: this.state, index: this.index, total: this.steps.length, step: this.steps[this.index], muted: this.audio.muted }); }
  clearWait() { this.clearTimer(this.timer); this.clearTimer(this.watchdog); }
  cancel() {
    this.revision++; this.cleanup(); this.cleanup = () => {}; this.clearWait();
    this.audio.pause(); this.delayActive = false; this.remaining = 0;
  }
  load(steps) { this.cancel(); this.steps = steps; this.index = 0; this.state = 'idle'; this.emit(); }
  play() {
    if (this.state === 'playing') return;
    if (this.state === 'paused') {
      this.state = 'playing'; this.emit();
      if (this.delayActive) this.wait(this.remaining, this.waitAction);
      else this.playAudio(this.revision);
      return;
    }
    if (this.state === 'error') { this.begin(); return; }
    this.index = 0; this.begin();
  }
  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    if (this.delayActive) this.remaining = Math.max(0, this.remaining - (this.now() - this.waitStarted));
    this.clearWait(); this.audio.pause(); this.emit();
  }
  setMuted(value) { this.audio.muted = value; this.emit(); }
  wait(duration, action = 'advance') {
    this.delayActive = true; this.remaining = duration; this.waitStarted = this.now();
    this.waitAction = action;
    const revision = this.revision;
    this.timer = this.setTimer(() => {
      if (this.revision !== revision || this.state !== 'playing') return;
      this.delayActive = false;
      if (action === 'audio') { this.playAudio(revision); return; }
      this.index++;
      if (this.index >= this.steps.length) {
        this.index = this.steps.length - 1; this.state = 'ended'; this.emit();
      } else this.begin();
    }, duration);
  }
  armWatchdog(revision) {
    this.clearTimer(this.watchdog);
    this.watchdog = this.setTimer(() => this.fail(revision), 18000);
  }
  fail(revision) {
    if (this.revision !== revision || this.state !== 'playing') return;
    this.clearWait(); this.cleanup(); this.audio.pause(); this.state = 'error'; this.emit();
  }
  playAudio(revision) {
    this.armWatchdog(revision);
    try {
      Promise.resolve(this.audio.play()).catch(error => {
        if (error?.name !== 'AbortError') this.fail(revision);
      });
    } catch { this.fail(revision); }
  }
  begin() {
    this.cancel(); this.state = 'playing';
    const step = this.steps[this.index], revision = this.revision;
    this.preload(this.steps.slice(this.index+1,this.index+4).map(item=>item.file||item.clip).filter(Boolean));
    this.emit();
    if (!step.clip) { this.wait(step.duration); return; }
    const ended = () => {
      if (this.revision !== revision || this.state !== 'playing' || !this.audio.ended) return;
      this.clearTimer(this.watchdog); this.cleanup(); this.wait(step.gap ?? 650);
    };
    const error = () => this.fail(revision);
    const activity = () => { if (this.revision === revision && this.state === 'playing') this.armWatchdog(revision); };
    this.audio.addEventListener('ended', ended);
    this.audio.addEventListener('error', error);
    this.audio.addEventListener('timeupdate', activity);
    this.cleanup = () => {
      this.audio.removeEventListener('ended', ended); this.audio.removeEventListener('error', error); this.audio.removeEventListener('timeupdate', activity);
    };
    this.audio.src = this.resolveClip(step.file||step.clip);
    if (step.speaker === 'senior') this.wait(100, 'audio');
    else this.playAudio(revision);
  }
}
