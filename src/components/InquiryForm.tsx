import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Eye, Sparkles, CheckCircle2 } from 'lucide-react';

interface InquiryFormProps {
  selections?: any;
  text?: string;
  includeText?: boolean;
}

export default function InquiryForm({ selections = {}, text = '', includeText = false }: InquiryFormProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    contact: '',
    story: '',
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          design_text: includeText ? text : 'N/A',
          hat_style: selections.baseStyle || 'N/A',
          selections: selections
        }),
      });
      if (response.ok) {
        setStatus('success');
        setFormData({ contact: '', story: '' });
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
    }
  };

  const renderSelectionItem = (label: string, value: string | undefined) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3 py-3 border-b border-zinc-100 last:border-0">
        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
        <div>
          <span className="text-sm font-medium text-zinc-500 block mb-1">{label}</span>
          <span className="text-zinc-900 font-medium">{value}</span>
        </div>
      </div>
    );
  };

  // Helper to get translated value or fallback to raw value
  const getTranslatedValue = (category: string, key: string) => {
    if (!key) return '';
    const translationKey = `customizer.${category}.${key}`;
    const translated = t(translationKey);
    return translated !== translationKey ? translated : key;
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-zinc-100 p-8 w-full mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
      {/* Left Column: User Selections */}
      <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100 h-full overflow-y-auto max-h-[70vh]">
        <h3 className="text-xl font-medium text-zinc-900 mb-6">
          Your Design Details
        </h3>
        
        <div className="space-y-1">
          {includeText && renderSelectionItem(t('preview.yourText'), text)}
          {includeText && renderSelectionItem(t('customizer.font'), getTranslatedValue('fonts', selections.font) || selections.font)}
          
          {renderSelectionItem(t('customizer.baseStyle'), getTranslatedValue('styles', selections.baseStyle))}
          {renderSelectionItem(t('customizer.material'), getTranslatedValue('materials', selections.material))}
          
          {renderSelectionItem(t('customizer.craft'), getTranslatedValue('crafts', selections.craft))}
          {renderSelectionItem(t('customizer.position'), getTranslatedValue('positions', selections.position))}
          {renderSelectionItem(t('customizer.size'), getTranslatedValue('sizes', selections.size))}
          
          {selections.details && (
            <div className="flex items-start gap-3 py-3 border-b border-zinc-100 last:border-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-sm font-medium text-zinc-500 block mb-1">{t('customizer.details')}</span>
                <span className="text-zinc-900 font-medium whitespace-pre-wrap">{selections.details}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Form */}
      <div className="flex flex-col justify-between">
        <div>
          <h3 className="text-2xl font-medium text-zinc-900 mb-8">
            {t('inquiry.title')}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                {t('inquiry.contact')}
              </label>
              <input
                type="text"
                required
                placeholder={t('inquiry.contactPlaceholder')}
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                className="w-full rounded-xl border-zinc-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-4 py-3 bg-white border outline-none transition-all placeholder:text-zinc-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                {t('inquiry.story')}
              </label>
              <div className="relative">
                <textarea
                  rows={4}
                  maxLength={500}
                  placeholder={t('inquiry.storyPlaceholder')}
                  value={formData.story}
                  onChange={(e) => setFormData({ ...formData, story: e.target.value })}
                  className="w-full rounded-xl border-zinc-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 px-4 py-3 bg-white border outline-none transition-all resize-none placeholder:text-zinc-300"
                />
                <span className="absolute right-3 bottom-3 text-xs text-zinc-400">
                  {formData.story.length}/500
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full bg-zinc-900 text-white rounded-xl py-4 px-8 font-medium hover:bg-zinc-800 transition-colors shadow-md disabled:opacity-70"
            >
              {status === 'submitting' ? t('inquiry.submitting') : t('inquiry.submit')}
            </button>

            {status === 'success' && (
              <p className="text-emerald-600 text-sm text-center font-medium">{t('inquiry.success')}</p>
            )}
            {status === 'error' && (
              <p className="text-rose-600 text-sm text-center font-medium">{t('inquiry.error')}</p>
            )}
          </form>
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-100 grid grid-cols-3 gap-4 text-center">
          <div className="flex flex-col items-center">
            <ShieldCheck className="w-5 h-5 text-zinc-400 mb-2" />
            <span className="text-xs text-zinc-500">{t('inquiry.warranty')}</span>
          </div>
          <div className="flex flex-col items-center">
            <Eye className="w-5 h-5 text-zinc-400 mb-2" />
            <span className="text-xs text-zinc-500">{t('inquiry.preview')}</span>
          </div>
          <div className="flex flex-col items-center">
            <Sparkles className="w-5 h-5 text-zinc-400 mb-2" />
            <span className="text-xs text-zinc-500">{t('inquiry.guarantee')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
