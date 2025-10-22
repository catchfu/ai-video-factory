
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Trash2, Youtube, Download, Share2, FileAudio, Subtitles } from 'lucide-react';
import type { HistoryItem, AspectRatio, SubtitleSettings } from '../types';
import { formatDuration } from '../utils/helpers';

interface VideoHistoryProps {
  history: HistoryItem[];
  setHistory: (history: HistoryItem[]) => void;
  subtitleSettings: SubtitleSettings;
}

const SocialIcon: React.FC<{ platform: 'YouTube' | 'TikTok' | 'Douyin' }> = ({ platform }) => {
    const commonClasses = "w-6 h-6";
    if (platform === 'YouTube') return <Youtube className={`${commonClasses} text-red-500`} />;
    if (platform === 'TikTok') return <svg className={commonClasses} fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 0 .17.02.25.04.54.14.94.52 1.1 1.02.12.37.18.76.18 1.14s-.06.77-.18 1.14c-.16.5-.56.88-1.1 1.02-.08.02-.17.04-.25.04-1.3.01-2.6.02-3.91.02s-2.61.01-3.91-.02c-.08 0-.17-.02-.25-.04-.54-.14-.94-.52-1.1-1.02-.12-.37-.18-.76-.18-1.14s.06-.77.18-1.14c.16-.5.56.88 1.1-1.02.08-.02.17-.04.25-.04 1.3-.01 2.6-.02 3.91-.02zM12 4.19c-3.34 0-6.05 2.72-6.05 6.05s2.72 6.05 6.05 6.05 6.05-2.72 6.05-6.05-2.72-6.05-6.05-6.05zm0 10.1c-2.22 0-4.02-1.8-4.02-4.02s1.8-4.02 4.02-4.02 4.02 1.8 4.02 4.02-1.8 4.02-4.02 4.02z"/></svg>;
    if (platform === 'Douyin') return <svg className={commonClasses} fill="currentColor" viewBox="0 0 24 24"><path d="M16.63,8.41a4.2,4.2,0,0,1-4.18,4.2,4.2,4.2,0,0,1-4.2-4.2,4.2,4.2,0,0,1,4.2-4.2,4.1,4.1,0,0,1,2.83,1l-1.4,1.4a2.15,2.15,0,0,0-1.43-.53,2.1,2.1,0,1,0,0,4.2,2.1,2.1,0,0,0,2.1-2.1H12.45V8.41h4.18Z"/></svg>;
    return null;
}

const getAspectRatioStyles = (aspectRatio: AspectRatio): React.CSSProperties => {
  switch (aspectRatio) {
    case '16:9': return { paddingTop: '56.25%' }; // 9 / 16 * 100
    case '9:16': return { paddingTop: '177.77%' }; // 16 / 9 * 100
    case '1:1': return { paddingTop: '100%' };
    case '4:3': return { paddingTop: '75%' }; // 3 / 4 * 100
    case '3:4': return { paddingTop: '133.33%' }; // 4 / 3 * 100
    default: return { paddingTop: '56.25%' };
  }
};

