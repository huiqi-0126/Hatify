import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import ProductDetailModal from './ProductDetailModal';

interface ImageItem {
  image_id: string;
  path: string;
  name: string;
  width: number;
  height: number;
  description: string;
}

export default function GallerySection() {
  const { t } = useTranslation();
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ImageItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const res = await fetch('/api/dreambrand/images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            "sort": "rand",
            "tabType": "images",
            "category_id": "61",
            "filter_type": 0,
            "current": 1,
            "pageSize": 20
          })
        });
        const data = await res.json();
        if (data?.data?.list) {
          setImages(data.data.list);
        }
      } catch (error) {
        console.error('Failed to fetch images:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, []);

  // Split images into columns for masonry layout
  const columns = 4;
  const columnData: ImageItem[][] = Array.from({ length: columns }, () => []);

  images.forEach((img, i) => {
    columnData[i % columns].push(img);
  });

  return (
    <section className="py-24 bg-zinc-50 border-t border-zinc-100" id="gallery">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-zinc-900 mb-4">
            {t('gallery.title')}
          </h2>
          <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
            {t('gallery.desc')}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zinc-900"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-h-[800px] overflow-hidden relative">
            {columnData.map((col, colIndex) => (
              <div key={colIndex} className="flex flex-col gap-4 md:gap-6">
                {col.map((item) => (
                  <motion.div
                    key={item.image_id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: colIndex * 0.1 }}
                    className="relative group cursor-pointer rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all"
                    onClick={() => setSelectedItem(item)}
                  >
                    <img
                      src={`https://image-cloud-1318759792.cos.na-siliconvalley.myqcloud.com/${item.path}`}
                      alt={item.name}
                      className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-zinc-900 px-4 py-2 rounded-full font-medium text-sm transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                        {t('gallery.details')}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ))}
            {/* Gradient overlay to fade out the bottom and indicate more content */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-zinc-50 to-transparent pointer-events-none flex items-end justify-center pb-8">
              <a
                href="https://ai.dreambrand.studio/explore/gallery?parent_id=54&title=Accessories"
                target="_blank"
                rel="noopener noreferrer"
                className="pointer-events-auto bg-zinc-900 text-white px-6 py-3 rounded-full font-medium hover:bg-zinc-800 transition-colors shadow-lg"
              >
                {t('gallery.viewAll')} &rarr;
              </a>
            </div>
          </div>
        )}
      </div>

      {selectedItem && (
        <ProductDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </section>
  );
}
