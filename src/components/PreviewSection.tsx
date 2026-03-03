import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Type, Image as ImageIcon, CheckCircle2, Wand2, ArrowRight, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import Customizer from "./Customizer";
import InquiryForm from "./InquiryForm";
import { GoogleGenAI } from "@google/genai";

export default function PreviewSection() {
  const { t } = useTranslation();
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
    bodyColor: 'bg-zinc-100',
    brimColor: 'bg-zinc-100',
    sweatbandColor: 'bg-zinc-900',
    stitchingColor: 'bg-zinc-900',
    craft: 'embroidery',
    position: 'front',
    size: 'snap',
    scenario: 'streetwear',
  });

  const updateSelection = (key: string, value: string) => {
    setSelections(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'scenario') {
        switch (value) {
          case 'team': next.baseStyle = 'snapback'; break;
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

  const getTextColor = (bgClass: string) => {
    if (bgClass.includes('bg-white')) return 'text-zinc-900';
    const match = bgClass.match(/bg-([a-z]+-\d+|white|black)/);
    if (match) {
      return `text-${match[1]}`;
    }
    return 'text-zinc-900';
  };

  const fonts = [
    { name: 'Dancing Script', class: 'font-dancing' },
    { name: 'Caveat', class: 'font-caveat' },
    { name: 'Pacifico', class: 'font-pacifico' },
    { name: 'Great Vibes', class: 'font-vibes' },
  ];

  const handleGenerate3D = async () => {
    const hasGenerated = localStorage.getItem('hasGenerated3D');
    if (hasGenerated) {
      setShowLimitMsg(true);
      return;
    }

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
      
      const bodyColorName = selections.bodyColor.replace('bg-', '').replace(/-\d+/, '');
      const brimColorName = selections.brimColor.replace('bg-', '').replace(/-\d+/, '');
      
      const textPrompt = includeText ? `It features ${selections.craft} with the text "${text}" on the ${selections.position}.` : `It has a clean design with no text.`;
      const prompt = `A professional 3D product render of a custom ${selections.baseStyle} hat. The hat material is ${selections.material}. The body color is ${bodyColorName}, brim color is ${brimColorName}. ${textPrompt} High quality, studio lighting, clean white background, 8k resolution, highly detailed product photography.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }]
        }
      });

      let base64Image = null;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          base64Image = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }

      if (base64Image) {
        setGeneratedImage(base64Image);
        localStorage.setItem('hasGenerated3D', 'true');
      }
    } catch (error) {
      console.error("Failed to generate 3D image", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getHatShape = (style: string) => {
    switch (style) {
      case 'bucket':
        return (
          <>
            {/* Crown */}
            <path d="M 65 60 L 135 60 L 150 115 L 50 115 Z" />
            {/* Brim */}
            <path d="M 20 145 C 60 105, 140 105, 180 145 C 140 165, 60 165, 20 145 Z" opacity="0.8" />
            {/* Brim shadow */}
            <path d="M 50 115 C 80 125, 120 125, 150 115 C 140 130, 60 130, 50 115 Z" fill="black" opacity="0.1" />
          </>
        );
      case 'beanie':
        return (
          <>
            {/* Body */}
            <path d="M 50 120 C 50 30, 150 30, 150 120 Z" />
            {/* Cuff */}
            <path d="M 45 120 L 155 120 L 150 155 L 50 155 Z" opacity="0.85" />
            {/* Cuff lines */}
            <path d="M 45 120 L 155 120" stroke="black" strokeWidth="2" opacity="0.1" />
            {/* Pom Pom */}
            <circle cx="100" cy="30" r="14" opacity="0.9" />
          </>
        );
      case 'snapback':
      case 'trucker':
        return (
          <>
            {/* Crown */}
            <path d="M 50 115 L 65 45 C 80 35, 120 35, 135 45 L 150 115 Z" />
            {/* Brim */}
            <path d="M 30 115 C 80 105, 120 105, 170 115 C 165 130, 35 130, 30 115 Z" opacity="0.8" />
            {/* Button */}
            <circle cx="100" cy="38" r="5" />
            {/* Seams */}
            <path d="M 100 38 L 100 115" stroke="black" strokeWidth="1" opacity="0.1" />
          </>
        );
      case 'fivePanel':
        return (
          <>
            {/* Crown */}
            <path d="M 50 115 L 60 50 C 80 40, 120 40, 140 50 L 150 115 Z" />
            {/* Front Panel */}
            <path d="M 75 45 L 70 115 M 125 45 L 130 115" stroke="black" strokeWidth="1.5" opacity="0.1" fill="none" />
            {/* Brim */}
            <path d="M 35 115 C 80 105, 120 105, 165 115 C 160 125, 40 125, 35 115 Z" opacity="0.8" />
            {/* Label box placeholder */}
            <rect x="85" y="70" width="30" height="15" fill="black" opacity="0.1" rx="2" />
          </>
        );
      case 'dadHat':
      case 'curved':
      default:
        return (
          <>
            {/* Crown */}
            <path d="M 50 120 C 50 40, 150 40, 150 120 Z" />
            {/* Brim */}
            <path d="M 30 120 C 80 90, 120 90, 170 120 C 145 145, 55 145, 30 120 Z" opacity="0.8" />
            {/* Button */}
            <circle cx="100" cy="45" r="4" />
            {/* Seams */}
            <path d="M 100 45 L 100 120 M 65 110 C 75 70, 100 45, 100 45 M 135 110 C 125 70, 100 45, 100 45" stroke="black" strokeWidth="1" opacity="0.1" fill="none" />
          </>
        );
    }
  };

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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Controls (Left Side) */}
          <div className="lg:col-span-7">
            <Customizer 
              selections={selections} 
              updateSelection={updateSelection} 
              onEvaluate={() => setShowInquiryModal(true)}
            />
          </div>

          {/* Preview Area (Right Side) */}
          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <div className="relative aspect-square rounded-3xl overflow-hidden shadow-2xl bg-zinc-100 flex flex-col items-center justify-center mb-6">
              
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
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className={`absolute inset-0 flex items-center justify-center transition-colors duration-500 ${selections.bodyColor}`}
                >
                  {/* Abstract Hat Shape */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                    <svg
                      viewBox="0 0 200 200"
                      className="w-full h-full max-w-md fill-current text-zinc-900/50 transition-all duration-500"
                    >
                      {getHatShape(selections.baseStyle)}
                    </svg>
                  </div>

                  {/* The Text Preview */}
                  {includeText && (
                    <div
                      className={`relative z-10 text-xl sm:text-2xl tracking-tight text-center px-8 break-words w-full ${selections.font} ${getTextColor(selections.stitchingColor)} drop-shadow-sm`}
                    >
                      {text || t('preview.yourText')}
                    </div>
                  )}

                  {/* Realistic texture overlay */}
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/fabric-of-squares.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
                </motion.div>
              )}

              {/* Overlay for Generate Button or Limit Message */}
              <div className="absolute inset-0 flex flex-col items-center justify-end p-8 bg-gradient-to-t from-black/60 to-transparent">
                {showLimitMsg ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 rounded-2xl shadow-xl text-center w-full max-w-sm"
                  >
                    <p className="text-zinc-900 font-medium mb-2">{t('preview.limitReached')}</p>
                    <p className="text-zinc-500 text-sm mb-4">{t('preview.continueToStudio')}</p>
                    <a 
                      href="https://ai.dreambrand.studio" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-full px-4 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors"
                    >
                      {t('preview.studioBtn')}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </a>
                  </motion.div>
                ) : (
                  <button
                    onClick={handleGenerate3D}
                    disabled={isGenerating}
                    className="flex items-center justify-center w-full max-w-xs px-6 py-4 bg-zinc-900 text-white rounded-full font-medium hover:bg-zinc-800 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl hover:-translate-y-1"
                  >
                    {isGenerating ? (
                      <div className="flex items-center">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3" />
                        {t('preview.generating3d')}
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Wand2 className="w-5 h-5 mr-2" />
                        {t('preview.generate3d')}
                      </div>
                    )}
                  </button>
                )}
              </div>
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

              <AnimatePresence>
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
                          className={`px-4 py-3 rounded-xl border text-xl transition-all text-center ${f.class} ${
                            selections.font === f.class
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
