
export type Tab = 'video' | 'image' | 'history';

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4';

export interface HistoryItem {
  id: string;
  prompt: string;
  videoUrl: string;
  thumbnailUrl?: string; // For future use
  createdAt: string;
  duration: number;
  aspectRatio: AspectRatio;
  status: 'completed' | 'failed';
}

export interface GenerationTask {
    id: string;
    prompt: string;
    duration: number;
    aspectRatio: AspectRatio;
    status: 'pending' | 'generating' | 'success' | 'error';
    progressMessage: string;
    resultUrl?: string;
    error?: string;
}
