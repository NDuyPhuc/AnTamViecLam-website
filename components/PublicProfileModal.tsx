
import React, { useState, useEffect } from 'react';
import type { UserData, Application } from '../types';
import { getUserProfile } from '../services/userService';
import Spinner from './Spinner';
import UserIcon from './icons/UserIcon';
import BriefcaseIcon from './icons/BriefcaseIcon';
import MapPinIcon from './icons/MapPinIcon';
import XIcon from './icons/XIcon';
import PaperAirplaneIcon from './icons/PaperAirplaneIcon';
import IdentificationIcon from './icons/IdentificationIcon';
import LightBulbIcon from './icons/LightBulbIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import ChatBubbleLeftRightIcon from './icons/ChatBubbleLeftRightIcon';
import { useTranslation } from 'react-i18next';

interface PublicProfileModalProps {
  userId: string;
  application?: Application;
  onClose: () => void;
  onStartChat?: () => void;
}

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode; className?: string }> = ({ icon, title, children, className = "" }) => (
    <div className={className}>
        <div className="flex items-center mb-3">
            <div className="w-8 h-8 flex items-center justify-center text-gray-500">{icon}</div>
            <h4 className="text-lg font-bold text-gray-800">{title}</h4>
        </div>
        <div className="pl-8">{children}</div>
    </div>
);


const PublicProfileModal: React.FC<PublicProfileModalProps> = ({ userId, application, onClose, onStartChat }) => {
    const { t } = useTranslation();
    const [profile, setProfile] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showPdfPreview, setShowPdfPreview] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            setError('');
            try {
                const userProfile = await getUserProfile(userId);
                if (userProfile) {
                    setProfile(userProfile);
                    if (userProfile.cvUrl && userProfile.cvUrl.toLowerCase().endsWith('.pdf')) {
                        setShowPdfPreview(true);
                    }
                } else {
                    setError('Không tìm thấy hồ sơ người dùng.');
                }
            } catch (err) {
                console.error(err);
                setError(t('common.error'));
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [userId]);

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-60 z-[100] flex justify-center items-center p-4 animate-fade-in"
            style={{ animationDuration: '0.2s' }}
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div
                className="bg-gray-50 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden relative animate-fade-in-up flex flex-col h-[90vh]"
                style={{ animationDuration: '0.3s' }}
                onClick={(e) => e.stopPropagation()}
            >
                {loading && <Spinner message={t('common.loading')} />}
                {error && <div className="p-8 text-center text-red-500">{error}</div>}
                
                {!loading && profile && (
                    <>
                        {/* Header */}
                        <div className="p-6 bg-white border-b">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center space-x-4">
                                    {profile.profileImageUrl ? (
                                        <img src={profile.profileImageUrl} alt={profile.fullName || "User"} className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-md"/>
                                    ) : (
                                        <UserIcon className="w-20 h-20"/>
                                    )}
                                    <div>
                                        <h2 className="text-3xl font-bold text-gray-800">{profile.fullName}</h2>
                                        {profile.address && (
                                            <div className="flex items-center text-gray-500 mt-1">
                                                <MapPinIcon className="w-4 h-4 mr-1.5"/>
                                                <p>{profile.address}</p>
                                            </div>
                                        )}
                                        
                                        {(application?.contactPhoneNumber || profile.phoneNumber) && (
                                            <p className="text-sm text-gray-600 mt-1">
                                                {t('public_profile.contact_info')}: <span className="font-medium">{application?.contactPhoneNumber || profile.phoneNumber}</span>
                                            </p>
                                        )}
                                         {profile.email && (
                                            <p className="text-sm text-gray-600">
                                                Email: {profile.email}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                                    aria-label={t('common.close')}
                                >
                                    <XIcon className="w-6 h-6" />
                                </button>
                            </div>
                            {onStartChat && (
                                <div className="mt-4 flex justify-end">
                                    <button
                                        onClick={onStartChat}
                                        className="flex items-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                                    >
                                        <PaperAirplaneIcon className="w-5 h-5 mr-2"/>
                                        {t('public_profile.message')}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Body */}
                        <div className="flex-grow p-6 sm:p-8 overflow-y-auto space-y-8">
                             
                             {application && (application.introduction) && (
                                <Section 
                                    icon={<ChatBubbleLeftRightIcon className="w-6 h-6 text-indigo-600"/>} 
                                    title={t('public_profile.application_info')}
                                    className="bg-indigo-50 p-4 rounded-xl border border-indigo-100"
                                >
                                    <div className="space-y-2">
                                        {application.introduction && (
                                            <div>
                                                <p className="text-xs font-bold text-indigo-800 uppercase mb-1">{t('public_profile.candidate_note')}</p>
                                                <p className="text-gray-700 italic">"{application.introduction}"</p>
                                            </div>
                                        )}
                                    </div>
                                </Section>
                             )}


                             {/* CV Section */}
                             {profile.cvUrl && (
                                <Section icon={<DocumentTextIcon className="w-6 h-6"/>} title={t('public_profile.cv_title')}>
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-3">
                                             <a 
                                                href={profile.cvUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors shadow-sm"
                                            >
                                                <DocumentTextIcon className="w-5 h-5 mr-2" />
                                                <span className="font-medium">{t('public_profile.download_open')}</span>
                                            </a>
                                            {profile.cvUrl.toLowerCase().endsWith('.pdf') && (
                                                 <button
                                                    onClick={() => setShowPdfPreview(!showPdfPreview)}
                                                    className="text-sm text-gray-500 underline hover:text-indigo-600"
                                                 >
                                                     {showPdfPreview ? t('public_profile.hide_preview') : t('public_profile.quick_preview')}
                                                 </button>
                                            )}
                                        </div>

                                        {showPdfPreview && profile.cvUrl && (
                                            <div className="w-full h-[500px] border rounded-lg overflow-hidden bg-gray-100 mt-2 relative group">
                                                <iframe 
                                                    src={profile.cvUrl} 
                                                    className="w-full h-full" 
                                                    title="CV Preview"
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-gray-50 opacity-0 group-hover:opacity-0 transition-opacity">
                                                    <p className="text-gray-500">{t('public_profile.loading_preview')}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </Section>
                            )}

                            {profile.bio && (
                                <Section icon={<IdentificationIcon className="w-6 h-6"/>} title={t('public_profile.intro')}>
                                    <p className="text-gray-600 whitespace-pre-wrap">{profile.bio}</p>
                                </Section>
                            )}

                             {profile.skills && profile.skills.length > 0 && (
                                <Section icon={<LightBulbIcon className="w-6 h-6"/>} title={t('public_profile.skills')}>
                                    <div className="flex flex-wrap gap-2">
                                        {profile.skills.map(skill => (
                                            <span key={skill} className="bg-indigo-100 text-indigo-800 text-sm font-medium px-3 py-1.5 rounded-full">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </Section>
                            )}
                            
                            {profile.workHistory && profile.workHistory.length > 0 && (
                                <Section icon={<BriefcaseIcon className="w-6 h-6"/>} title={t('public_profile.work_history')}>
                                     <div className="space-y-4">
                                        {profile.workHistory.map((work, index) => (
                                            <div key={index} className="p-4 bg-white rounded-lg border">
                                                <h5 className="font-bold text-gray-800">{work.title}</h5>
                                                <p className="text-sm text-gray-600">{work.company}</p>
                                                <p className="text-xs text-gray-500 mt-1">{work.duration}</p>
                                            </div>
                                        ))}
                                    </div>
                                </Section>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default PublicProfileModal;
