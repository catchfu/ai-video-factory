
import React, { useState, useMemo } from 'react';
import { Search, Trash2, Youtube, Download, Share2 } from 'lucide-react';
import type { HistoryItem } from '../types';
import { formatDuration } from '../utils/helpers';

interface VideoHistoryProps {
  history: HistoryItem[];
  setHistory: (history: HistoryItem[]) => void;
}

const SocialIcon: React.FC<{ platform: 'YouTube' | 'TikTok' | 'Douyin' }> = ({ platform }) => {
    const commonClasses = "w-6 h-6";
    if (platform === 'YouTube') return <Youtube className={`${commonClasses} text-red-500`} />;
    // Placeholder icons for TikTok and Douyin
    if (platform === 'TikTok') return <svg className={commonClasses} fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 0 .17.02.25.04.54.14.94.52 1.1 1.02.12.37.18.76.18 1.14s-.06.77-.18 1.14c-.16.5-.56.88-1.1 1.02-.08.02-.17.04-.25.04-1.3.01-2.6.02-3.91.02s-2.61.01-3.91-.02c-.08 0-.17-.02-.25-.04-.54-.14-.94-.52-1.1-1.02-.12-.37-.18-.76-.18-1.14s.06-.77.18-1.14c.16-.5.56-.88 1.1-1.02.08-.02.17-.04.25-.04 1.3-.01 2.6-.02 3.91-.02zM12 4.19c-3.34 0-6.05 2.72-6.05 6.05s2.72 6.05 6.05 6.05 6.05-2.72 6.05-6.05-2.72-6.05-6.05-6.05zm0 10.1c-2.22 0-4.02-1.8-4.02-4.02s1.8-4.02 4.02-4.02 4.02 1.8 4.02 4.02-1.8 4.02-4.02 4.02z"/></svg>;
    if (platform === 'Douyin') return <svg className={commonClasses} fill="currentColor" viewBox="0 0 24 24"><path d="M16.63,8.41a4.2,4.2,0,0,1-4.18,4.2,4.2,4.2,0,0,1-4.2-4.2,4.2,4.2,0,0,1,4.2-4.2,4.1,4.1,0,0,1,2.83,1l-1.4,1.4a2.15,2.15,0,0,0-1.43-.53,2.1,2.1,0,1,0,0,4.2,2.1,2.1,0,0,0,2.1-2.1H12.45V8.41h4.18Z"/></svg>;
    return null;
}

const VideoCard: React.FC<{ item: HistoryItem; onDelete: (id: string) => void }> = ({ item, onDelete }) => {
    const handleSocialClick = (platform: string) => {
        alert(`${platform} upload coming soon!`);
    };

    return (
        <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 transition-transform hover:scale-105 duration-300">
            <div className="aspect-w-9 aspect-h-16">
                <video src={item.videoUrl} className="w-full h-full object-cover" controls muted loop playsInline />
            </div>
            <div className="p-4 space-y-3">
                <p className="text-gray-300 text-sm h-10 overflow-hidden" title={item.prompt}>{item.prompt}</p>
                <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>{formatDuration(item.duration)}</span>
                    <span>{item.aspectRatio}</span>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                    <div className="flex space-x-3">
                        <button onClick={() => handleSocialClick('YouTube')} className="text-gray-400 hover:text-white"><SocialIcon platform="YouTube"/></button>
                        <button onClick={() => handleSocialClick('TikTok')} className="text-gray-400 hover:text-white"><SocialIcon platform="TikTok"/></button>
                        <button onClick={() => handleSocialClick('Douyin')} className="text-gray-400 hover:text-white"><SocialIcon platform="Douyin"/></button>
                    </div>
                     <div className="flex space-x-3">
                        <a href={item.videoUrl} download={`video_${item.id}.mp4`} className="text-gray-400 hover:text-white"><Download className="w-5 h-5" /></a>
                        <button onClick={() => onDelete(item.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-5 h-5" /></button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export const VideoHistory: React.FC<VideoHistoryProps> = ({ history, setHistory }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = useMemo(() => {
    return history.filter(item =>
      item.prompt.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [history, searchTerm]);

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this video?')) {
      const newHistory = history.filter(item => item.id !== id);
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
            <VideoCard key={item.id} item={item} onDelete={handleDelete} />
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
