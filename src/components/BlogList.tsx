import { useTranslation } from "react-i18next";
import blogData from "../data/blog.json";

interface BlogListProps {
    onSelectPost: (id: string) => void;
}

export default function BlogList({ onSelectPost }: BlogListProps) {
    const { t } = useTranslation();

    return (
        <section className="py-24 bg-[#FAFAFA]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold tracking-tight text-[#18181B] sm:text-5xl">
                        {t('blog.title', 'Our Blog')}
                    </h2>
                    <p className="mt-4 text-xl text-[#3F3F46]">
                        {t('blog.subtitle', 'Insights and guides on custom hats and apparel.')}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {blogData.map((post) => (
                        <div
                            key={post.id}
                            className="group bg-white rounded-[2.5rem] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_30px_60px_rgba(0,0,0,0.12)] transition-all duration-700 cursor-pointer border border-zinc-100 flex flex-col h-full hover:-translate-y-2"
                            onClick={() => onSelectPost(post.id)}
                        >
                            <div className="aspect-[16/10] relative overflow-hidden bg-zinc-100">
                                {post.image ? (
                                    <img
                                        src={post.image}
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
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
