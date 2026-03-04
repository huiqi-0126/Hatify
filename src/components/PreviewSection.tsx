import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Type, Image as ImageIcon, CheckCircle2, Wand2, ArrowRight, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import Customizer from "./Customizer";
import InquiryForm from "./InquiryForm";
import { GoogleGenAI } from "@google/genai";
import { Hat3DView } from "./Hat3DView";

export default function PreviewSection() {
  const { t } = useTranslation();
  const constraintsRef = useRef(null);
  const [text, setText] = useState("Hatify");
  const [includeText, setIncludeText] = useState(true);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showLimitMsg, setShowLimitMsg] = useState(false);
  const [showInquiryModal, setShowInquiryModal] = useState(false);

  useEffect(() => {
    const hasGenerated = localStorage.getItem('hasGenerated3D');
    if (hasGenerated) {
      // We don't show limit msg immediately, only when they click again
    }
  }, []);

  const [selections, setSelections] = useState({
    font: 'font-dancing',
    baseStyle: 'dadHat',
    material: 'canvas',
    bodyColor: '#f4f4f5',
    brimColor: '#f4f4f5',
    sweatbandColor: '#18181b',
    stitchingColor: '#18181b',
    craft: 'embroidery',
    position: 'front',
    size: 'snap',
    scenario: 'streetwear',
  });

  const updateSelection = (key: string, value: string) => {
    setSelections(prev => {
      const next = { ...prev, [key]: value };
      
      if (key === 'bodyColor') {
        next.brimColor = value;
        next.stitchingColor = value;
      }

      if (key === 'scenario') {
        switch (value) {
          case 'team': next.baseStyle = 'dadHat'; break;
          case 'corporate': next.baseStyle = 'dadHat'; break;
          case 'wedding': next.baseStyle = 'dadHat'; break;
          case 'sports': next.baseStyle = 'curved'; break;
          case 'streetwear': next.baseStyle = 'fivePanel'; break;
          case 'family': next.baseStyle = 'bucket'; break;
        }
      }
      return next;
    });
  };

  const getTextColor = (color: string) => {
    if (!color.startsWith('#')) return 'text-zinc-900';
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? 'text-zinc-900' : 'text-white';
  };

  const fonts = [
    { name: 'Dancing Script', class: 'font-dancing' },
    { name: 'Caveat', class: 'font-caveat' },
    { name: 'Pacifico', class: 'font-pacifico' },
    { name: 'Great Vibes', class: 'font-vibes' },
  ];

  const hatMapping: Record<string, string> = {
    dadHat: "hat (1).glb",
    trucker: "hat (3).glb",
    bucket: "hat (4).glb",
    beanie: "hat (5).glb",
    fivePanel: "hat (6).glb",
    baseball: "hat (7).glb",
    curved: "hat (8).glb",
    flatBrim: "hat (9).glb",
  };

  const currentSvgUrl = hatMapping[selections.baseStyle] || "hat (1).svg";

  return (
    <section id="design" className="py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl mb-4">
            {t('preview.title')}
          </h2>
          <p className="text-xl text-zinc-600 max-w-2xl mx-auto">
            {t('preview.desc')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Controls (Left Side) */}
          <div className="order-2 lg:order-1">
            <Customizer
              selections={selections}
              updateSelection={updateSelection}
              onEvaluate={() => setShowInquiryModal(true)}
            />
          </div>

          {/* Preview (Right Side) */}
          <div className="order-1 lg:order-2 lg:sticky lg:top-24">
            <div className="relative aspect-[4/5] sm:aspect-square rounded-3xl overflow-hidden shadow-2xl bg-zinc-100 flex flex-col items-center justify-center mb-6 border border-zinc-200">
              {generatedImage ? (
                <motion.img
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  src={generatedImage}
                  alt="3D Generated Hat"
                  className="w-full h-full object-cover"
                />
              ) : (
                <motion.div
                  ref={constraintsRef}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 flex items-center justify-center transition-colors duration-500"
                >
                  {/* Abstract Hat Shape */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-90 pointer-events-auto">
                    <Hat3DView
                      modelUrl={currentSvgUrl}
                      bodyColor={selections.bodyColor}
                      brimColor={selections.brimColor}
                      sweatbandColor={selections.sweatbandColor}
                      stitchingColor={selections.stitchingColor}
                      material={selections.material}
                      craft={selections.craft}
                      text={text}
                      font={selections.font}
                      includeText={includeText}
                    />
                  </div>

                  {/* The Text Preview */}
                  {includeText && (
                    <motion.div
                      drag
                      dragConstraints={constraintsRef}
                      dragElastic={0}
                      dragMomentum={false}
                      whileHover={{ outline: "1px dashed rgba(16, 185, 129, 0.5)", outlineOffset: "4px" }}
                      whileTap={{ outline: "2px solid #10b981", outlineOffset: "4px", cursor: "grabbing" }}
                      className={`relative z-20 px-4 py-2 cursor-grab break-words text-center select-none ${selections.font} ${getTextColor(selections.stitchingColor)} drop-shadow-sm`}
                      style={{ touchAction: 'none' }}
                    >
                      {text || t('preview.yourText')}
                    </motion.div>
                  )}

                  {/* Realistic texture overlay */}
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/fabric-of-squares.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
                </motion.div>
              )}
            </div>

            {/* Text and Font Controls */}
            <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
              <div className="flex items-center justify-between mb-4">
                <label
                  htmlFor="custom-text"
                  className="text-sm font-medium text-zinc-700 flex items-center"
                >
                  <Type className="w-4 h-4 mr-2" />
                  {t('preview.yourText')}
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={includeText}
                    onChange={(e) => setIncludeText(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 relative"></div>
                  <span className="ml-3 text-sm font-medium text-zinc-700">{t('customizer.includeText') || 'Include Text'}</span>
                </label>
              </div>

              <AnimatePresence mode="wait">
                {includeText && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <input
                      type="text"
                      id="custom-text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      maxLength={15}
                      className="block w-full rounded-xl border-zinc-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-lg px-4 py-3 bg-white border outline-none transition-all mb-2"
                      placeholder="Enter your text..."
                    />
                    <p className="text-xs text-zinc-500 text-right mb-6">
                      {text.length}/15 characters
                    </p>

                    <label className="block text-sm font-medium text-zinc-700 mb-3">
                      {t('customizer.font') || 'Typography Style'}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {fonts.map(f => (
                        <button
                          key={f.name}
                          onClick={() => updateSelection('font', f.class)}
                          className={`px-4 py-3 rounded-xl border text-xl transition-all text-center ${f.class} ${selections.font === f.class
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500'
                            : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                            }`}
                        >
                          {f.name}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Inquiry Modal */}
      <AnimatePresence>
        {showInquiryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowInquiryModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-4xl"
            >
              <button
                onClick={() => setShowInquiryModal(false)}
                className="absolute top-4 right-4 p-2 bg-zinc-100 hover:bg-zinc-200 rounded-full transition-colors z-20"
              >
                <X className="w-5 h-5 text-zinc-600" />
              </button>
              <InquiryForm selections={selections} text={text} includeText={includeText} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
