import type { Asset } from "../types/story";
interface Track {
  id: string;
  source: AudioBufferSourceNode;
  gain: GainNode;
}
class SoundEngine {
  private context?: AudioContext;
  private tracks = new Map<string, Track>();
  private requests = new Map<string, number>();
  private buffers = new WeakMap<Blob, Promise<AudioBuffer>>();
  private volume = 0.7;
  private retiring = new Set<Track>();
  private mediaOutput?: MediaStreamAudioDestinationNode;
  private mediaPlayer?: HTMLAudioElement;
  private liveSources = new Set<AudioBufferSourceNode>();
  private activate(source: AudioBufferSourceNode, ended?: () => void) {
    this.liveSources.add(source);
    source.onended = () => {
      this.liveSources.delete(source);
      ended?.();
      if (!this.liveSources.size) this.mediaPlayer?.pause();
    };
    if (this.mediaPlayer?.paused)
      void this.mediaPlayer.play().catch(() => {});
  }
  private deactivate(source: AudioBufferSourceNode) {
    this.liveSources.delete(source);
    if (!this.liveSources.size) this.mediaPlayer?.pause();
  }
  unlock() {
    const session = (
      navigator as Navigator & { audioSession?: { type: string } }
    ).audioSession;
    try {
      if (session) {
        session.type = "playback";
      }
    } catch {
      /* Some browsers expose a read-only session. */
    }
    this.context ??= new AudioContext();
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (ios && !this.mediaPlayer) {
      this.mediaOutput = this.context.createMediaStreamDestination();
      this.mediaPlayer = new Audio();
      this.mediaPlayer.srcObject = this.mediaOutput.stream;
      this.mediaPlayer.setAttribute("playsinline", "");
    }
    void this.context.resume().catch(() => {});
    if (this.mediaPlayer) void this.mediaPlayer.play().catch(() => {});
    // Start an actual source synchronously inside the player's tap, before decoding media.
    const primer = this.context.createBufferSource();
    primer.buffer = this.context.createBuffer(1, 1, this.context.sampleRate);
    primer.connect(this.mediaOutput ?? this.context.destination);
    primer.onended = () => primer.disconnect();
    primer.start();
  }
  setVolume(volume: number) {
    this.volume = volume;
    for (const [kind, track] of this.tracks)
      this.fade(track.gain, kind === "voice" ? volume : volume * 0.45);
  }
  private fade(gain: GainNode, value: number) {
    if (!this.context) return;
    const time = this.context.currentTime;
    gain.gain.cancelScheduledValues(time);
    gain.gain.setValueAtTime(gain.gain.value, time);
    gain.gain.linearRampToValueAtTime(value, time + 0.35);
  }
  private retire(track: Track) {
    this.fade(track.gain, 0);
    this.retiring.add(track);
    setTimeout(() => {
      track.source.stop();
      track.source.disconnect();
      track.gain.disconnect();
      this.retiring.delete(track);
    }, 450);
  }
  private async decode(asset: Asset) {
    const context = this.context;
    if (!context) throw Error("audio-not-unlocked");
    let buffer = this.buffers.get(asset.blob);
    if (!buffer) {
      buffer = asset.blob
        .arrayBuffer()
        .then((bytes) => context.decodeAudioData(bytes));
      this.buffers.set(asset.blob, buffer);
    }
    return buffer;
  }
  async play(kind: string, asset?: Asset) {
    const old = this.tracks.get(kind);
    if (asset && old?.id === asset.id) return;
    const request = (this.requests.get(kind) ?? 0) + 1;
    this.requests.set(kind, request);
    if (old) {
      this.tracks.delete(kind);
      this.retire(old);
    }
    if (!asset || !this.context) return;
    const context = this.context;
    const buffer = await this.decode(asset);
    if (this.requests.get(kind) !== request) return;
    if (context.state !== "running") await context.resume();
    if (this.requests.get(kind) !== request) return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = kind !== "voice";
    const gain = context.createGain();
    gain.gain.value = 0;
    source.connect(gain).connect(this.mediaOutput ?? context.destination);
    const track = { id: asset.id, source, gain };
    this.tracks.set(kind, track);
    this.activate(source, () => {
      if (this.tracks.get(kind) === track) this.tracks.delete(kind);
      source.disconnect();
      gain.disconnect();
    });
    source.start();
    this.fade(gain, kind === "voice" ? this.volume : this.volume * 0.45);
  }
  bindVideo(
    video: HTMLVideoElement,
    asset: Asset,
    volume: number,
    onError: () => void,
  ) {
    const context = this.context;
    if (!context) {
      onError();
      return () => {};
    }
    let cancelled = false;
    let buffer: AudioBuffer | undefined;
    let source: AudioBufferSourceNode | undefined;
    const gain = context.createGain();
    gain.gain.value = volume;
    gain.connect(this.mediaOutput ?? context.destination);
    const stop = () => {
      if (!source) return;
      source.stop();
      source.disconnect();
      this.deactivate(source);
      source = undefined;
    };
    const sync = () => {
      stop();
      if (
        cancelled ||
        !buffer ||
        video.paused ||
        video.ended ||
        video.readyState < 2 ||
        video.currentTime >= buffer.duration
      )
        return;
      source = context.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = video.playbackRate;
      source.connect(gain);
      this.activate(source);
      source.start(0, video.currentTime);
    };
    const syncEvents = ["playing", "seeked", "ratechange"];
    const stopEvents = ["pause", "waiting", "seeking", "ended"];
    syncEvents.forEach((event) => video.addEventListener(event, sync));
    stopEvents.forEach((event) => video.addEventListener(event, stop));
    void this.decode(asset)
      .then(async (decoded) => {
        buffer = decoded;
        if (!cancelled && context.state !== "running") await context.resume();
        if (!cancelled) sync();
      })
      .catch(() => {
        if (!cancelled) onError();
      });
    return () => {
      cancelled = true;
      stop();
      gain.disconnect();
      syncEvents.forEach((event) => video.removeEventListener(event, sync));
      stopEvents.forEach((event) => video.removeEventListener(event, stop));
    };
  }
  stop() {
    this.mediaPlayer?.pause();
    for (const [kind, request] of this.requests)
      this.requests.set(kind, request + 1);
    for (const track of this.tracks.values()) this.retire(track);
    this.tracks.clear();
  }
  dispose() {
    this.mediaPlayer?.pause();
    for (const track of [...this.tracks.values(), ...this.retiring]) {
      track.source.stop();
      track.source.disconnect();
      track.gain.disconnect();
    }
    this.tracks.clear();
    this.retiring.clear();
    void this.context?.close();
  }
}
export const sound = new SoundEngine();
