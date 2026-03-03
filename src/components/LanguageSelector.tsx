import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const languages = [
  { code: 'en', name: 'English', region: 'US' },
  { code: 'zh', name: '简体中文', region: 'CN' },
  { code: 'zh-HK', name: '繁體中文', region: 'HK' },
  { code: 'ja', name: '日本語', region: 'JP' },
  { code: 'ko', name: '한국어', region: 'KR' },
  { code: 'es', name: 'Español', region: 'ES' },
  { code: 'fr', name: 'Français', region: 'FR' },
  { code: 'de', name: 'Deutsch', region: 'DE' },
];

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-colors flex items-center justify-center"
        aria-label="Select Language"
      >
        <Globe className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-zinc-100 overflow-hidden z-50"
          >
            <div className="py-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className="w-full text-left px-4 py-3 text-sm flex items-center justify-between hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-zinc-400 font-medium text-xs w-5">{lang.region}</span>
                    <span className={`font-medium ${i18n.language === lang.code ? 'text-zinc-900' : 'text-zinc-600'}`}>
                      {lang.name}
                    </span>
                  </div>
                  {i18n.language === lang.code && <Check className="w-4 h-4 text-zinc-900" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
