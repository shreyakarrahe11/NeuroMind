export interface AttentionManifest {
  mediaUrl: string;
  targetWindows: { startMs: number; endMs: number }[];
}

const publicAsset = (fileName: string) => `${import.meta.env.BASE_URL}${fileName}`;

export const VISUAL_ATTENTION: AttentionManifest = {
  mediaUrl: publicAsset('visual.mp4'),
  targetWindows: [
    { startMs: 2000, endMs: 4000 },
    { startMs: 10000, endMs: 12000 }
  ]
};

export const AUDIO_ATTENTION: AttentionManifest = {
  mediaUrl: publicAsset('audio.wav'),
  targetWindows: [
    { startMs: 3000, endMs: 5000 },
    { startMs: 12000, endMs: 14000 }
  ]
};

export const MUSIC_ATTENTION: AttentionManifest = {
  mediaUrl: publicAsset('music.wav'),
  targetWindows: [
    { startMs: 5000, endMs: 7000 },
    { startMs: 15000, endMs: 17000 }
  ]
};

export const VIDEO_ATTENTION: AttentionManifest = {
  mediaUrl: publicAsset('video.mp4'),
  targetWindows: [
    { startMs: 4000, endMs: 6000 },
    { startMs: 18000, endMs: 20000 }
  ]
};
