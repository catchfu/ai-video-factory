
import React, { useState, useEffect, useCallback } from 'react';
import { Video, Image, FileText, Settings as SettingsIcon, Film } from 'lucide-react';
import { VideoGenerator } from './components/VideoGenerator';
import { ImageEditor } from './components/ImageEditor';
import { VideoHistory } from './components/VideoHistory';
import { ApiKeySelector } from './components/ApiKeySelector';
import { SettingsComponent } from './components/Settings';
import type { HistoryItem, SubtitleSettings, Tab } from './types';

const TABS: { id: Tab; name: string; icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
  { id: 'video', name: 'Video Generator', icon: Film },
  { id: 'image', name: 'Image Editor', icon: Image },
  { id: 'history', name: 'Video History', icon: Video },
  { id: 'settings', name: 'Settings', icon: SettingsIcon },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('video');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isApiKeySelected, setIsApiKeySelected] = useState(false);
  const [subtitleSettings, setSubtitleSettings] = useState<SubtitleSettings>({
    enabled: true,
    textColor: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  });

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('videoHistory');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
      const storedSettings = localStorage.getItem('subtitleSettings');
      if (storedSettings) {
        setSubtitleSettings(JSON.parse(storedSettings));
      }
    } catch (error) {
      console.error("Failed to load data from localStorage:", error);
    }
  }, []);

  const updateHistory = (newItems: HistoryItem[]) => {
    try {
      localStorage.setItem('videoHistory', JSON.stringify(newItems));
      setHistory(newItems);
    } catch (error) {
      console.error("Failed to save history to localStorage:", error);
    }
  };

  const updateSubtitleSettings = (newSettings: SubtitleSettings) => {
    try {
      localStorage.setItem('subtitleSettings', JSON.stringify(newSettings));
      setSubtitleSettings(newSettings);
    } catch (error) {
      console.error("Failed to save subtitle settings to localStorage:", error);
    }
  };

  useEffect(() => {
    const styleId = 'custom-subtitle-styles';
    let styleElement = document.getElementById(styleId);
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    styleElement.innerHTML = `
      ::cue {
        color: ${subtitleSettings.textColor} !important;
        background-color: ${subtitleSettings.backgroundColor} !important;
        /* Additional styles for better readability might go here */
      }
    `;
  }, [subtitleSettings.textColor, subtitleSettings.backgroundColor]);

  const addVideoToHistory = (item: HistoryItem) => {
    setHistory(prev => {
      const newHistory = [item, ...prev];
      updateHistory(newHistory);
      return newHistory;
    });
  };
  
  const checkApiKey = useCallback(async () => {
    if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      setIsApiKeySelected(hasKey);
    } else {
      console.warn('aistudio API not found. Assuming API key is set via environment variable.');
      setIsApiKeySelected(true);
    }
  }, []);

  useEffect(() => {
    checkApiKey();
  }, [checkApiKey]);
  
  const renderContent = () => {
    switch (activeTab) {
      case 'video':
        return isApiKeySelected ? <VideoGenerator addVideoToHistory={addVideoToHistory} subtitleSettings={subtitleSettings} /> : <ApiKeySelector onKeySelected={checkApiKey} />;
      case 'image':
        return <ImageEditor />;
      case 'history':
        return <VideoHistory history={history} setHistory={updateHistory} subtitleSettings={subtitleSettings} />;
      case 'settings':
        return <SettingsComponent settings={subtitleSettings} onSettingsChange={updateSubtitleSettings} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="bg-surface/50 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-700">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <SettingsIcon className="h-8 w-8 text-primary animate-spin-slow" />
              <h1 className="ml-3 text-2xl font-bold text-on-surface">AI Video Factory</h1>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                      activeTab === tab.id
                        ? 'bg-primary text-on-primary'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <tab.icon className="h-5 w-5 mr-2" />
                    {tab.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Nav */}
       <div className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-gray-700 z-20">
          <div className="flex justify-around">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center w-full pt-2 pb-1 text-xs font-medium transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'text-primary'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <tab.icon className="h-6 w-6 mb-1" />
                {tab.name}
              </button>
            ))}
          </div>
        </div>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
