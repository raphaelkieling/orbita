import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import portuguese from './locales/pt.json';

export const SETTINGS_KEY = 'orbit-settings-v1';
export function readSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return { language: saved.language === 'pt' ? 'pt' : 'en', colorful: saved.colorful === true };
  } catch { return { language: 'en', colorful: false }; }
}
export const i18n = i18next;
i18n.use(initReactI18next).init({
  lng: readSettings().language, fallbackLng: 'en',
  resources: { en: { translation: {} }, pt: { translation: portuguese } },
  interpolation: { escapeValue: false }, keySeparator: false, nsSeparator: false,
  returnEmptyString: false,
});
export const t = (key, options) => i18n.t(key, options);
