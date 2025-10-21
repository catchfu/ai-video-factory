import React, { useState } from 'react';
import { Wand2, Upload, Play, SlidersHorizontal, Clock, Ratio as AspectRatioIcon } from 'lucide-react';
import { generateVideo } from '../services/geminiService';
import { Loader } from './Loader';
import type { AspectRatio, HistoryItem, GenerationTask } from '../types';

interface VideoGeneratorProps {
  addVideoToHistory: (item: HistoryItem) => void;
}

export const VideoGenerator: React.FC<VideoGeneratorProps> = ({ addVideoToHistory }) => {
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(15);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      window.Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results: { data: { prompt: string; duration?: string; aspectRatio?: string }[] }) => {
          const newTasks = results.data.map(row => ({
            id: crypto.randomUUID(),
            prompt: row.prompt,
            duration: parseInt(row.duration || '15', 10),
            aspectRatio: (row.aspectRatio as AspectRatio) || '9:16',
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
        const videoBlob = await generateVideo(
            task.prompt, 
            task.duration, 
            task.aspectRatio, 
            (progressMessage: string) => {
                setTasks(currentTasks => currentTasks.map(t => t.id === task.id ? { ...t, progressMessage } : t));
            }
        );
        const videoUrl = URL.createObjectURL(videoBlob);
        setTasks(currentTasks => currentTasks.map(t => t.id === task.id ? { ...t, status: 'success', resultUrl: videoUrl } : t));

        const historyItem: HistoryItem = {
            id: task.id,
            prompt: task.prompt,
            videoUrl,
            createdAt: new Date().toISOString(),
            duration: task.duration,
            aspectRatio: task.aspectRatio,
            status: 'completed',
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
          <div className="grid md:grid-cols-2 gap-4">
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
          </div>
          <button onClick={handleGenerate} disabled={tasks.some(t => t.status === 'generating')} className="w-full flex justify-center items-center bg-primary hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-md transition duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed">
            <Wand2 className="mr-2" /> Generate Video
          </button>
        </div>
      </div>
      
      {/* Batch Video Generator */}
      <div className="bg-surface p-6 rounded-lg border border-gray-700 shadow-lg">
        <h2 className="text-2xl font-bold mb-4 flex items-center"><Upload className="mr-2 text-secondary" /> Batch Video Generation</h2>
        <p className="text-gray-400 mb-4">Upload a CSV file with 'prompt', 'duration', and 'aspectRatio' columns.</p>
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
              <div key={task.id} className="bg-gray-800 p-4 rounded-md flex items-center justify-between">
                <div className="flex-1 overflow-hidden">
                    <p className="text-white font-semibold truncate" title={task.prompt}>{task.prompt}</p>
                    <p className="text-sm text-gray-400">{task.progressMessage}</p>
                    {task.error && <p className="text-sm text-red-400 mt-1">Error: {task.error}</p>}
                </div>
                <div className="w-48 text-right flex items-center justify-end space-x-4">
                    {task.status === 'generating' && <Loader />}
                    {task.status === 'success' && <a href={task.resultUrl} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">View</a>}
                    {task.status === 'error' && <span className="text-red-400">Failed</span>}
                    {task.status === 'pending' && <span className="text-yellow-400">Queued</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};