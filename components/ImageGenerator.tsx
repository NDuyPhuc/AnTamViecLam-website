
import React, { useState } from 'react';
import { generateImage } from '../services/geminiService';
import PhotoIcon from './icons/PhotoIcon';
import SparklesIcon from './icons/SparklesIcon';
import ArrowRightIcon from './icons/ArrowRightIcon';
import { useTranslation } from 'react-i18next';

const ImageGenerator: React.FC = () => {
    const { t } = useTranslation();
    const [prompt, setPrompt] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        setLoading(true);
        setError('');
        setImage(null);

        try {
            const result = await generateImage(prompt);
            if (result) {
                setImage(result);
            } else {
                setError(t('common.error'));
            }
        } catch (err: any) {
            console.error("Generation failed:", err);
            setError(err.message || t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div className="text-center space-y-4">
                <div className="inline-block p-3 bg-pink-100 rounded-full mb-2">
                    <PhotoIcon className="w-8 h-8 text-pink-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-800">{t('ai_studio.title')}</h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                    {t('ai_studio.desc')}
                </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row">
                <div className="p-6 md:w-1/2 flex flex-col justify-center border-b md:border-b-0 md:border-r border-gray-200">
                    <form onSubmit={handleGenerate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                {t('ai_studio.prompt_label')}
                            </label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder={t('ai_studio.prompt_placeholder')}
                                rows={4}
                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all outline-none resize-none"
                            ></textarea>
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={loading || !prompt.trim()}
                            className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold py-3.5 rounded-xl hover:shadow-lg hover:shadow-pink-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    {t('ai_studio.generating')}
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="w-5 h-5" />
                                    {t('ai_studio.generate_btn')}
                                </>
                            )}
                        </button>
                    </form>
                    
                    {error && (
                        <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center">
                            {error}
                        </div>
                    )}
                </div>

                <div className="p-6 md:w-1/2 bg-gray-50 flex items-center justify-center min-h-[300px]">
                    {image ? (
                        <div className="relative group w-full max-w-sm">
                            <img src={image} alt="Generated" className="rounded-xl shadow-lg w-full h-auto object-cover" />
                            <a 
                                href={image} 
                                download={`ai-generated-${Date.now()}.png`}
                                className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm text-gray-800 font-bold py-2 px-4 rounded-lg shadow-sm hover:bg-white transition-opacity opacity-0 group-hover:opacity-100 flex items-center gap-2"
                            >
                                <ArrowRightIcon className="w-4 h-4" />
                                {t('public_profile.download_open')}
                            </a>
                        </div>
                    ) : (
                        <div className="text-center text-gray-400">
                            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                <PhotoIcon className="w-10 h-10 text-gray-300" />
                            </div>
                            <p>{t('ai_studio.placeholder')}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImageGenerator;
