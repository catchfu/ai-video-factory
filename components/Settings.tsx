
import React from 'react';
import type { SubtitleSettings } from '../types';
import { Palette, ToggleLeft, ToggleRight, Type } from 'lucide-react';

interface SettingsComponentProps {
    settings: SubtitleSettings;
    onSettingsChange: (newSettings: SubtitleSettings) => void;
}

export const SettingsComponent: React.FC<SettingsComponentProps> = ({ settings, onSettingsChange }) => {
    
    const handleToggle = () => {
        onSettingsChange({ ...settings, enabled: !settings.enabled });
    };

    const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onSettingsChange({ ...settings, [e.target.name]: e.target.value });
    };

    return (
        <div className="bg-surface p-6 rounded-lg border border-gray-700 shadow-lg max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Subtitle Settings</h2>
            <div className="space-y-6">
                {/* Subtitle Visibility Toggle */}
                <div className="flex items-center justify-between">
                    <label className="text-lg font-medium text-on-surface flex items-center">
                        {settings.enabled ? <ToggleRight className="mr-3 h-6 w-6 text-primary" /> : <ToggleLeft className="mr-3 h-6 w-6 text-gray-500" />}
                        Show Subtitles by Default
                    </label>
                    <button
                        onClick={handleToggle}
                        className={`w-20 text-center px-4 py-2 rounded-md font-semibold transition-colors ${
                            settings.enabled ? 'bg-primary text-white' : 'bg-gray-600 text-gray-300'
                        }`}
                    >
                        {settings.enabled ? 'On' : 'Off'}
                    </button>
                </div>

                {/* Text Color Picker */}
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
                            value={settings.textColor}
                            onChange={handleValueChange}
                            className="w-10 h-10 p-0 border-none rounded cursor-pointer bg-transparent appearance-none [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-md"
                        />
                        <input 
                            type="text"
                            value={settings.textColor}
                            onChange={handleValueChange}
                            name="textColor"
                            className="w-24 bg-gray-700 p-2 rounded-md font-mono text-sm"
                        />
                    </div>
                </div>

                {/* Background Color Picker */}
                <div className="flex items-center justify-between">
                    <label htmlFor="backgroundColor" className="text-lg font-medium text-on-surface flex items-center">
                       <Palette className="mr-3 h-5 w-5 text-gray-400" />
                        Background Color
                    </label>
                     <div className="flex items-center space-x-3 p-1 bg-gray-800 border border-gray-600 rounded-md">
                        {/* A hack to show a color preview for RGBA */}
                        <div className="w-10 h-10 rounded-md border border-gray-500" style={{ backgroundColor: settings.backgroundColor }}></div>
                        <input
                            type="text"
                            id="backgroundColor"
                            name="backgroundColor"
                            value={settings.backgroundColor}
                            onChange={handleValueChange}
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
    );
};
