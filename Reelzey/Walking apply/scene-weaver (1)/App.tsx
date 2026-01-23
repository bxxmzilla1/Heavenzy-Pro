
import React, { useState, useCallback } from 'react';
import { MOODS, CAMERA_VIEWS } from './constants';
import { Mood, Duration, CameraView } from './types';
import { enhancePrompt as enhancePromptApi, generateScene as generateSceneApi } from './services/geminiService';
import ImageUploader from './components/ImageUploader';
import MoodSelector from './components/MoodSelector';
import CameraViewSelector from './components/CameraViewSelector';
import PromptInput from './components/PromptInput';
import DurationSelector from './components/DurationSelector';
import SceneDisplay from './components/SceneDisplay';
import { SparklesIcon, FilmIcon } from './components/icons';

export default function App() {
  const [image, setImage] = useState<{ file: File; base64: string } | null>(null);
  const [mood, setMood] = useState<Mood | null>(null);
  const [cameraView, setCameraView] = useState<CameraView | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [duration, setDuration] = useState<Duration>(5);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingAction, setLoadingAction] = useState<string>('');
  const [generatedScene, setGeneratedScene] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage({ file, base64: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleEnhancePrompt = useCallback(async () => {
    if (!prompt) {
      setError('Please enter a prompt to enhance.');
      return;
    }
    setIsLoading(true);
    setLoadingAction('Enhancing prompt...');
    setError(null);
    try {
      const enhanced = await enhancePromptApi(prompt);
      setPrompt(enhanced);
    } catch (e) {
      setError('Failed to enhance prompt. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
      setLoadingAction('');
    }
  }, [prompt]);

  const handleGenerateScene = useCallback(async () => {
    if (!image || !mood || !cameraView) {
      setError('Please upload an image, select a mood, and choose a camera view.');
      return;
    }
    setIsLoading(true);
    setLoadingAction('Generating scene...');
    setError(null);
    setGeneratedScene('');

    try {
      const imagePart = {
        mimeType: image.file.type,
        data: image.base64.split(',')[1],
      };
      const scene = await generateSceneApi(imagePart, mood, cameraView, duration, prompt);
      setGeneratedScene(scene);
    } catch (e) {
      setError('Failed to generate scene. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
      setLoadingAction('');
    }
  }, [image, mood, cameraView, duration, prompt]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <header className="w-full max-w-5xl text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          Scene Weaver
        </h1>
        <p className="text-lg text-gray-400 mt-2">
          Craft vivid video scenes from your photos and imagination.
        </p>
      </header>

      <main className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex flex-col space-y-6 bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700">
          <ImageUploader onImageUpload={handleImageUpload} imagePreview={image?.base64 || null} />
          
          <MoodSelector moods={MOODS} selectedMood={mood} onSelectMood={setMood} />
          
          <CameraViewSelector views={CAMERA_VIEWS} selectedView={cameraView} onSelectView={setCameraView} />

          <PromptInput
            prompt={prompt}
            onPromptChange={setPrompt}
            onEnhance={handleEnhancePrompt}
            isDisabled={isLoading}
          />
          
          <DurationSelector selectedDuration={duration} onSelectDuration={setDuration} />

          <button
            onClick={handleGenerateScene}
            disabled={isLoading || !image || !mood || !cameraView}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:from-purple-600 hover:to-pink-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-purple-500"
          >
            {isLoading && loadingAction === 'Generating scene...' ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {loadingAction}
              </>
            ) : (
               <>
                <FilmIcon />
                Generate Scene
               </>
            )}
          </button>

          {error && <p className="text-red-400 text-center">{error}</p>}
        </div>

        <div className="bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700">
          <SceneDisplay
            scene={generatedScene}
            isLoading={isLoading && loadingAction === 'Generating scene...'}
          />
        </div>
      </main>
    </div>
  );
}
