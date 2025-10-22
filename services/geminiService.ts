import { GoogleGenAI, Modality } from "@google/genai";
import type { AspectRatio, TTSVoice } from '../types';
import { decode, createWavBlob } from '../utils/helpers';


declare global {
  interface Window {
    // Papaparse is loaded from CDN
    Papa: any;
  }
}

// Helper to get a fresh AI client instance
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates a script, voiceover, and subtitles for a video.
 */
const generateNarration = async (
  prompt: string,
  duration: number,
  voice: TTSVoice,
  onProgress: (message: string) => void,
): Promise<{ audioBlob: Blob; vttContent: string }> => {
    const ai = getAiClient();

    onProgress('Generating script...');
    const scriptResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Create a short, engaging voiceover script of about ${duration} seconds for a video about: "${prompt}". The script should be concise, direct, and engaging for viewers.`,
    });
    const script = scriptResponse.text;

    onProgress('Generating subtitles...');
    const vttResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Convert the following script into a WebVTT format. The total duration is ${duration} seconds. Create several cues with appropriate start and end times that break up the script naturally.\n\nSCRIPT:\n${script}`,
    });
    let vttContent = vttResponse.text.trim().replace(/```vtt\n|```/g, '');
    if (!vttContent.startsWith('WEBVTT')) {
        vttContent = 'WEBVTT\n\n' + vttContent;
    }

    onProgress('Generating voiceover...');
    const ttsResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: script }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
        },
    });
    const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("TTS generation failed.");
    
    const pcmDataBytes = decode(base64Audio);
    // The audio data is 16-bit PCM, so create an Int16Array view on the buffer
    const pcmDataInt16 = new Int16Array(pcmDataBytes.buffer);
    // The TTS model sample rate is 24kHz, and it's mono (1 channel)
    const audioBlob = createWavBlob(pcmDataInt16, 24000, 1);

    return { audioBlob, vttContent };
};


/**
 * Generates a video using the Veo model or a no-cost fallback.
 * @param prompt The text prompt for the video.
 * @param duration The desired duration of the video.
 * @param aspectRatio The aspect ratio of the video.
 * @param voice The selected TTS voice for the voiceover.
 * @param onProgress Callback function to report progress.
 * @returns An object containing the video blob and optional audio/VTT for fallbacks.
 */
export const generateVideo = async (
  prompt: string,
  duration: number,
  aspectRatio: AspectRatio,
  voice: TTSVoice,
  onProgress: (message: string) => void,
): Promise<{ videoBlob: Blob; audioBlob?: Blob; vttContent?: string; isFallback: boolean; }> => {
  const ai = getAiClient();
  onProgress('Initializing video generation...');
  let audioBlob: Blob | undefined;
  let vttContent: string | undefined;

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

    const pollInterval = 10000;
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
    
    if (voice !== 'none') {
        const narration = await generateNarration(prompt, duration, voice, onProgress);
        audioBlob = narration.audioBlob;
        vttContent = narration.vttContent;
    }
    
    onProgress('Video generation successful!');
    return { videoBlob, audioBlob, vttContent, isFallback: false };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.toLowerCase().includes('quota')) {
        onProgress('Quota limit reached. Generating no-cost fallback...');
        
        if (voice !== 'none') {
            const narration = await generateNarration(prompt, duration, voice, onProgress);
            audioBlob = narration.audioBlob;
            vttContent = narration.vttContent;
        }

        onProgress('Fetching stock footage...');
        const sampleVideoUrl = 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4';
        const response = await fetch(sampleVideoUrl);
        if (!response.ok) throw new Error('Failed to load sample video.');
        const videoBlob = await response.blob();

        onProgress('Fallback video compiled successfully!');
        return { videoBlob, audioBlob, vttContent, isFallback: true };
    }

    if (errorMessage.includes('Requested entity was not found')) {
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