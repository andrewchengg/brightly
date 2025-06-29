// Sound effects utility using Web Audio API
export class SoundEffects {
  private audioContext: AudioContext | null = null;

  constructor() {
    // Initialize AudioContext lazily to avoid issues with autoplay policies
    this.initAudioContext();
  }

  private initAudioContext() {
    try {
      if (typeof window !== "undefined" && "AudioContext" in window) {
        this.audioContext = new AudioContext();
      } else if (
        typeof window !== "undefined" &&
        "webkitAudioContext" in window
      ) {
        this.audioContext = new (window as any).webkitAudioContext();
      }
    } catch (error) {
      console.warn("AudioContext not supported:", error);
    }
  }

  private async ensureAudioContext() {
    if (!this.audioContext) {
      this.initAudioContext();
    }

    if (this.audioContext && this.audioContext.state === "suspended") {
      try {
        await this.audioContext.resume();
      } catch (error) {
        console.warn("Failed to resume AudioContext:", error);
      }
    }
  }

  async playSuccessSound(volume: number = 0.3) {
    try {
      await this.ensureAudioContext();

      if (!this.audioContext) {
        console.warn("AudioContext not available");
        return;
      }

      // Create a pleasant success sound (a major chord arpeggio)
      const now = this.audioContext.currentTime;
      const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 (C major chord)

      frequencies.forEach((freq, index) => {
        const oscillator = this.audioContext!.createOscillator();
        const gainNode = this.audioContext!.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext!.destination);

        oscillator.frequency.setValueAtTime(freq, now);
        oscillator.type = "sine";

        // Create a pleasant envelope
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(
          volume * 0.8,
          now + 0.05 + index * 0.1
        );
        gainNode.gain.exponentialRampToValueAtTime(
          0.001,
          now + 0.4 + index * 0.1
        );

        oscillator.start(now + index * 0.1);
        oscillator.stop(now + 0.4 + index * 0.1);
      });
    } catch (error) {
      console.warn("Failed to play success sound:", error);
    }
  }

  async playLevelUpSound(volume: number = 0.4) {
    try {
      await this.ensureAudioContext();

      if (!this.audioContext) {
        console.warn("AudioContext not available");
        return;
      }

      // Create an ascending triumphant sound
      const now = this.audioContext.currentTime;
      const frequencies = [261.63, 329.63, 392.0, 523.25, 659.25]; // C4, E4, G4, C5, E5

      frequencies.forEach((freq, index) => {
        const oscillator = this.audioContext!.createOscillator();
        const gainNode = this.audioContext!.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext!.destination);

        oscillator.frequency.setValueAtTime(freq, now);
        oscillator.type = "triangle";

        // Create a rising envelope
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume, now + 0.1 + index * 0.15);
        gainNode.gain.exponentialRampToValueAtTime(
          0.001,
          now + 0.3 + index * 0.15
        );

        oscillator.start(now + index * 0.15);
        oscillator.stop(now + 0.3 + index * 0.15);
      });
    } catch (error) {
      console.warn("Failed to play level up sound:", error);
    }
  }
}

// Create a singleton instance
export const soundEffects = new SoundEffects();
