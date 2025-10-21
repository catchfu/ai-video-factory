
import React, { useState, useCallback } from 'react';
import { ImagePlus, Wand, Scissors } from 'lucide-react';
import { editImage } from '../services/geminiService';
import { blobToBase64 } from '../utils/helpers';
import { Loader } from './Loader';

export const ImageEditor: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<{ url: string; file: File } | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setOriginalImage({ url: URL.createObjectURL(file), file });
      setEditedImage(null);
      setError(null);
    }
  };

  const handleGenerateEdit = useCallback(async () => {
    if (!originalImage || !prompt.trim()) {
      setError("Please upload an image and provide an edit prompt.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setEditedImage(null);

    try {
      const base64Image = await blobToBase64(originalImage.file);
      const newImageBase64 = await editImage(base64Image, originalImage.file.type, prompt);
      setEditedImage(`data:image/png;base64,${newImageBase64}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [originalImage, prompt]);

  return (
    <div className="bg-surface p-6 rounded-lg border border-gray-700 shadow-lg">
      <h2 className="text-2xl font-bold mb-4 flex items-center"><Scissors className="mr-2 text-primary" /> AI Image Editor</h2>
      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* Input and controls */}
        <div className="space-y-4">
          <div className="w-full h-64 bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center text-gray-400">
            {originalImage ? (
              <img src={originalImage.url} alt="Original" className="max-w-full max-h-full object-contain rounded-md" />
            ) : (
              <div className="text-center">
                <ImagePlus size={48} className="mx-auto" />
                <p>Upload an image to start editing</p>
              </div>
            )}
          </div>
          <label className="block w-full text-center bg-primary hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-md cursor-pointer transition">
            {originalImage ? 'Change Image' : 'Upload Image'}
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Add a retro filter, remove the person in the background, make it look like a painting..."
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-md focus:ring-2 focus:ring-primary focus:border-primary transition duration-200 resize-none"
            rows={3}
            disabled={!originalImage}
          />
          <button 
            onClick={handleGenerateEdit} 
            disabled={!originalImage || isLoading}
            className="w-full flex justify-center items-center bg-secondary hover:bg-pink-500 text-white font-bold py-3 px-4 rounded-md transition duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed">
            <Wand className="mr-2" /> {isLoading ? 'Editing...' : 'Apply AI Edit'}
          </button>
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        </div>

        {/* Output */}
        <div className="w-full h-auto min-h-[20rem] bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center text-gray-400 p-2">
          {isLoading && <Loader text="Generating your masterpiece..." />}
          {!isLoading && editedImage && (
            <img src={editedImage} alt="Edited" className="max-w-full max-h-full object-contain rounded-md" />
          )}
          {!isLoading && !editedImage && (
            <div className="text-center">
              <Wand size={48} className="mx-auto" />
              <p>Your edited image will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
