import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from '../locales/en/translation.json';
import ja from '../locales/ja/translation.json';
import uz from '../locales/uz/translation.json';

const detectedLocale = Localization.getLocales()[0]?.languageCode;
const DEFAULT_LANGUAGE = 'uz';
const SUPPORTED_LANGUAGES = ['uz', 'en', 'ja'];
const normalizedLocale = detectedLocale?.split?.('-')[0] ?? DEFAULT_LANGUAGE;
const initialLanguage = SUPPORTED_LANGUAGES.includes(normalizedLocale) ? normalizedLocale : DEFAULT_LANGUAGE;

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ja: { translation: ja },
    uz: { translation: uz },
  },
  lng: initialLanguage,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
});

export default i18n;
