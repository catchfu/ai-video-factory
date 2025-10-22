
import React, { useState, useRef, useEffect } from 'react';
import { Wand2, Upload, Play, SlidersHorizontal, Clock, Ratio as AspectRatioIcon, Mic, RotateCcw } from 'lucide-react';
import { generateVideo } from '../services/geminiService';
import { Loader } from './Loader';
import type { AspectRatio, HistoryItem, GenerationTask, TTSVoice, SubtitleSettings } from '../types';

interface VideoGeneratorProps {
  addVideoToHistory: (item: HistoryItem) => void;
  subtitleSettings: SubtitleSettings;
}

// Helper from VideoHistory.tsx to maintain aspect ratio
const getAspectRatioStyles = (aspectRatio: AspectRatio): React.CSSProperties => {
    switch (aspectRatio) {
      case '16:9': return { paddingTop: '56.25%' };
      case '9:16': return { paddingTop: '177.77%' };
      case '1:1': return { paddingTop: '100%' };
      case '4:3': return { paddingTop: '75%' };
      case '3:4': return { paddingTop: '133.33%' };
      default: return { paddingTop: '56.25%' };
    }
};

const VOICE_OPTIONS: { id: TTSVoice, name: string }[] = [
    { id: 'Kore', name: 'Kore (Female)'},
    { id: 'Puck', name: 'Puck (Male)'},
    { id: 'Charon', name: 'Charon (Male)'},
    { id: 'Fenrir', name: 'Fenrir (Male)'},
    { id: 'Zephyr', name: 'Zephyr (Female)'},
    { id: 'none', name: 'None (Silent)'},
]

// Component for rendering items in the queue, with an embedded player for successful tasks
const QueueItem: React.FC<{ task: GenerationTask; subtitleSettings: SubtitleSettings }> = ({ task, subtitleSettings }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (video && video.textTracks && video.textTracks.length > 0) {
            video.textTracks[0].mode = subtitleSettings.enabled ? 'showing' : 'hidden';
        }
    }, [subtitleSettings.enabled, task.result?.vttUrl]);

    // Sync functions for fallback video
    const syncPlay = () => audioRef.current?.play().catch(e => console.error("Audio play failed", e));
    const syncPause = () => audioRef.current?.pause();
    const syncSeek = () => {
        if (videoRef.current && audioRef.current) {
            const diff = Math.abs(videoRef.current.currentTime - audioRef.current.currentTime);
            if (diff > 0.3) { // Only sync if difference is significant
                audioRef.current.currentTime = videoRef.current.currentTime;
            }
        }
    };

    const handleReplay = () => {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      }
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
    };

    if (task.status === 'success' && task.result) {
        return (
            <div className="bg-gray-800 p-4 rounded-md space-y-3 border border-green-500/50">
                <p className="text-white font-semibold truncate" title={task.prompt}>{task.prompt}</p>
                <div style={getAspectRatioStyles(task.aspectRatio)} className="relative w-full bg-black rounded-md overflow-hidden">
                    <video
                        ref={videoRef}
                        src={task.result.videoUrl}
                        className="absolute top-0 left-0 w-full h-full object-cover bg-black"
                        controls
                        muted={!!task.result.audioUrl}
                        loop
                        playsInline
                        onPlay={task.result.audioUrl ? syncPlay : undefined}
                        onPause={task.result.audioUrl ? syncPause : undefined}
                        onTimeUpdate={task.result.audioUrl ? syncSeek : undefined}
                        crossOrigin="anonymous"
                        onLoadedMetadata={() => {
                            if (videoRef.current && videoRef.current.textTracks.length > 0) {
                                videoRef.current.textTracks[0].mode = subtitleSettings.enabled ? 'showing' : 'hidden';
                            }
                        }}
                    >
                        {task.result.vttUrl && (
                            <track kind="subtitles" src={task.result.vttUrl} srcLang="en" label="English" />
                        )}
                    </video>
                    {task.result.audioUrl && <audio ref={audioRef} src={task.result.audioUrl} />}
                </div>
                 <div className="flex justify-between items-center">
                    <p className="text-sm text-green-400 font-medium">Generation complete!</p>
                    <button onClick={handleReplay} className="flex items-center text-gray-300 hover:text-white transition-colors text-sm" title="Replay video">
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Replay
                    </button>
                 </div>
            </div>
        );
    }

    // Default view for pending, generating, or error states
    return (
        <div className="bg-gray-800 p-4 rounded-md flex items-center justify-between">
            <div className="flex-1 overflow-hidden">
                <p className="text-white font-semibold truncate" title={task.prompt}>{task.prompt}</p>
                <p className="text-sm text-gray-400">{task.progressMessage}</p>
                {task.error && <p className="text-sm text-red-400 mt-1">Error: {task.error}</p>}
            </div>
            <div className="w-32 text-right flex items-center justify-end">
                {task.status === 'generating' && <Loader />}
                {task.status === 'error' && <span className="text-red-400 font-semibold">Failed</span>}
                {task.status === 'pending' && <span className="text-yellow-400 font-semibold">Queued</span>}
            </div>
        </div>
    );
};

