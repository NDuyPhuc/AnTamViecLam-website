
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { uploadFile } from '../services/cloudinaryService';
import { submitKycRequest } from '../services/userService';
import { useAuth } from '../contexts/AuthContext';
import XIcon from './icons/XIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import IdentificationIcon from './icons/IdentificationIcon';
import { useTranslation } from 'react-i18next';

interface KycModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const KycModal: React.FC<KycModalProps> = ({ onClose, onSuccess }) => {
    const { t } = useTranslation();
    const { currentUser } = useAuth();
    const [step, setStep] = useState(1); // 1: Info, 2: Upload Front, 3: Upload Back, 4: Upload Portrait, 5: Submit
    const [images, setImages] = useState<string[]>(['', '', '']); // [front, back, portrait]
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const steps = [
        { 
            title: t('kyc.step_1_title'), 
            desc: t('kyc.step_1_desc'),
            icon: <IdentificationIcon className="w-16 h-16 text-indigo-500" />
        },
        { 
            title: t('kyc.step_2_title'), 
            desc: t('kyc.step_2_desc'), 
            index: 0 
        },
        { 
            title: t('kyc.step_3_title'), 
            desc: t('kyc.step_3_desc'), 
            index: 1 
        },
        { 
            title: t('kyc.step_4_title'), 
            desc: t('kyc.step_4_desc'), 
            index: 2 
        }
    ];

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploading(true);
            try {
                const url = await uploadFile(file);
                const newImages = [...images];
                // Step 2 maps to index 0, Step 3 -> 1, Step 4 -> 2
                const imageIndex = step - 2; 
                newImages[imageIndex] = url;
                setImages(newImages);
                // Auto advance after upload
                if (step < 4) {
                    setStep(step + 1);
                } else {
                    // Reached end of uploads
                    setStep(5);
                }
            } catch (error) {
                alert(t('common.error'));
            } finally {
                setUploading(false);
                // Reset value to allow re-uploading same file if needed
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        }
    };

    const handleSubmit = async () => {
        if (!currentUser) return;
        setUploading(true);
        try {
            await submitKycRequest(currentUser.uid, images);
            onSuccess();
            // Don't close immediately here, onSuccess usually triggers refetch/alert
        } catch (error) {
            console.error(error);
            alert(t('common.error'));
        } finally {
            setUploading(false);
        }
    };

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop with blur */}
            <div 
                className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" 
                onClick={onClose}
                aria-hidden="true"
            ></div>

            {/* Modal Card */}
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 animate-fade-in-up flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-20">
                    <h2 className="text-lg font-bold text-gray-800">{t('kyc.title')}</h2>
                    <button 
                        onClick={onClose} 
                        className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
                    >
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {/* Progress Bar */}
                    <div className="flex gap-2 mb-8 justify-center">
                        {[1, 2, 3, 4, 5].map(s => (
                            <div 
                                key={s} 
                                className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                                    s <= step ? 'bg-indigo-600' : 'bg-gray-200'
                                }`}
                            ></div>
                        ))}
                    </div>

                    {step === 1 && (
                        <div className="space-y-6 text-center">
                            <div className="flex justify-center py-4">
                                <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center animate-bounce-slow">
                                    {steps[0].icon}
                                </div>
                            </div>
                            
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">{steps[0].title}</h3>
                                <p className="text-gray-600 leading-relaxed">{steps[0].desc}</p>
                            </div>

                            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-sm text-yellow-800 text-left">
                                <strong className="block mb-2 text-yellow-900">{t('kyc.note_title')}</strong>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>{t('kyc.note_1')}</li>
                                    <li>{t('kyc.note_2')}</li>
                                    <li>{t('kyc.note_3')}</li>
                                </ul>
                            </div>

                            <button 
                                onClick={() => setStep(2)}
                                className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-[0.98]"
                            >
                                {t('kyc.start_btn')}
                            </button>
                        </div>
                    )}

                    {step >= 2 && step <= 4 && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-gray-900 mb-2">{steps[step - 1].title}</h3>
                                <p className="text-gray-500 text-sm">{steps[step - 1].desc}</p>
                            </div>

                            <div 
                                className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl h-64 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500 hover:bg-indigo-50/50 transition-all cursor-pointer"
                                onClick={() => !uploading && fileInputRef.current?.click()}
                            >
                                {images[step - 2] ? (
                                    <>
                                        <img src={images[step - 2]} className="w-full h-full object-contain p-2" alt="Preview" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-white font-medium bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm">{t('kyc.retake')}</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-gray-400 flex flex-col items-center gap-3 p-4 text-center">
                                        <div className="p-4 bg-white rounded-full shadow-sm">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                        <span className="font-medium">{t('kyc.upload_hint')}</span>
                                    </div>
                                )}
                                
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden"
                                    onChange={handleFileChange}
                                    ref={fileInputRef}
                                    capture="environment" // Prefer rear camera on mobile
                                />
                                
                                {uploading && (
                                    <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center z-10">
                                        <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full mb-3"></div>
                                        <span className="text-indigo-600 font-medium animate-pulse">{t('kyc.uploading')}</span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex justify-center">
                                <button
                                    onClick={() => setStep(step - 1)}
                                    className="text-gray-500 hover:text-gray-800 font-medium text-sm py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    {t('kyc.back')}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="space-y-8 text-center">
                            <div>
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 mb-4 animate-[bounce_1s_infinite]">
                                    <CheckCircleIcon className="w-10 h-10" />
                                </div>
                                <h3 className="font-bold text-xl text-gray-800">{t('kyc.completed_title')}</h3>
                                <p className="text-gray-500 text-sm mt-2">{t('kyc.completed_desc')}</p>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                {images.map((img, i) => (
                                    <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200">
                                        <img src={img} className="w-full h-full object-cover" alt={`KYC ${i}`} />
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] py-1">
                                            {i === 0 ? t('kyc.label_front') : i === 1 ? t('kyc.label_back') : t('kyc.label_portrait')}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button 
                                    onClick={() => { setStep(2); setImages(['', '', '']); }}
                                    className="flex-1 bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    {t('kyc.retry')}
                                </button>
                                <button 
                                    onClick={handleSubmit}
                                    disabled={uploading}
                                    className="flex-[2] bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-md"
                                >
                                    {uploading ? t('kyc.sending') : t('kyc.submit')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    // Using createPortal to attach the modal to the body, avoiding z-index issues with parent components
    return createPortal(modalContent, document.body);
};

export default KycModal;
