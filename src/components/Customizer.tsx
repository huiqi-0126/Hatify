import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CustomizerProps {
  selections: any;
  updateSelection: (key: string, value: string) => void;
  onEvaluate: () => void;
}

export default function Customizer({ selections, updateSelection, onEvaluate }: CustomizerProps) {
  const { t } = useTranslation();

  const [expandedSection, setExpandedSection] = useState<string | null>('scenario');

  const toggleSection = (section: string) => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
    }
  };

  const options = {
    baseStyle: ['dadHat', 'bucket', 'curved', 'trucker', 'beanie', 'fivePanel', 'baseball', 'flatBrim'],
    material: ['canvas', 'washed', 'mesh', 'wool', 'suede', 'polyester', 'fleece'],
    craft: ['embroidery', 'print', 'leather', 'rubber', 'woven', 'foil'],
    position: ['front', 'left', 'right', 'back', 'underBrim', 'innerBand', 'top'],
    size: ['snap', 'elastic', 'fixed', 'audience'],
    details: ['label', 'lanyard', 'button', 'eyelets'],
    scenario: ['team', 'corporate', 'wedding', 'sports', 'streetwear', 'family'],
  };

  const colors = [
    { name: 'Black', class: 'bg-zinc-900' },
    { name: 'White', class: 'bg-white border border-zinc-200' },
    { name: 'Emerald', class: 'bg-emerald-600' },
    { name: 'Navy', class: 'bg-slate-800' },
    { name: 'Red', class: 'bg-rose-600' },
    { name: 'Khaki', class: 'bg-stone-400' },
  ];

  const renderSection = (id: string, title: string, content: React.ReactNode) => (
    <div className="border border-zinc-200 rounded-2xl overflow-hidden bg-white mb-4 shadow-sm">
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-5 bg-zinc-50/50 hover:bg-zinc-50 transition-colors"
      >
        <span className="font-medium text-zinc-900">{title}</span>
        {expandedSection === id ? (
          <ChevronUp className="w-5 h-5 text-zinc-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-zinc-500" />
        )}
      </button>
      <AnimatePresence>
        {expandedSection === id && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-5 border-t border-zinc-100">
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderGridOptions = (category: keyof typeof options, translationKey: string) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {options[category].map(item => (
        <button
          key={item}
          onClick={() => updateSelection(category, item)}
          className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left ${
            selections[category] === item
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500'
              : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
          }`}
        >
          {t(`customizer.${translationKey}.${item}`)}
        </button>
      ))}
    </div>
  );

  const renderColorOptions = (key: string, label: string) => (
    <div className="mb-6 last:mb-0">
      <label className="block text-sm font-medium text-zinc-700 mb-3">{label}</label>
      <div className="flex flex-wrap gap-3">
        {colors.map(c => (
          <button
            key={c.name}
            onClick={() => updateSelection(key, c.class)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${c.class} ${
              selections[key as keyof typeof selections] === c.class ? 'ring-2 ring-offset-2 ring-emerald-500 scale-110' : ''
            }`}
            aria-label={c.name}
          >
            {selections[key as keyof typeof selections] === c.class && (
              <CheckCircle2 className={`w-5 h-5 ${c.name === 'White' ? 'text-zinc-900' : 'text-white'}`} />
            )}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      {renderSection('scenario', t('customizer.scenario'), renderGridOptions('scenario', 'scenarios'))}
      {renderSection('baseStyle', t('customizer.baseStyle'), renderGridOptions('baseStyle', 'styles'))}
      {renderSection('material', t('customizer.material'), renderGridOptions('material', 'materials'))}
      
      {renderSection('colors', t('customizer.colors'), (
        <div>
          {renderColorOptions('bodyColor', t('customizer.colorTypes.body'))}
          {renderColorOptions('brimColor', t('customizer.colorTypes.brim'))}
          {renderColorOptions('sweatbandColor', t('customizer.colorTypes.sweatband'))}
          {renderColorOptions('stitchingColor', t('customizer.colorTypes.stitching'))}
        </div>
      ))}

      {renderSection('craft', t('customizer.craft'), renderGridOptions('craft', 'crafts'))}
      {renderSection('position', t('customizer.position'), renderGridOptions('position', 'positions'))}
      {renderSection('size', t('customizer.size'), renderGridOptions('size', 'sizes'))}
      
      <div className="border border-zinc-200 rounded-2xl overflow-hidden bg-white mb-4 shadow-sm">
        <div className="w-full flex items-center justify-between p-5 bg-zinc-50/50 border-b border-zinc-100">
          <span className="font-medium text-zinc-900">{t('customizer.details')}</span>
        </div>
        <div className="p-5">
          <textarea
            value={selections.details || ''}
            onChange={(e) => updateSelection('details', e.target.value)}
            placeholder={t('customizer.detailsPlaceholder')}
            className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all resize-none h-32 text-sm text-zinc-700 placeholder:text-zinc-400"
          />
        </div>
      </div>
      
      <div className="mt-8 p-6 bg-zinc-900 rounded-2xl text-white flex flex-col sm:flex-row items-center justify-between shadow-xl">
        <div>
          <h4 className="text-lg font-medium mb-1">{t('preview.orderBtn')}</h4>
          <p className="text-zinc-400 text-sm">{t('preview.freeShipping')}</p>
        </div>
        <button 
          onClick={onEvaluate}
          className="mt-4 sm:mt-0 px-8 py-3 bg-white text-zinc-900 rounded-full font-medium hover:bg-zinc-100 transition-colors"
        >
          {t('preview.evaluateBtn')}
        </button>
      </div>
    </div>
  );
}
