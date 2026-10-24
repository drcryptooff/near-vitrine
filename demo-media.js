// Prepare upcoming files without creating or playing another audio element.
export class DemoMedia {
  constructor({fetchFile=(...args)=>fetch(...args),createUrl=blob=>URL.createObjectURL(blob),revokeUrl=url=>URL.revokeObjectURL(url)}={}) {
    this.fetchFile=fetchFile; this.createUrl=createUrl; this.revokeUrl=revokeUrl;
    this.clips=new Map(); this.disposed=false;
  }
  url(clip) { return this.clips.get(clip)?.url || `assets/voice/${clip}.mp3`; }
  preload(clips) {
    for(const clip of clips) {
      if(this.clips.has(clip)||this.disposed) continue;
      const entry={}; this.clips.set(clip,entry);
      entry.ready=Promise.resolve().then(()=>this.fetchFile(`assets/voice/${clip}.mp3`,{cache:'force-cache'}))
        .then(response=>{if(!response.ok)throw new Error('Media unavailable');return response.blob();})
        .then(blob=>{if(!this.disposed)entry.url=this.createUrl(blob);})
        .catch(()=>{this.clips.delete(clip);}); // Direct media URL remains a fallback.
    }
  }
  dispose() {
    this.disposed=true;
    for(const entry of this.clips.values()) if(entry.url)this.revokeUrl(entry.url);
    this.clips.clear();
  }
}
