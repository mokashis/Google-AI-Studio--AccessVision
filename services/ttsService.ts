import { AppSettings } from '../types';

class TTSService {
  private synthesis: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    this.synthesis = window.speechSynthesis;
  }

  public stop() {
    this.synthesis.cancel();
  }

  public speak(text: string, priority: 'urgent' | 'normal', settings: AppSettings) {
    if (!text) return;

    // If urgent, stop current speech immediately
    if (priority === 'urgent') {
      this.synthesis.cancel();
    } else if (this.synthesis.speaking && settings.autoNarration) {
      // If auto-narration is on and we are already speaking normal priority, 
      // we might want to skip this frame or queue it. 
      // For simplicity in this real-time app, we replace if the previous one is mostly done,
      // or just let the queue handle it if it's short.
      // However, to prevent backlog, cancelling is often safer for "real-time" feel.
      this.synthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure voice settings
    utterance.rate = settings.speechRate;
    utterance.pitch = priority === 'urgent' ? 1.1 : 1.0; // Slightly higher pitch for urgency
    utterance.volume = 1.0;

    // Try to select a high-quality voice
    const voices = this.synthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith('en') && v.localService) || 
                           voices.find(v => v.lang.startsWith('en'));
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    this.currentUtterance = utterance;
    this.synthesis.speak(utterance);
  }
}

export const ttsService = new TTSService();