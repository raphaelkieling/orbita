import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { t } from './i18n';

export default function SettingsModal({ settings, onChange, onClose, storageError }) {
  const dialog = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current.showModal();
    return () => previous?.focus();
  }, []);
  return <dialog className="help-dialog settings-dialog" ref={dialog} aria-labelledby="settings-title" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="help-content">
      <button className="dialog-close" aria-label={t('Close settings')} onClick={onClose}><X size={19} /></button>
      <h2 id="settings-title">{t('Settings')}</h2>
      <label className="settings-row"><span>{t('Language')}</span><select value={settings.language} onChange={(event) => onChange({ ...settings, language: event.target.value })}><option value="en">English</option><option value="pt">Português</option></select></label>
      <div className="settings-section-title">{t('Map appearance')}</div>
      <label className="settings-row"><span><strong>{t('Colorful countries')}</strong><small>{t('Use distinct colors for countries.')}</small></span><input type="checkbox" role="switch" checked={settings.colorful} onChange={(event) => onChange({ ...settings, colorful: event.target.checked })} /></label>
      <div className={`palette-preview ${settings.colorful ? 'colored' : ''}`} aria-hidden="true">{['#bd8e80', '#83a99b', '#9a9ec2', '#c7af78', '#7fabbf', '#b48fa7'].map((color) => <i key={color} style={settings.colorful ? { background: color } : undefined} />)}</div>
      <p className="settings-note" role={storageError ? 'alert' : undefined}>{storageError ? t('Unable to save settings. Changes apply only to this session.') : t('Preferences are saved in this browser.')}</p>
    </div>
  </dialog>;
}
