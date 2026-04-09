import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../i18n';

export const LanguageSwitcher = () => {
    const { i18n } = useTranslation();

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const lang = e.target.value;
        i18n.changeLanguage(lang);
        localStorage.setItem('language', lang);
    };

    return (
        <select
            className="language-switcher"
            value={i18n.language}
            onChange={handleChange}
        >
            {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                    {lang.label}
                </option>
            ))}
        </select>
    );
};
