import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import he from './locales/he.json';
import ru from './locales/ru.json';
import fr from './locales/fr.json';

export const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'he', label: 'עברית' },
    { code: 'ru', label: 'Русский' },
    { code: 'fr', label: 'Français' },
] as const;

i18n.use(initReactI18next).init({
    resources: {
        en: { translation: en },
        he: { translation: he },
        ru: { translation: ru },
        fr: { translation: fr },
    },
    lng: localStorage.getItem('language') || 'en',
    fallbackLng: 'en',
    interpolation: {
        escapeValue: false,
    },
});

i18n.on('languageChanged', (lng) => {
    document.documentElement.lang = lng;
});

export default i18n;
