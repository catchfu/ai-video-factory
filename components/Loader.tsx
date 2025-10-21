
import React from 'react';
import { Bot } from 'lucide-react';

interface LoaderProps {
  text?: string;
}

export const Loader: React.FC<LoaderProps> = ({ text }) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      <Bot className="h-8 w-8 text-primary animate-pulse-fast" />
      {text && <p className="text-sm text-gray-400">{text}</p>}
    </div>
  );
};
