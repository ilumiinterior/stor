import type { Asset } from "../types/story";
interface Track {
  id: string;
  audio: HTMLAudioElement;
  gain: GainNode;
  url: string;
}
class SoundEngine {
  private context?: AudioContext;
  private tracks = new Map<string, Track>();
  private volume = 0.7;
  private retiring = new Set<Track>();
  unlock() {
    this.context ??= new AudioContext();
    void this.context.resume().catch(() => {});
  }
  setVolume(volume: number) {
    this.volume = volume;
    for (const [kind, track] of this.tracks)
      this.fade(track.gain, kind === "voice" ? volume : volume * 0.45);
  }
  private fade(gain: GainNode, value: number) {
    const time = this.context!.currentTime;
    gain.gain.cancelScheduledValues(time);
    gain.gain.setValueAtTime(gain.gain.value, time);
    gain.gain.linearRampToValueAtTime(value, time + 0.35);
  }
  private retire(track: Track) {
    this.fade(track.gain, 0);
    this.retiring.add(track);
    setTimeout(() => {
      track.audio.pause();
      track.audio.src = "";
      track.gain.disconnect();
      URL.revokeObjectURL(track.url);
      this.retiring.delete(track);
    }, 450);
  }
  async play(kind: string, asset?: Asset) {
    const old = this.tracks.get(kind);
    if (old?.id === asset?.id) return;
    if (old) {
      this.retire(old);
      this.tracks.delete(kind);
    }
    if (!asset || !this.context) return;
    const url = URL.createObjectURL(asset.blob);
    const audio = new Audio(url);
    audio.loop = kind !== "voice";
    const gain = this.context.createGain();
    gain.gain.value = 0;
    this.context
      .createMediaElementSource(audio)
      .connect(gain)
      .connect(this.context.destination);
    const track = { id: asset.id, audio, gain, url };
    this.tracks.set(kind, track);
    try {
      await audio.play();
      this.fade(gain, kind === "voice" ? this.volume : this.volume * 0.45);
    } catch {
      this.tracks.delete(kind);
      audio.pause();
      gain.disconnect();
      URL.revokeObjectURL(url);
      throw Error("audio-blocked");
    }
  }
  stop() {
    for (const track of this.tracks.values()) this.retire(track);
    this.tracks.clear();
  }
  dispose() {
    for (const track of [...this.tracks.values(), ...this.retiring]) {
      track.audio.pause();
      URL.revokeObjectURL(track.url);
    }
    this.tracks.clear();
    this.retiring.clear();
    void this.context?.close();
  }
}
export const sound = new SoundEngine();
