import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, Subtitles } from 'lucide-react';
import type { SubtitleSettings } from '../types';

interface MultiClipPlayerProps {
    videoUrls: string[];
    audioUrl?: string;
    vttUrl?: string;
    subtitleSettings: SubtitleSettings;
}

// Simple VTT parser to get scene timings
const parseVtt = (vttContent: string): { start: number; end: number }[] => {
    if (!vttContent) return [];
    const lines = vttContent.split('\n');
    const cues = [];
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('-->')) {
            const [start, end] = lines[i].split(' --> ').map(time => {
                const parts = time.split(':').map(parseFloat);
                return (parts.length > 2)
                    ? parts[0] * 3600 + parts[1] * 60 + parts[2]
                    : parts[0] * 60 + parts[1];
            });
            cues.push({ start, end });
        }
    }
    return cues;
};


export const MultiClipPlayer: React.FC<MultiClipPlayerProps> = ({ videoUrls, audioUrl, vttUrl, subtitleSettings }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showSubtitles, setShowSubtitles] = useState(subtitleSettings.enabled);

    const sceneCues = useRef<{ start: number; end: number }[]>([]);
    const currentSceneIndex = useRef(-1);
    
    useEffect(() => {
        if (vttUrl) {
            fetch(vttUrl)
                .then(res => res.text())
                .then(text => {
                    sceneCues.current = parseVtt(text);
                });
        }
        setShowSubtitles(subtitleSettings.enabled);
    }, [vttUrl, subtitleSettings.enabled]);

    useEffect(() => {
        const video = videoRef.current;
        if(video && video.textTracks.length > 0) {
            video.textTracks[0].mode = showSubtitles ? 'showing' : 'hidden';
        }
    }, [showSubtitles]);

    const handlePlayPause = () => {
        if (!audioRef.current || !videoRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            videoRef.current.pause();
        } else {
            audioRef.current.play().catch(console.error);
            videoRef.current.play().catch(console.error);
        }
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        if (!audioRef.current || !videoRef.current) return;
        const time = audioRef.current.currentTime;
        setCurrentTime(time);

        const sceneIndex = sceneCues.current.findIndex(cue => time >= cue.start && time < cue.end);
        
        if (sceneIndex !== -1 && sceneIndex < videoUrls.length && sceneIndex !== currentSceneIndex.current) {
            currentSceneIndex.current = sceneIndex;
            videoRef.current.src = videoUrls[sceneIndex];
            if(isPlaying) videoRef.current.play().catch(console.error);
        }
        
        // Simple video/audio sync
        if (Math.abs(videoRef.current.currentTime - time) > 0.5) {
            videoRef.current.currentTime = time;
        }
    };
    
    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        if (audioRef.current) audioRef.current.currentTime = time;
        setCurrentTime(time);
        handleTimeUpdate(); // Force scene switch on seek
    };

    const handleReplay = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            if(!isPlaying) handlePlayPause();
            else audioRef.current.play();
        }
    };

    useEffect(() => {
        const audio = audioRef.current;
        if(audio) {
            const onLoaded = () => setDuration(audio.duration);
            audio.addEventListener('loadedmetadata', onLoaded);
            audio.addEventListener('timeupdate', handleTimeUpdate);
            audio.addEventListener('play', () => setIsPlaying(true));
            audio.addEventListener('pause', () => setIsPlaying(false));
            audio.addEventListener('ended', () => setIsPlaying(false));

            return () => {
                audio.removeEventListener('loadedmetadata', onLoaded);
                audio.removeEventListener('timeupdate', handleTimeUpdate);
                audio.removeEventListener('play', () => setIsPlaying(true));
                audio.removeEventListener('pause', () => setIsPlaying(false));
                audio.removeEventListener('ended', () => setIsPlaying(false));
            }
        }
    }, [audioUrl]);

    return (
        <div ref={containerRef} className="absolute top-0 left-0 w-full h-full bg-black group">
            <video
                ref={videoRef}
                src={videoUrls[0]}
                className="w-full h-full object-cover"
                loop
                muted
                playsInline
                crossOrigin="anonymous"
                onClick={handlePlayPause}
            >
                {vttUrl && <track kind="subtitles" src={vttUrl} default={showSubtitles} />}
            </video>
            {audioUrl && <audio ref={audioRef} src={audioUrl} muted={isMuted} />}

            {/* Custom Controls */}
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-2">
                <div></div>
                <div className="flex justify-center">
                    <button onClick={handlePlayPause} className="text-white p-2 bg-black/50 rounded-full">
                        {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                    </button>
                </div>
                <div className="space-y-2">
                    <input
                        type="range"
                        min="0"
                        max={duration}
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-secondary"
                    />
                    <div className="flex justify-between items-center text-white text-xs font-mono">
                        <div>
                            <span>{new Date(currentTime * 1000).toISOString().substr(14, 5)}</span> / <span>{new Date(duration * 1000).toISOString().substr(14, 5)}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                            <button onClick={handleReplay}><RotateCcw size={16}/></button>
                            {vttUrl && <button onClick={() => setShowSubtitles(!showSubtitles)} className={showSubtitles ? 'text-secondary' : ''}><Subtitles size={16}/></button>}
                            <button onClick={() => setIsMuted(!isMuted)}>{isMuted ? <VolumeX size={16}/> : <Volume2 size={16}/>}</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
