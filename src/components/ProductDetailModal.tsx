import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { X, Star, Check, Shield, Truck, ThumbsUp, MessageSquare, Sparkles, Link, Scissors, PenTool, Recycle, Ruler, Settings, Palette } from 'lucide-react';

interface ImageItem {
  image_id: string;
  path: string;
  name: string;
  width: number;
  height: number;
  description: string;
}

interface ProductDetailModalProps {
  item: ImageItem;
  onClose: () => void;
}

export default function ProductDetailModal({ item, onClose }: ProductDetailModalProps) {
  const { t } = useTranslation();
  const [parsedDesc, setParsedDesc] = useState<{ title?: string; description?: string; prompt?: string }>({});
  const [email, setEmail] = useState('');

  useEffect(() => {
    try {
      if (item.description) {
        const parsed = JSON.parse(item.description);
        setParsedDesc(parsed);
      }
    } catch (e) {
      console.error('Failed to parse description', e);
    }
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [item]);

  const getHighlightsFromPrompt = (prompt: string) => {
    const lowerPrompt = (prompt || '').toLowerCase();
    const highlights = [];
    
    // Material
    if (lowerPrompt.includes('corduroy')) highlights.push({ icon: <Sparkles className="w-5 h-5" />, label: t('product.highlightMaterialCorduroy', 'Material: Premium Corduroy') });
    else if (lowerPrompt.includes('wool')) highlights.push({ icon: <Sparkles className="w-5 h-5" />, label: t('product.highlightMaterialWool', 'Material: Premium Wool Blend') });
    else if (lowerPrompt.includes('mesh') || lowerPrompt.includes('trucker')) highlights.push({ icon: <Sparkles className="w-5 h-5" />, label: t('product.highlightMaterialMesh', 'Material: Cotton & Breathable Mesh') });
    else highlights.push({ icon: <Sparkles className="w-5 h-5" />, label: t('product.highlightMaterial', 'Material: Premium Cotton Blend') });

    // Style
    if (lowerPrompt.includes('snapback')) highlights.push({ icon: <Link className="w-5 h-5" />, label: t('product.highlightFastenerSnap', 'Fastener: Adjustable Snapback') });
    else if (lowerPrompt.includes('bucket')) highlights.push({ icon: <Scissors className="w-5 h-5" />, label: t('product.highlightStyleBucket', 'Style: Classic Bucket Hat') });
    else if (lowerPrompt.includes('beanie')) highlights.push({ icon: <Scissors className="w-5 h-5" />, label: t('product.highlightStyleBeanie', 'Style: Warm Knit Beanie') });
    else highlights.push({ icon: <Scissors className="w-5 h-5" />, label: t('product.highlightStyle', 'Style: Minimalist') });

    // Color
    const colors = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'brown', 'grey', 'gray', 'navy', 'pink', 'orange', 'purple'];
    const foundColor = colors.find(c => lowerPrompt.includes(c));
    if (foundColor) {
      const colorName = foundColor.charAt(0).toUpperCase() + foundColor.slice(1);
      highlights.push({ icon: <Palette className="w-5 h-5" />, label: t('product.highlightColor', `Color: Custom ${colorName}`).replace('{{color}}', colorName) });
    } else {
      highlights.push({ icon: <PenTool className="w-5 h-5" />, label: t('product.highlightPersonalization', 'Personalization Available') });
    }

    highlights.push({ icon: <Ruler className="w-5 h-5" />, label: t('product.highlightSize', 'Size: One Size Fits Most') });
    
    if (lowerPrompt.includes('3d') || lowerPrompt.includes('puff')) {
      highlights.push({ icon: <Settings className="w-5 h-5" />, label: t('product.highlight3DEmbroidery', 'Premium 3D Puff Embroidery') });
    } else {
      highlights.push({ icon: <Settings className="w-5 h-5" />, label: t('product.highlightEmbroidery', 'Custom Embroidery') });
    }

    return highlights;
  };

  const customizationParams = getHighlightsFromPrompt(parsedDesc.prompt || parsedDesc.description || '');

  const getReviewForHat = (imageId: string | number) => {
    const allReviews = [
      { user: 'Sarah M.', rating: 5, date: '2 weeks ago', text: 'Absolutely love how my custom design turned out! The embroidery quality is top-notch and the hat fits perfectly.', helpful: 12 },
      { user: 'James T.', rating: 5, date: '1 month ago', text: 'Great experience from start to finish. The preview was accurate, and the final product exceeded my expectations.', helpful: 8 },
      { user: 'Emily R.', rating: 4, date: '2 months ago', text: 'Really nice hat, the stitching is very clean. Shipping took a bit longer than expected, but worth the wait.', helpful: 5 },
      { user: 'Michael B.', rating: 5, date: '3 weeks ago', text: 'The colors are so vibrant and exactly what I wanted. Will definitely order again for my team.', helpful: 15 },
      { user: 'Jessica K.', rating: 5, date: '1 week ago', text: 'Super comfortable and the design looks amazing. Got so many compliments already!', helpful: 3 },
      { user: 'David L.', rating: 4, date: '3 months ago', text: 'Solid quality cap. The custom text came out very crisp and readable.', helpful: 7 },
      { user: 'Amanda W.', rating: 5, date: '4 days ago', text: 'Exceeded my expectations! The 3D puff embroidery looks incredibly premium.', helpful: 20 },
      { user: 'Chris P.', rating: 5, date: '2 weeks ago', text: 'Perfect gift! The personalization makes it so special and the material feels very durable.', helpful: 11 },
    ];
    
    let hash = 0;
    const idStr = String(imageId || 'default');
    for (let i = 0; i < idStr.length; i++) {
      hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % allReviews.length;
    return { ...allReviews[index], id: idStr };
  };

  const review = getReviewForHat(item.image_id);

  let inspirationText = parsedDesc.description || parsedDesc.prompt || '';
  inspirationText = inspirationText.replace(/#|\*|-/g, '').trim();
  if (inspirationText.length > 200) {
    inspirationText = inspirationText.substring(0, 197) + '...';
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-100">
            <h3 className="text-xl font-serif font-bold text-zinc-900">
              {t('product.details')}
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
              
              {/* Left Column: Image */}
              <div className="space-y-6">
                <div className="aspect-square rounded-2xl overflow-hidden bg-zinc-50 border border-zinc-100">
                  <img
                    src={`https://image-cloud-1318759792.cos.na-siliconvalley.myqcloud.com/${item.path}`}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                
                {/* Description snippet if available */}
                {inspirationText && (
                  <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
                    <h4 className="font-medium text-zinc-900 mb-2">{t('product.inspiration')}</h4>
                    <p className="text-sm text-zinc-600 leading-relaxed">
                      {inspirationText}
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column: Details & Price */}
              <div className="flex flex-col">
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                    <span className="text-sm text-zinc-500">({t('product.fromReviews', { count: 1 }).replace('{{count}}', '1')})</span>
                  </div>
                  <h2 className="text-3xl font-serif font-bold text-zinc-900 mb-4">
                    {parsedDesc.title || t('product.signature')}
                  </h2>
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-bold text-zinc-900">$45.00</span>
                    <span className="text-lg text-zinc-400 line-through">$65.00</span>
                  </div>
                </div>

                {/* Customization Parameters */}
                <div className="mb-8 flex-1">
                  <h4 className="font-semibold text-zinc-900 mb-6 text-lg">
                    {t('product.highlights')}
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-zinc-700">
                      <span className="text-xl">👋</span>
                      <span className="font-medium">{t('product.producedBy')}</span>
                    </div>
                    {customizationParams.map((param, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-zinc-700">
                        <div className="text-zinc-500">
                          {param.icon}
                        </div>
                        <span className="font-medium">{param.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action */}
                <div className="mt-8 pt-6 border-t border-zinc-100">
                  <div className="mb-4">
                    <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-2">
                      {t('product.emailLabel')}
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('product.emailPlaceholder')}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <button className="w-full bg-zinc-900 text-white py-4 rounded-xl font-medium hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-900/20">
                    {t('product.customizeBtn')}
                  </button>
                </div>
              </div>
            </div>

            {/* Reviews Section */}
            <div className="mt-12 pt-12 border-t border-zinc-100">
              <h3 className="text-2xl font-serif font-bold text-zinc-900 mb-8">{t('product.reviews')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                <div key={review.id} className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-200 rounded-full flex items-center justify-center font-bold text-zinc-600">
                        {review.user.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-zinc-900 text-sm">{review.user}</div>
                        <div className="text-xs text-zinc-500">{review.date}</div>
                      </div>
                    </div>
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-current' : 'text-zinc-300'}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-zinc-600 leading-relaxed mb-4">
                    "{review.text}"
                  </p>
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <button className="flex items-center gap-1 hover:text-zinc-900 transition-colors">
                      <ThumbsUp className="w-3 h-3" /> {t('product.helpful')} ({review.helpful})
                    </button>
                    <button className="flex items-center gap-1 hover:text-zinc-900 transition-colors">
                      <MessageSquare className="w-3 h-3" /> {t('product.reply')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
