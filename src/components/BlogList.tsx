import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import blogData from "../data/blog.json";

interface BlogListProps {
    onSelectPost: (id: string) => void;
}

export default function BlogList({ onSelectPost }: BlogListProps) {
    const { t } = useTranslation();
    const [isScanning, setIsScanning] = useState(false);
    const [visibleCount, setVisibleCount] = useState(6);
    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            if (window.scrollY > 500) {
                setShowScrollTop(true);
            } else {
                setShowScrollTop(false);
            }
        };
        window.addEventListener("scroll", toggleVisibility);
        return () => window.removeEventListener("scroll", toggleVisibility);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };

    const handleScan = async () => {
        setIsScanning(true);
        try {
            const res = await fetch('/api/blog/scan', { method: 'POST' });
            if (res.ok) {
                window.location.reload();
            } else {
                alert("Failed to sync blog. Please check server logs.");
            }
        } catch (err) {
            console.error(err);
            alert("Error syncing blog.");
        } finally {
            setIsScanning(false);
        }
    };

    const hasMore = visibleCount < blogData.length;
    const currentPosts = blogData.slice(0, visibleCount);

    return (
        <section className="py-24 bg-[#FAFAFA] relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
                    <div className="text-left">
                        <h2 className="text-4xl font-bold tracking-tight text-[#18181B] sm:text-5xl">
                            {t('blog.title', 'Our Blog')}
                        </h2>
                        <p className="mt-4 text-xl text-[#3F3F46]">
                            {t('blog.subtitle', 'Insights and guides on custom hats and apparel.')}
                        </p>
                    </div>
                    <button
                        onClick={handleScan}
                        disabled={isScanning}
                        className={`inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all ${isScanning
                            ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-lg active:scale-95'
                            }`}
                    >
                        <svg
                            className={`w-5 h-5 ${isScanning ? 'animate-spin' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {isScanning ? 'Syncing...' : ''}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    <AnimatePresence mode="popLayout">
                        {currentPosts.map((post, index) => (
                            <motion.div
                                key={post.id}
                                layout
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                    opacity: { duration: 0.4 },
                                    y: { duration: 0.4 },
                                    delay: (index % 6) * 0.05
                                }}
                                className="group bg-white rounded-[2.5rem] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_30px_60px_rgba(0,0,0,0.12)] transition-all duration-700 cursor-pointer border border-zinc-100 flex flex-col h-full hover:-translate-y-2"
                                onClick={() => onSelectPost(post.id)}
                            >
                                <div className="aspect-[16/10] relative overflow-hidden bg-zinc-100">
                                    {post.image ? (
                                        <img
                                            src={post.image.startsWith('http') ? post.image : `${import.meta.env.BASE_URL || '/'}${post.image.startsWith('/') ? post.image.slice(1) : post.image}`}
                                            alt={post.title}
                                            className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-1000 ease-out"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=800&q=80';
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-white p-8 overflow-hidden relative">
                                            <span className="text-5xl font-serif font-bold opacity-10 absolute -right-4 -bottom-4 rotate-12">{post.title}</span>
                                            <span className="text-xl font-bold tracking-tight text-center relative z-10">{post.title}</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                </div>
                                <div className="p-10 flex-grow flex flex-col">
                                    <div className="flex items-center gap-3 mb-6">
                                        <span className="px-4 py-1.5 bg-zinc-900 text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-full">
                                            Article
                                        </span>
                                        <span className="text-zinc-400 text-xs font-medium tracking-wide">
                                            5 MIN READ
                                        </span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-zinc-900 mb-4 line-clamp-2 leading-tight group-hover:text-emerald-600 transition-colors duration-300">
                                        {post.title}
                                    </h3>
                                    <p className="text-zinc-500 line-clamp-3 text-base leading-relaxed mb-8 font-medium">
                                        {post.description}
                                    </p>
                                    <div className="mt-auto flex items-center">
                                        <span className="text-emerald-600 font-extrabold text-sm inline-flex items-center gap-2 group/btn uppercase tracking-widest">
                                            Explore Details
                                            <svg className="w-5 h-5 group-hover/btn:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                            </svg>
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {hasMore && (
                    <div className="mt-20 text-center">
                        <button
                            onClick={() => setVisibleCount(prev => prev + 6)}
                            className="inline-flex items-center gap-3 px-10 py-5 bg-white border-2 border-zinc-900 text-zinc-900 rounded-full font-black uppercase tracking-widest hover:bg-zinc-900 hover:text-white transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 active:scale-95 group"
                        >
                            Load More Insights
                            <svg className="w-5 h-5 group-hover:translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            {/* Back to Top Button */}
            <AnimatePresence>
                {showScrollTop && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.5, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.5, y: 20 }}
                        onClick={scrollToTop}
                        className="fixed bottom-10 right-10 z-50 p-5 bg-emerald-600 text-white rounded-full shadow-2xl hover:bg-emerald-700 transition-all active:scale-90 group"
                        title="Back to Top"
                    >
                        <svg className="w-6 h-6 group-hover:-translate-y-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                    </motion.button>
                )}
            </AnimatePresence>
        </section>
    );
}
