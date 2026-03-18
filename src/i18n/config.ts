import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './locales/en.json';
import ta from './locales/ta.json';

const LANGUAGE_KEY = '@thamili:language';

// Initialize i18n
i18n
  .use(initReactI18next)
  .init({
    // @ts-ignore - i18next types may not match exactly
    compatibilityJSON: 'v3',
    resources: {
      en: { translation: en },
      ta: { translation: ta },
    },
    lng: 'en', // Default language - English only
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false,
    },
  });

// Load saved language preference on initialization
AsyncStorage.getItem(LANGUAGE_KEY)
  .then((savedLanguage) => {
    if (savedLanguage) {
      i18n.changeLanguage(savedLanguage);
    }
  })
  .catch(() => {
    // Ignore errors, use default language
  });

// Save language preference when changed
i18n.on('languageChanged', (lng) => {
  AsyncStorage.setItem(LANGUAGE_KEY, lng).catch(() => {
    // Ignore storage errors
  });
});

export default i18n;

