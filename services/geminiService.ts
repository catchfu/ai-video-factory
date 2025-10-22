import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { AspectRatio, GenerationLanguage, TTSVoice } from '../types';
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
 * Generates a script from a prompt.
 */
export const generateScript = async (
  prompt: string,
  duration: number,
  language: GenerationLanguage
): Promise<string> => {
    const ai = getAiClient();
    const scriptLanguage = language === 'zh' ? 'Mandarin Chinese' : 'English';
    const scriptResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Create a short, engaging voiceover script in ${scriptLanguage} for a video about: "${prompt}". The script should take approximately ${duration} seconds to read aloud at a natural pace. Return only the script text, without any labels, titles, or markdown formatting.`,
    });
    return scriptResponse.text.trim();
};


/**
 * Finds a stock video from Pexels or Pixabay based on a prompt.
 */
const findStockVideo = async (
  prompt: string, 
  pexelsApiKey?: string, 
  pixabayApiKey?: string
): Promise<string | null> => {
    const ai = getAiClient();
    try {
        const keywordsResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Extract the 2-3 most relevant keywords from this prompt for a video search. Return them as a single, URL-encoded string (e.g., "futuristic%20city%20neon").\n\nPROMPT: "${prompt}"`,
        });
        const query = keywordsResponse.text.trim();

        if (pexelsApiKey) {
            const pexelsUrl = `https://api.pexels.com/videos/search?query=${query}&per_page=1&orientation=portrait`;
            const pexelsResponse = await fetch(pexelsUrl, { headers: { 'Authorization': pexelsApiKey } });
            if (pexelsResponse.ok) {
                const pexelsData = await pexelsResponse.json();
                const video = pexelsData.videos?.[0];
                if (video) {
                    // Find a suitable MP4 file, preferably lower resolution for faster processing
                    const videoFile = video.video_files.find((f: any) => f.quality === 'sd' && f.file_type === 'video/mp4') 
                                   || video.video_files.find((f: any) => f.file_type === 'video/mp4');
                    if (videoFile) return videoFile.link;
                }
            }
        }

        if (pixabayApiKey) {
            const pixabayUrl = `https://pixabay.com/api/videos/?key=${pixabayApiKey}&q=${query}&per_page=3&orientation=vertical`;
            const pixabayResponse = await fetch(pixabayUrl);
            if (pixabayResponse.ok) {
                const pixabayData = await pixabayResponse.json();
                const video = pixabayData.hits?.[0];
                // Find a suitable MP4 file, preferring medium quality
                if (video?.videos?.medium?.url) return video.videos.medium.url;
            }
        }
    } catch (error) {
        console.error("Error finding stock video:", error);
    }
    return null;
};


/**
 * Generates voiceover and subtitles from a given script.
 */
const generateNarrationFromScript = async (
  script: string,
  duration: number,
  voice: TTSVoice,
  language: GenerationLanguage,
  onProgress: (message: string) => void,
): Promise<{ audioBlob: Blob; vttContent: string }> => {
    const ai = getAiClient();
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
    const pcmDataInt16 = new Int16Array(pcmDataBytes.buffer);
    const audioBlob = createWavBlob(pcmDataInt16, 24000, 1);

    return { audioBlob, vttContent };
};

const generateScenesFromScript = async (script: string, duration: number): Promise<{ scenes: { scene_description: string; narration: string }[] }> => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: `
          You are a creative video director. Based on the following script for a video that is approximately ${duration} seconds long, break it down into a series of distinct scenes.
          For each scene, provide a concise visual description (for finding stock footage) and identify the corresponding narration for that scene.
          SCRIPT: "${script}"
          Return the output as a valid JSON object with a single key "scenes". "scenes" should be an array of objects, where each object has two keys: "scene_description" and "narration".
          Ensure the "narration" parts, when combined, exactly match the original script.
        `,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              scenes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    scene_description: { type: Type.STRING, description: 'A visual description of the scene for a stock video search.' },
                    narration: { type: Type.STRING, description: 'The voiceover script for this specific scene.' },
                  },
                  required: ['scene_description', 'narration'],
                }
              }
            },
            required: ['scenes'],
          }
        }
    });
    const parsed = JSON.parse(response.text);
    return { scenes: parsed.scenes };
};

const generateMultiClipFallback = async (
    script: string,
    duration: number,
    voice: TTSVoice,
    language: GenerationLanguage,
    apiKeys: { pexelsApiKey: string; pixabayApiKey: string },
    onProgress: (message: string) => void
) => {
    onProgress('Breaking script into scenes...');
    const { scenes } = await generateScenesFromScript(script, duration);

    let audioBlob: Blob | undefined;
    let vttContent: string | undefined;

    if (voice !== 'none') {
        const narration = await generateNarrationFromScript(script, duration, voice, language, onProgress);
        audioBlob = narration.audioBlob;
        vttContent = narration.vttContent;
    }

    onProgress(`Searching for ${scenes.length} video clips...`);
    const videoUrlPromises = scenes.map(scene => findStockVideo(scene.scene_description, apiKeys.pexelsApiKey, apiKeys.pixabayApiKey));
    const resolvedVideoUrls = await Promise.all(videoUrlPromises);
    
    const genericFallback = 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4';
    const videoUrls = resolvedVideoUrls.map(url => url || genericFallback);

    onProgress('Multi-clip video compiled!');
    return { videoUrls, audioBlob, vttContent, isFallback: true, isStitched: true };
};


/**
 * Generates a video using the Veo model or a no-cost fallback.
 */
export const generateVideo = async (
  prompt: string,
  script: string,
  duration: number,
  aspectRatio: AspectRatio,
  voice: TTSVoice,
  language: GenerationLanguage,
  apiKeys: { pexelsApiKey: string, pixabayApiKey: string },
  onProgress: (message: string) => void,
): Promise<{ 
    videoBlob?: Blob; 
    videoUrls?: string[];
    isStitched?: boolean;
    audioBlob?: Blob; 
    vttContent?: string; 
    isFallback: boolean; 
}> => {
  const ai = getAiClient();
  onProgress('Initializing video generation...');
  
  let finalScript = script;
  if (!finalScript && voice !== 'none') {
      onProgress('Generating script...');
      finalScript = await generateScript(prompt, duration, language);
  }

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
    let audioBlob: Blob | undefined;
    let vttContent: string | undefined;
    
    if (voice !== 'none' && finalScript) {
        const narration = await generateNarrationFromScript(finalScript, duration, voice, language, onProgress);
        audioBlob = narration.audioBlob;
        vttContent = narration.vttContent;
    }
    
    onProgress('Video generation successful!');
    return { videoBlob, audioBlob, vttContent, isFallback: false, isStitched: false };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('billing')) {
        onProgress('Primary generation failed. Creating enhanced fallback...');
        if (!finalScript) throw new Error("Cannot generate fallback without a script.");
        return await generateMultiClipFallback(finalScript, duration, voice, language, apiKeys, onProgress);
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