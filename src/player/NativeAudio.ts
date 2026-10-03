import type { Asset } from "../types/story";

// Finite PCM files avoid the live MediaStream output path on iOS.
export function pcmWave(
  buffer: Pick<
    AudioBuffer,
    "numberOfChannels" | "length" | "sampleRate" | "getChannelData"
  >,
) {
  const channels = buffer.numberOfChannels;
  const bytes = new ArrayBuffer(44 + buffer.length * channels * 2);
  const view = new DataView(bytes);
  const label = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++)
      view.setUint8(offset + i, text.charCodeAt(i));
  };
  label(0, "RIFF");
  view.setUint32(4, bytes.byteLength - 8, true);
  label(8, "WAVE");
  label(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  label(36, "data");
  view.setUint32(40, bytes.byteLength - 44, true);
  const samples = Array.from({ length: channels }, (_, channel) =>
    buffer.getChannelData(channel),
  );
  for (let frame = 0; frame < buffer.length; frame++)
    for (let channel = 0; channel < channels; channel++) {
      const sample = Math.max(-1, Math.min(1, samples[channel][frame]));
      view.setInt16(
        44 + (frame * channels + channel) * 2,
        sample * (sample < 0 ? 32768 : 32767),
        true,
      );
    }
  return new Blob([bytes], { type: "audio/wav" });
}

interface Slot {
  audio: HTMLAudioElement;
  key?: string;
  request: number;
  timer?: ReturnType<typeof setTimeout>;
}

export class NativeAudio {
  private slots = new Map<string, Slot>();
  private files = new WeakMap<
    Blob,
    Promise<{ url: string; duration: number }>
  >();
  private urls = new Set<string>();
  private volume = 0.7;
  private primer = URL.createObjectURL(
    pcmWave({
      numberOfChannels: 1,
      length: 800,
      sampleRate: 8000,
      getChannelData: () => new Float32Array(800),
    }),
  );
  constructor(private decode: (asset: Asset) => Promise<AudioBuffer>) {}

  unlock() {
    for (const kind of ["voice", "music", "ambient", "video"]) {
      if (this.slots.has(kind)) continue;
      const audio = new Audio(this.primer);
      audio.setAttribute("playsinline", "");
      audio.preload = "auto";
      const slot = { audio, request: 0 };
      this.slots.set(kind, slot);
      // Authorize each reusable native element inside the initial tap.
      void audio
        .play()
        .then(() => {
          if (audio.src === this.primer) this.pause(slot);
        })
        .catch(() => {});
    }
  }
  private async file(asset: Asset) {
    let file = this.files.get(asset.blob);
    if (!file) {
      file = this.decode(asset).then((buffer) => {
        const url = URL.createObjectURL(pcmWave(buffer));
        this.urls.add(url);
        return { url, duration: buffer.duration };
      });
      this.files.set(asset.blob, file);
    }
    return file;
  }
  private pause(slot: Slot) {
    clearTimeout(slot.timer);
    slot.timer = undefined;
    slot.audio.muted = true;
    slot.audio.pause();
  }
  private deadline(slot: Slot, seconds: number) {
    clearTimeout(slot.timer);
    slot.timer = setTimeout(
      () => this.pause(slot),
      Math.max(0, seconds) * 1000 + 150,
    );
  }
  setVolume(volume: number) {
    this.volume = volume;
    for (const [kind, slot] of this.slots)
      slot.audio.volume =
        kind === "voice" || kind === "video" ? volume : volume * 0.45;
  }
  async play(kind: string, asset?: Asset, sceneId = "") {
    const slot = this.slots.get(kind);
    if (!slot) return;
    const key = asset
      ? `${kind === "voice" ? sceneId : ""}:${asset.id}`
      : undefined;
    if (key && slot.key === key) return;
    const request = ++slot.request;
    this.pause(slot);
    slot.key = key;
    if (!asset) return;
    const file = await this.file(asset);
    if (request !== slot.request) return;
    slot.audio.src = file.url;
    slot.audio.loop = kind !== "voice";
    slot.audio.volume = kind === "voice" ? this.volume : this.volume * 0.45;
    slot.audio.muted = false;
    slot.audio.onended = () => this.pause(slot);
    await slot.audio.play();
    if (request !== slot.request) return;
    if (!slot.audio.loop)
      this.deadline(slot, file.duration - slot.audio.currentTime);
  }
  bindVideo(
    video: HTMLVideoElement,
    asset: Asset,
    volume: number,
    onError: () => void,
  ) {
    const slot = this.slots.get("video");
    if (!slot) {
      onError();
      return () => {};
    }
    const request = ++slot.request;
    this.pause(slot);
    let duration = 0,
      ready = false,
      cancelled = false,
      revision = 0;
    const stop = () => {
      revision++;
      this.pause(slot);
    };
    const sync = async () => {
      stop();
      if (
        !ready ||
        cancelled ||
        video.paused ||
        video.ended ||
        video.readyState < 2 ||
        video.currentTime >= duration
      )
        return;
      const current = revision;
      slot.audio.currentTime = video.currentTime;
      slot.audio.playbackRate = video.playbackRate;
      slot.audio.muted = false;
      try {
        await slot.audio.play();
        if (cancelled || current !== revision || request !== slot.request)
          return;
        slot.audio.currentTime = video.currentTime;
        this.deadline(
          slot,
          (duration - video.currentTime) / video.playbackRate,
        );
      } catch {
        if (!cancelled && current === revision) onError();
      }
    };
    const syncEvents = ["playing", "seeked", "ratechange"];
    const stopEvents = ["pause", "waiting", "seeking", "ended"];
    const syncListener = () => {
      void sync();
    };
    syncEvents.forEach((event) => video.addEventListener(event, syncListener));
    stopEvents.forEach((event) => video.addEventListener(event, stop));
    void this.file(asset)
      .then((file) => {
        if (cancelled || request !== slot.request) return;
        duration = file.duration;
        slot.audio.src = file.url;
        slot.audio.loop = false;
        slot.audio.volume = volume;
        slot.audio.onended = () => this.pause(slot);
        ready = true;
        void sync();
      })
      .catch(() => {
        if (!cancelled) onError();
      });
    return () => {
      cancelled = true;
      stop();
      if (slot.request === request) slot.request++;
      syncEvents.forEach((event) =>
        video.removeEventListener(event, syncListener),
      );
      stopEvents.forEach((event) => video.removeEventListener(event, stop));
    };
  }
  stop() {
    for (const slot of this.slots.values()) {
      slot.request++;
      slot.key = undefined;
      this.pause(slot);
    }
  }
  dispose() {
    this.stop();
    for (const slot of this.slots.values()) {
      slot.audio.removeAttribute("src");
      slot.audio.load();
    }
    this.slots.clear();
    for (const url of this.urls) URL.revokeObjectURL(url);
    URL.revokeObjectURL(this.primer);
  }
}