export const VideoGenerator: React.FC<VideoGeneratorProps> = ({ addVideoToHistory, subtitleSettings }) => {
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(15);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [voice, setVoice] = useState<TTSVoice>('Kore');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      window.Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results: { data: { prompt: string; duration?: string; aspectRatio?: string; voice?: string }[] }) => {
          const newTasks = results.data.map(row => ({
            id: crypto.randomUUID(),
            prompt: row.prompt,
            duration: parseInt(row.duration || '15', 10),
            aspectRatio: (row.aspectRatio as AspectRatio) || '9:16',
            voice: (VOICE_OPTIONS.find(v => v.id === row.voice) ? row.voice as TTSVoice : 'Kore'),
            status: 'pending' as const,
            progressMessage: 'Waiting in queue...',
          }));
          setTasks(prev => [...prev, ...newTasks]);
        },
      });
    }
  };

  const processTask = async (task: GenerationTask) => {
    setTasks(currentTasks => currentTasks.map(t => t.id === task.id ? { ...t, status: 'generating', progressMessage: 'Starting...' } : t));

    try {
        const { videoBlob, audioBlob, vttContent, isFallback } = await generateVideo(
            task.prompt, 
            task.duration, 
            task.aspectRatio, 
            task.voice,
            (progressMessage: string) => {
                setTasks(currentTasks => currentTasks.map(t => t.id === task.id ? { ...t, progressMessage } : t));
            }
        );

        const videoUrl = URL.createObjectURL(videoBlob);
        const audioUrl = audioBlob ? URL.createObjectURL(audioBlob) : undefined;
        const vttUrl = vttContent ? URL.createObjectURL(new Blob([vttContent], { type: 'text/vtt' })) : undefined;

        const result = { videoUrl, audioUrl, vttUrl, isFallback };

        setTasks(currentTasks => currentTasks.map(t => t.id === task.id ? { ...t, status: 'success', result } : t));

        const historyItem: HistoryItem = {
            id: task.id,
            prompt: task.prompt,
            videoUrl,
            audioUrl,
            vttUrl,
            isFallback,
            createdAt: new Date().toISOString(),
            duration: task.duration,
            aspectRatio: task.aspectRatio,
            status: 'completed',
            voice: task.voice,
        };
        addVideoToHistory(historyItem);
    } catch (error) {
        console.error('Generation failed for task', task.id, error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        setTasks(currentTasks => currentTasks.map(t => t.id === task.id ? { ...t, status: 'error', error: errorMessage, progressMessage: 'Failed' } : t));
    }
  };

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    const newTask: GenerationTask = {
      id: crypto.randomUUID(),
      prompt,
      duration,
      aspectRatio,
      voice,
      status: 'pending',
      progressMessage: 'Waiting in queue...',
    };
    setTasks(prev => [newTask, ...prev]);
    processTask(newTask);
    setPrompt('');
  };

  const handleProcessQueue = () => {
    tasks.filter(t => t.status === 'pending').forEach(processTask);
  };
    
  return (
    <div className="space-y-8">
      {/* Single Video Generator */}
      <div className="bg-surface p-6 rounded-lg border border-gray-700 shadow-lg">
        <h2 className="text-2xl font-bold mb-4 flex items-center"><Wand2 className="mr-2 text-primary" /> Create a New Video</h2>
        <div className="space-y-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., A cinematic shot of a futuristic city at night, neon lights reflecting on wet streets..."
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-md focus:ring-2 focus:ring-primary focus:border-primary transition duration-200 resize-none"
            rows={4}
          />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center"><Clock className="mr-2 h-4 w-4" /> Duration (seconds)</label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="5"
                  max="60"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <span className="font-mono text-lg w-12 text-center bg-gray-800 py-1 rounded-md">{duration}s</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center"><AspectRatioIcon className="mr-2 h-4 w-4" /> Aspect Ratio</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="9:16">9:16 (Portrait)</option>
                <option value="16:9">16:9 (Landscape)</option>
                <option value="1:1">1:1 (Square)</option>
                <option value="4:3">4:3 (Classic)</option>
                <option value="3:4">3:4 (Vertical)</option>
              </select>
            </div>
            <div className="md:col-span-2 lg:col-span-1">
              <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center"><Mic className="mr-2 h-4 w-4" /> AI Voice</label>
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value as TTSVoice)}
                className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
              >
                {VOICE_OPTIONS.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          </div>
          <button onClick={handleGenerate} disabled={tasks.some(t => t.status === 'generating')} className="w-full flex justify-center items-center bg-primary hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-md transition duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed">
            <Wand2 className="mr-2" /> Generate Video
          </button>
        </div>
      </div>
      
      {/* Batch Video Generator */}
      <div className="bg-surface p-6 rounded-lg border border-gray-700 shadow-lg">
        <h2 className="text-2xl font-bold mb-4 flex items-center"><Upload className="mr-2 text-secondary" /> Batch Video Generation</h2>
        <p className="text-gray-400 mb-4">Upload a CSV file with 'prompt', 'duration', 'aspectRatio', and 'voice' columns.</p>
        <div className="flex items-center space-x-4">
          <label className="flex-1 cursor-pointer bg-gray-800 hover:bg-gray-700 text-white text-center px-4 py-2 rounded-md border border-gray-600 transition">
            <Upload className="inline-block mr-2" /> Select CSV File
            <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
          </label>
          <button onClick={handleProcessQueue} disabled={!tasks.some(t => t.status === 'pending') || tasks.some(t => t.status === 'generating')} className="bg-secondary hover:bg-pink-500 text-white font-bold py-2 px-6 rounded-md transition duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed">
            <Play className="mr-2" /> Process Queue
          </button>
        </div>
      </div>

      {/* Generation Queue */}
      {tasks.length > 0 && (
        <div className="bg-surface p-6 rounded-lg border border-gray-700 shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Generation Queue</h2>
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {tasks.map(task => (
              <QueueItem key={task.id} task={task} subtitleSettings={subtitleSettings} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
