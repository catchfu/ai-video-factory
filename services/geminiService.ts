
import { GoogleGenAI, Modality } from "@google/genai";
import type { AspectRatio } from '../types';

declare global {
  interface Window {
    // Papaparse is loaded from CDN
    Papa: any;
  }
}

// Helper to get a fresh AI client instance
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates a video using the Veo model.
 * @param prompt The text prompt for the video.
 * @param duration The desired duration of the video. (Note: Veo API doesn't directly support duration, this is for metadata)
 * @param aspectRatio The aspect ratio of the video.
 * @param onProgress Callback function to report progress.
 * @returns The generated video as a Blob.
 */
export const generateVideo = async (
  prompt: string,
  duration: number,
  aspectRatio: AspectRatio,
  onProgress: (message: string) => void,
): Promise<Blob> => {
  const ai = getAiClient();
  onProgress('Initializing video generation...');

  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio,
      }
    });
    onProgress('Video rendering started. This may take a few minutes...');

    const pollInterval = 10000; // 10 seconds
    let pollCount = 0;

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      pollCount++;
      const minutesElapsed = (pollCount * pollInterval) / 60000;
      onProgress(`Rendering in progress... (${minutesElapsed.toFixed(1)} min)`);
      operation = await ai.operations.getVideosOperation({ operation });
    }

    onProgress('Finalizing video...');
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
      throw new Error("Video generation completed, but no download link was found.");
    }

    onProgress('Downloading video...');
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!response.ok) {
        throw new Error(`Failed to download video: ${response.statusText}`);
    }

    const videoBlob = await response.blob();
    onProgress('Video generation successful!');
    return videoBlob;

  } catch (error) {
    if (error instanceof Error && error.message.includes('Requested entity was not found')) {
      throw new Error('API key not found or invalid. Please re-select your API key.');
    }
    console.error("Error generating video:", error);
    throw error;
  }
};


/**
 * Edits an image based on a text prompt.
 * @param base64Image The base64 encoded string of the source image.
 * @param mimeType The MIME type of the source image.
 * @param prompt The text prompt for the edit.
 * @returns A base64 encoded string of the edited image.
 */
export const editImage = async (base64Image: string, mimeType: string, prompt: string): Promise<string> => {
    if (!process.env.API_KEY) {
      throw new Error("API key is not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
          responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    
    throw new Error("No image was generated in the response.");
};
