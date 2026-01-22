
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import trực tiếp từ file TS để tránh lỗi loader JSON và alias path
import vi from './locales/vi';
import en from './locales/en';
import zh from './locales/zh';

i18n
  // Detect user language
  // learn more: https://github.com/i18next/i18next-browser-languagedetector
  .use(LanguageDetector)
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  // for all options read: https://www.i18next.com/overview/configuration-options
  .init({
    debug: true,
    fallbackLng: 'vi',
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    resources: {
      vi: {
        translation: vi
      },
      en: {
        translation: en
      },
      zh: {
        translation: zh
      }
    }
  });

export default i18n;
