export enum AppMode {
  GENERAL = 'GENERAL',
  TEXT = 'TEXT',
  SOCIAL = 'SOCIAL',
  NAVIGATION = 'NAVIGATION',
  SHOPPING = 'SHOPPING'
}

export enum Verbosity {
  MINIMAL = 'MINIMAL',
  STANDARD = 'STANDARD',
  DETAILED = 'DETAILED'
}

export interface AppSettings {
  verbosity: Verbosity;
  speechRate: number; // 0.5 to 2.0
  autoNarration: boolean;
  autoInterval: number; // ms
}

export interface AnalysisResult {
  text: string;
  priority: 'urgent' | 'normal';
  timestamp: number;
}
