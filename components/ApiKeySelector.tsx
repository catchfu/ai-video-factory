
import React, { useState } from 'react';
import { KeyRound, ExternalLink } from 'lucide-react';

interface ApiKeySelectorProps {
  onKeySelected: () => void;
}

export const ApiKeySelector: React.FC<ApiKeySelectorProps> = ({ onKeySelected }) => {
  const [isOpening, setIsOpening] = useState(false);

  const handleSelectKey = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      setIsOpening(true);
      try {
        await window.aistudio.openSelectKey();
        // Assume success and trigger the parent component to re-check
        // This handles the race condition where hasSelectedApiKey might not be updated immediately
        onKeySelected();
      } catch (error) {
        console.error("Error opening API key selection:", error);
      } finally {
        setIsOpening(false);
      }
    } else {
      alert("API key selection is not available in this environment.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-96 bg-surface rounded-lg border border-gray-700 p-8 text-center shadow-lg">
      <KeyRound className="h-16 w-16 text-primary mb-4" />
      <h2 className="text-2xl font-bold mb-2">API Key Required</h2>
      <p className="text-gray-400 max-w-md mb-6">
        To generate videos with Veo, you need to select an API key associated with a project that has billing enabled.
      </p>
      <button
        onClick={handleSelectKey}
        disabled={isOpening}
        className="bg-primary hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-md transition duration-300 flex items-center disabled:bg-gray-500"
      >
        {isOpening ? 'Opening Dialog...' : 'Select Your API Key'}
      </button>
      <a 
        href="https://ai.google.dev/gemini-api/docs/billing" 
        target="_blank" 
        rel="noopener noreferrer"
        className="mt-4 text-sm text-gray-400 hover:text-primary transition flex items-center"
      >
        Learn more about billing
        <ExternalLink className="h-4 w-4 ml-1" />
      </a>
    </div>
  );
};
