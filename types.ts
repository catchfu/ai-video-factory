export type Tab = 'video' | 'image' | 'history' | 'settings';

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4';

export type TTSVoice = 'none' | 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';

export type GenerationLanguage = 'en' | 'zh';

export interface HistoryItem {
  id: string;
  prompt: string;
  videoUrl: string;
  audioUrl?: string;
  vttUrl?: string;
  isFallback: boolean;
  thumbnailUrl?: string;
  createdAt: string;
  duration: number;
  aspectRatio: AspectRatio;
  status: 'completed' | 'failed';
  voice: TTSVoice;
  language: GenerationLanguage;
}

export interface GenerationTask {
    id: string;
    prompt: string;
    duration: number;
    aspectRatio: AspectRatio;
    voice: TTSVoice;
    language: GenerationLanguage;
    status: 'pending' | 'generating' | 'success' | 'error';
    progressMessage: string;
    result?: {
        videoUrl: string;
        audioUrl?: string;
        vttUrl?: string;
        isFallback: boolean;
    };
    error?: string;
}

export interface SubtitleSettings {
  enabled: boolean;
  textColor: string;
  backgroundColor: string;
}

export interface AppSettings {
  subtitles: SubtitleSettings;
  pexelsApiKey: string;
  pixabayApiKey: string;
}
