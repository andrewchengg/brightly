import { useCallback, useRef } from "react";

interface UseSoundOptions {
  volume?: number;
  playbackRate?: number;
}

export const useSound = (soundUrl: string, options: UseSoundOptions = {}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { volume = 1, playbackRate = 1 } = options;

  const play = useCallback(() => {
    try {
      // Create a new audio instance each time to allow overlapping sounds
      const audio = new Audio(soundUrl);
      audio.volume = volume;
      audio.playbackRate = playbackRate;
      audio.play().catch((error) => {
        console.warn("Sound playback failed:", error);
      });
    } catch (error) {
      console.warn("Sound initialization failed:", error);
    }
  }, [soundUrl, volume, playbackRate]);

  const playWithCallback = useCallback(
    (callback?: () => void) => {
      try {
        const audio = new Audio(soundUrl);
        audio.volume = volume;
        audio.playbackRate = playbackRate;

        if (callback) {
          audio.addEventListener("ended", callback, { once: true });
        }

        audio.play().catch((error) => {
          console.warn("Sound playback failed:", error);
          if (callback) callback(); // Still execute callback even if sound fails
        });
      } catch (error) {
        console.warn("Sound initialization failed:", error);
        if (callback) callback(); // Still execute callback even if sound fails
      }
    },
    [soundUrl, volume, playbackRate]
  );

  return { play, playWithCallback };
};
