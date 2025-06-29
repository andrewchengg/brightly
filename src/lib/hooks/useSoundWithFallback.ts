import { useCallback } from "react";
import { soundEffects } from "@/lib/soundEffects";

interface SoundConfig {
  useAudioFiles?: boolean;
  successSoundUrl?: string;
  levelUpSoundUrl?: string;
  volume?: number;
}

export const useSoundWithFallback = (config: SoundConfig = {}) => {
  const {
    useAudioFiles = false,
    successSoundUrl = "/sounds/success.mp3",
    levelUpSoundUrl = "/sounds/levelup.mp3",
    volume = 0.3,
  } = config;

  const playSuccessSound = useCallback(async () => {
    if (useAudioFiles) {
      try {
        const audio = new Audio(successSoundUrl);
        audio.volume = volume;
        await audio.play();
      } catch (error) {
        console.warn(
          "Audio file playback failed, falling back to generated sound:",
          error
        );
        soundEffects.playSuccessSound(volume);
      }
    } else {
      soundEffects.playSuccessSound(volume);
    }
  }, [useAudioFiles, successSoundUrl, volume]);

  const playLevelUpSound = useCallback(async () => {
    if (useAudioFiles) {
      try {
        const audio = new Audio(levelUpSoundUrl);
        audio.volume = volume;
        await audio.play();
      } catch (error) {
        console.warn(
          "Audio file playback failed, falling back to generated sound:",
          error
        );
        soundEffects.playLevelUpSound(volume);
      }
    } else {
      soundEffects.playLevelUpSound(volume);
    }
  }, [useAudioFiles, levelUpSoundUrl, volume]);

  return {
    playSuccessSound,
    playLevelUpSound,
  };
};

// Example usage:
// const { playSuccessSound, playLevelUpSound } = useSoundWithFallback({
//   useAudioFiles: true, // Set to true to use actual audio files
//   successSoundUrl: '/sounds/custom-success.mp3',
//   levelUpSoundUrl: '/sounds/custom-levelup.mp3',
//   volume: 0.5,
// });