const VideoCard: React.FC<{ item: HistoryItem; onDelete: (id: string) => void; subtitleSettings: SubtitleSettings; }> = ({ item, onDelete, subtitleSettings }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (video && video.textTracks && video.textTracks.length > 0) {
            video.textTracks[0].mode = subtitleSettings.enabled ? 'showing' : 'hidden';
        }
    }, [subtitleSettings.enabled, item.vttUrl]);

    const handleSocialClick = (platform: string) => {
        alert(`${platform} upload coming soon!`);
    };

    const syncPlay = () => audioRef.current?.play().catch(e => console.error("Audio play failed", e));
    const syncPause = () => audioRef.current?.pause();
    const syncSeek = () => {
        if (videoRef.current && audioRef.current) {
            const diff = Math.abs(videoRef.current.currentTime - audioRef.current.currentTime);
            if (diff > 0.3) {
                audioRef.current.currentTime = videoRef.current.currentTime;
            }
        }
    };

    return (
        <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 transition-transform hover:scale-105 duration-300 flex flex-col">
            <div style={getAspectRatioStyles(item.aspectRatio)} className="relative w-full bg-black">
                <video
                    ref={videoRef}
                    src={item.videoUrl}
                    className="absolute top-0 left-0 w-full h-full object-cover"
                    controls
                    muted={!!item.audioUrl}
                    loop
                    playsInline
                    onPlay={item.audioUrl ? syncPlay : undefined}
                    onPause={item.audioUrl ? syncPause : undefined}
                    onTimeUpdate={item.audioUrl ? syncSeek : undefined}
                    crossOrigin="anonymous"
                    onLoadedMetadata={() => {
                        if (videoRef.current && videoRef.current.textTracks.length > 0) {
                            videoRef.current.textTracks[0].mode = subtitleSettings.enabled ? 'showing' : 'hidden';
                        }
                    }}
                >
                    {item.vttUrl && (
                        <track kind="subtitles" src={item.vttUrl} srcLang="en" label="English" />
                    )}
                </video>
                {item.audioUrl && <audio ref={audioRef} src={item.audioUrl} />}
                {item.isFallback && (
                    <div className="absolute top-2 left-2 bg-secondary text-white text-xs font-bold px-2 py-1 rounded shadow-lg">
                        FALLBACK
                    </div>
                )}
            </div>
            <div className="p-4 space-y-3 flex-grow flex flex-col">
                <p className="text-gray-300 text-sm h-10 overflow-hidden flex-grow" title={item.prompt}>{item.prompt}</p>
                <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>{formatDuration(item.duration)}</span>
                    <span>{item.aspectRatio}</span>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                    <div className="flex space-x-3">
                        <button onClick={() => handleSocialClick('YouTube')} className="text-gray-400 hover:text-white" title="Upload to YouTube"><SocialIcon platform="YouTube"/></button>
                        <button onClick={() => handleSocialClick('TikTok')} className="text-gray-400 hover:text-white" title="Upload to TikTok"><SocialIcon platform="TikTok"/></button>
                        <button onClick={() => handleSocialClick('Douyin')} className="text-gray-400 hover:text-white" title="Upload to Douyin"><SocialIcon platform="Douyin"/></button>
                    </div>
                     <div className="flex space-x-2">
                        <a href={item.videoUrl} download={`video_${item.id}.mp4`} className="text-gray-400 hover:text-white" title="Download Video"><Download className="w-5 h-5" /></a>
                        {item.audioUrl && <a href={item.audioUrl} download={`audio_${item.id}.wav`} className="text-gray-400 hover:text-white" title="Download Audio"><FileAudio className="w-5 h-5" /></a>}
                        {item.vttUrl && <a href={item.vttUrl} download={`subtitles_${item.id}.vtt`} className="text-gray-400 hover:text-white" title="Download Subtitles"><Subtitles className="w-5 h-5" /></a>}
                        <button onClick={() => onDelete(item.id)} className="text-gray-400 hover:text-red-500" title="Delete Video"><Trash2 className="w-5 h-5" /></button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export const VideoHistory: React.FC<VideoHistoryProps> = ({ history, setHistory, subtitleSettings }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = useMemo(() => {
    return history.filter(item =>
      item.prompt.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [history, searchTerm]);

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      const newHistory = history.filter(item => item.id !== id);
      // Also revoke blob URLs to free memory
      const itemToDelete = history.find(item => item.id === id);
      if (itemToDelete) {
          URL.revokeObjectURL(itemToDelete.videoUrl);
          if (itemToDelete.audioUrl) URL.revokeObjectURL(itemToDelete.audioUrl);
          if (itemToDelete.vttUrl) URL.revokeObjectURL(itemToDelete.vttUrl);
      }
      setHistory(newHistory);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold">Video History ({filteredHistory.length})</h2>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by prompt..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface border border-gray-600 rounded-md py-2 pl-10 pr-4 focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
      
      {filteredHistory.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredHistory.map(item => (
            <VideoCard key={item.id} item={item} onDelete={handleDelete} subtitleSettings={subtitleSettings} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-surface rounded-lg border border-gray-700">
          <p className="text-gray-400">No videos found. Generate one to get started!</p>
        </div>
      )}
    </div>
  );
};
