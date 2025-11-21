
import React, { useState, useEffect } from 'react';
import type { UserData } from '../types';
import { getUserProfile } from '../services/userService';
import Spinner from './Spinner';
import UserIcon from './icons/UserIcon';
import BriefcaseIcon from './icons/BriefcaseIcon';
import MapPinIcon from './icons/MapPinIcon';
import XIcon from './icons/XIcon';
import PaperAirplaneIcon from './icons/PaperAirplaneIcon';
import IdentificationIcon from './icons/IdentificationIcon';
import LightBulbIcon from './icons/LightBulbIcon';
import DocumentTextIcon from './icons/DocumentTextIcon'; // Import DocumentTextIcon

interface PublicProfileModalProps {
  userId: string;
  onClose: () => void;
  onStartChat?: () => void; // Optional: only available if employer has received an application
}

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div>
        <div className="flex items-center mb-3">
            <div className="w-8 h-8 flex items-center justify-center text-gray-500">{icon}</div>
            <h4 className="text-lg font-bold text-gray-800">{title}</h4>
        </div>
        <div className="pl-8">{children}</div>
    </div>
);


const PublicProfileModal: React.FC<PublicProfileModalProps> = ({ userId, onClose, onStartChat }) => {
    const [profile, setProfile] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            setError('');
            try {
                const userProfile = await getUserProfile(userId);
                if (userProfile) {
                    setProfile(userProfile);
                } else {
                    setError('Không tìm thấy hồ sơ người dùng.');
                }
            } catch (err) {
                console.error(err);
                setError('Đã xảy ra lỗi khi tải hồ sơ.');
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
                {loading && <Spinner message="Đang tải hồ sơ..." />}
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
                                        {/* Display Phone Number if available (Visible to employer/authorized viewer) */}
                                        {profile.phoneNumber && (
                                            <p className="text-sm text-gray-600 mt-1">
                                                SĐT: <span className="font-medium">{profile.phoneNumber}</span>
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
                                    aria-label="Đóng"
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
                                        Nhắn tin
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Body */}
                        <div className="flex-grow p-6 sm:p-8 overflow-y-auto space-y-8">
                             {/* CV Download Section */}
                             {profile.cvUrl && (
                                <Section icon={<DocumentTextIcon className="w-6 h-6"/>} title="Hồ sơ đính kèm">
                                    <a 
                                        href={profile.cvUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors shadow-sm"
                                    >
                                        <DocumentTextIcon className="w-5 h-5 mr-2" />
                                        <span className="font-medium">{profile.cvName || 'Tải xuống CV / Hồ sơ năng lực'}</span>
                                    </a>
                                </Section>
                            )}

                            {profile.bio && (
                                <Section icon={<IdentificationIcon className="w-6 h-6"/>} title="Giới thiệu">
                                    <p className="text-gray-600 whitespace-pre-wrap">{profile.bio}</p>
                                </Section>
                            )}

                             {profile.skills && profile.skills.length > 0 && (
                                <Section icon={<LightBulbIcon className="w-6 h-6"/>} title="Kỹ năng">
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
                                <Section icon={<BriefcaseIcon className="w-6 h-6"/>} title="Lịch sử làm việc">
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
