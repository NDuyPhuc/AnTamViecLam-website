
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import GlobeIcon from './icons/GlobeIcon';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'zh', label: '中文', flag: '🇨🇳' },
  ];

  const currentLanguage = languages.find(l => l.code === i18n.language) || languages[0];

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-200 outline-none select-none ${
            isOpen 
            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' 
            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900'
        }`}
      >
        <GlobeIcon className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-12 scale-110' : ''}`} />
        <span className="text-sm font-bold tracking-wide leading-none pt-0.5">{currentLanguage.code.toUpperCase()}</span>
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 opacity-50 transition-transform duration-200 ml-0.5 ${isOpen ? 'rotate-180 text-indigo-700' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-gray-100 p-1.5 z-50 animate-fade-in-down origin-top-right">
          <div className="space-y-0.5">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`flex items-center justify-between w-full px-3 py-2.5 text-sm rounded-xl transition-all duration-200 group ${
                  currentLanguage.code === lang.code 
                    ? 'bg-indigo-50 text-indigo-700 font-bold' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                    <span className="text-lg leading-none filter drop-shadow-sm select-none group-hover:scale-110 transition-transform">{lang.flag}</span>
                    <span>{lang.label}</span>
                </div>
                {currentLanguage.code === lang.code && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
