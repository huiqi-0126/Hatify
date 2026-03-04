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

  const [expandedSection, setExpandedSection] = useState<string | null>('group_style');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const options = {
    baseStyle: ['peakedCap', 'trucker', 'bucket', 'beanie', 'fivePanel', 'curved', 'flatBrim', 'womenHat'],
    material: ['canvas', 'washed', 'mesh', 'wool', 'suede', 'polyester', 'fleece'],
    craft: ['embroidery', 'print', 'leather', 'rubber', 'woven', 'foil'],
    size: ['snap', 'elastic', 'fixed', 'audience'],
  };

  const colors = [
    { name: 'Black', hex: '#18181b' },
    { name: 'White', hex: '#ffffff' },
    { name: 'Emerald', hex: '#059669' },
    { name: 'Navy', hex: '#1e293b' },
    { name: 'Red', hex: '#e11d48' },
    { name: 'Khaki', hex: '#a8a29e' },
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

  const renderColorOptions = () => (
    <div>
      <label className="block text-sm font-medium text-zinc-700 mb-3">{t('customizer.color') || 'Hat Color'}</label>
      <div className="flex flex-wrap gap-3 items-center">
        {colors.map(c => (
          <button
            key={c.name}
            onClick={() => updateSelection('bodyColor', c.hex)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-sm ${
              selections.bodyColor === c.hex ? 'ring-2 ring-offset-2 ring-emerald-500 scale-110' : ''
            }`}
            style={{ backgroundColor: c.hex, border: c.name === 'White' ? '1px solid #e4e4e7' : 'none' }}
            aria-label={c.name}
          >
            {selections.bodyColor === c.hex && (
              <CheckCircle2 className={`w-5 h-5 ${c.name === 'White' ? 'text-zinc-900' : 'text-white'}`} />
            )}
          </button>
        ))}
        
        <div className="relative group">
          <input
            type="color"
            value={selections.bodyColor.startsWith('#') ? selections.bodyColor : '#ffffff'}
            onChange={(e) => updateSelection('bodyColor', e.target.value)}
            className="w-10 h-10 rounded-full overflow-hidden cursor-pointer border-2 border-white shadow-sm ring-1 ring-zinc-200"
          />
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {t('customizer.customColor') || 'Custom'}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      {/* Group 1: Style & Color */}
      {renderSection('group_style', t('customizer.groups.style') || '款式与颜色', (
        <div className="space-y-8">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-3">{t('customizer.baseStyle')}</label>
            {renderGridOptions('baseStyle', 'styles')}
          </div>
          {renderColorOptions()}
        </div>
      ))}

      {/* Group 2: Material, Craft, Size */}
      {renderSection('group_craft', t('customizer.groups.craft') || '材质与工艺', (
        <div className="space-y-8">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-3">{t('customizer.material')}</label>
            {renderGridOptions('material', 'materials')}
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-3">{t('customizer.craft')}</label>
            {renderGridOptions('craft', 'crafts')}
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-3">{t('customizer.size')}</label>
            {renderGridOptions('size', 'sizes')}
          </div>
        </div>
      ))}

      {/* Group 3: Personalized Details */}
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
