import React, { useState, useEffect } from 'react';
import type { AppSettings } from '../types';
import { Palette, ToggleLeft, ToggleRight, Type, KeyRound, ExternalLink, Save, RotateCcw } from 'lucide-react';

interface SettingsComponentProps {
    settings: AppSettings;
    onSettingsChange: (newSettings: AppSettings) => void;
}

export const SettingsComponent: React.FC<SettingsComponentProps> = ({ settings, onSettingsChange }) => {
    const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    const handleSubtitleToggle = () => {
        setLocalSettings(prev => ({
            ...prev,
            subtitles: { ...prev.subtitles, enabled: !prev.subtitles.enabled }
        }));
    };

    const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>, category?: keyof AppSettings) => {
        const { name, value } = e.target;
        if (category) {
            setLocalSettings(prev => ({
                ...prev,
                [category]: { ...(prev[category] as object), [name]: value }
            }));
        } else {
            setLocalSettings(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSaveChanges = () => {
        setSaveStatus('saving');
        onSettingsChange(localSettings);
        setTimeout(() => {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        }, 300);
    };
    
    const handleResetChanges = () => {
        setLocalSettings(settings);
    };

    const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(settings);

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            {/* Subtitle Settings */}
            <div className="bg-surface p-6 rounded-lg border border-gray-700 shadow-lg">
                <h2 className="text-2xl font-bold mb-6">Subtitle Settings</h2>
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <label className="text-lg font-medium text-on-surface flex items-center">
                            {localSettings.subtitles.enabled ? <ToggleRight className="mr-3 h-6 w-6 text-primary" /> : <ToggleLeft className="mr-3 h-6 w-6 text-gray-500" />}
                            Show Subtitles by Default
                        </label>
                        <button
                            onClick={handleSubtitleToggle}
                            className={`w-20 text-center px-4 py-2 rounded-md font-semibold transition-colors ${
                                localSettings.subtitles.enabled ? 'bg-primary text-white' : 'bg-gray-600 text-gray-300'
                            }`}
                        >
                            {localSettings.subtitles.enabled ? 'On' : 'Off'}
                        </button>
                    </div>

                    <div className="flex items-center justify-between">
                        <label htmlFor="textColor" className="text-lg font-medium text-on-surface flex items-center">
                           <Type className="mr-3 h-5 w-5 text-gray-400" />
                            Text Color
                        </label>
                        <div className="flex items-center space-x-3 p-1 bg-gray-800 border border-gray-600 rounded-md">
                             <input
                                type="color"
                                id="textColor"
                                name="textColor"
                                value={localSettings.subtitles.textColor}
                                onChange={(e) => handleValueChange(e, 'subtitles')}
                                className="w-10 h-10 p-0 border-none rounded cursor-pointer bg-transparent appearance-none [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-md"
                            />
                            <input 
                                type="text"
                                value={localSettings.subtitles.textColor}
                                onChange={(e) => handleValueChange(e, 'subtitles')}
                                name="textColor"
                                className="w-24 bg-gray-700 p-2 rounded-md font-mono text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <label htmlFor="backgroundColor" className="text-lg font-medium text-on-surface flex items-center">
                           <Palette className="mr-3 h-5 w-5 text-gray-400" />
                            Background Color
                        </label>
                         <div className="flex items-center space-x-3 p-1 bg-gray-800 border border-gray-600 rounded-md">
                            <div className="w-10 h-10 rounded-md border border-gray-500" style={{ backgroundColor: localSettings.subtitles.backgroundColor }}></div>
                            <input
                                type="text"
                                id="backgroundColor"
                                name="backgroundColor"
                                value={localSettings.subtitles.backgroundColor}
                                onChange={(e) => handleValueChange(e, 'subtitles')}
                                className="w-36 bg-gray-700 p-2 rounded-md font-mono text-sm"
                                placeholder="e.g., rgba(0,0,0,0.75)"
                            />
                        </div>
                    </div>
                     <p className="text-sm text-gray-400 pt-4 border-t border-gray-700">
                        You can use standard color names, hex codes (#FFFFFF), or RGBA values (e.g., rgba(0, 0, 0, 0.75)) for colors.
                    </p>
                </div>
            </div>

            {/* Third-Party API Keys */}
            <div className="bg-surface p-6 rounded-lg border border-gray-700 shadow-lg">
                <h2 className="text-2xl font-bold mb-6 flex items-center"><KeyRound className="mr-3 text-secondary"/>Third-Party API Keys</h2>
                <p className="text-gray-400 mb-6">Provide API keys for stock footage services to get more relevant videos when the primary generator is unavailable.</p>
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between">
                        <label htmlFor="pexelsApiKey" className="text-lg font-medium text-on-surface mb-2 md:mb-0">Pexels API Key</label>
                        <input
                            type="password"
                            id="pexelsApiKey"
                            name="pexelsApiKey"
                            value={localSettings.pexelsApiKey}
                            onChange={(e) => handleValueChange(e)}
                            placeholder="Enter your Pexels API key"
                            className="w-full md:w-80 bg-gray-800 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-secondary"
                        />
                    </div>
                     <a href="https://www.pexels.com/api/" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-secondary transition flex items-center justify-end">
                        Get a Pexels API key
                        <ExternalLink className="h-4 w-4 ml-1" />
                    </a>
                     <div className="flex flex-col md:flex-row md:items-center justify-between">
                        <label htmlFor="pixabayApiKey" className="text-lg font-medium text-on-surface mb-2 md:mb-0">Pixabay API Key</label>
                        <input
                            type="password"
                            id="pixabayApiKey"
                            name="pixabayApiKey"
                            value={localSettings.pixabayApiKey}
                            onChange={(e) => handleValueChange(e)}
                            placeholder="Enter your Pixabay API key"
                            className="w-full md:w-80 bg-gray-800 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-secondary"
                        />
                    </div>
                    <a href="https://pixabay.com/api/docs/" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-secondary transition flex items-center justify-end">
                        Get a Pixabay API key
                        <ExternalLink className="h-4 w-4 ml-1" />
                    </a>
                </div>
            </div>

             {/* Action Buttons */}
            <div className="flex justify-end items-center gap-4 mt-8 pt-6 border-t border-gray-700">
                {saveStatus === 'saved' && <p className="text-green-400 transition-opacity duration-300">Settings saved successfully!</p>}
                <button
                    onClick={handleResetChanges}
                    disabled={!hasChanges || saveStatus === 'saving'}
                    className="flex items-center bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                </button>
                <button
                    onClick={handleSaveChanges}
                    disabled={!hasChanges || saveStatus === 'saving'}
                    className="flex items-center bg-primary hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-md transition duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                    <Save className="w-4 h-4 mr-2" />
                    {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
};
