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
  private deadlines = new Map<
    AudioBufferSourceNode,
    ReturnType<typeof setTimeout>
  >();
  private completedVoices = new Set<string>();
  private playbackSceneId = "";
  private silenceOutput() {
    if (this.liveSources.size || !this.mediaPlayer) return;
    this.mediaPlayer.muted = true;
    this.mediaPlayer.pause();
  }
  private activate(
    source: AudioBufferSourceNode,
    duration: number,
    ended?: () => void,
  ) {
    this.liveSources.add(source);
    const finish = () => {
      if (!this.liveSources.has(source)) return;
      clearTimeout(this.deadlines.get(source));
      this.deadlines.delete(source);
      this.liveSources.delete(source);
      ended?.();
      this.silenceOutput();
    };
    source.onended = finish;
    if (Number.isFinite(duration))
      this.deadlines.set(
        source,
        setTimeout(
          () => {
            source.stop();
            finish();
          },
          duration * 1000 + 150,
        ),
      );
    if (this.mediaPlayer) this.mediaPlayer.muted = false;
    if (this.mediaPlayer?.paused) void this.mediaPlayer.play().catch(() => {});
  }
  private deactivate(source: AudioBufferSourceNode) {
    clearTimeout(this.deadlines.get(source));
    this.deadlines.delete(source);
    this.liveSources.delete(source);
    this.silenceOutput();
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
      this.deactivate(track.source);
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
  async play(kind: string, asset?: Asset, sceneId = "") {
    if (this.playbackSceneId !== sceneId) {
      this.playbackSceneId = sceneId;
      this.completedVoices.clear();
    }
    const voiceKey = `${sceneId}:${asset?.id}`;
    if (kind === "voice" && asset && this.completedVoices.has(voiceKey)) return;
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
    const endsAt = context.currentTime + buffer.duration;
    this.activate(source, source.loop ? Infinity : buffer.duration, () => {
      if (
        kind === "voice" &&
        this.playbackSceneId === sceneId &&
        this.requests.get(kind) === request &&
        context.currentTime >= endsAt - 0.01
      )
        this.completedVoices.add(voiceKey);
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
      this.activate(
        source,
        (buffer.duration - video.currentTime) / video.playbackRate,
      );
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
    this.completedVoices.clear();
    if (this.mediaPlayer) this.mediaPlayer.muted = true;
    this.mediaPlayer?.pause();
    for (const [kind, request] of this.requests)
      this.requests.set(kind, request + 1);
    for (const track of this.tracks.values()) this.retire(track);
    this.tracks.clear();
  }
  dispose() {
    for (const timer of this.deadlines.values()) clearTimeout(timer);
    this.deadlines.clear();
    this.liveSources.clear();
    this.completedVoices.clear();
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
