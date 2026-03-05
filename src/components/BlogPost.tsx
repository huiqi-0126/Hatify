import { useEffect } from "react";
import blogData from "../data/blog.json";

interface BlogPostProps {
    postId: string;
    onBack: () => void;
}

export default function BlogPost({ postId, onBack }: BlogPostProps) {
    const post = blogData.find((p) => p.id === postId);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    if (!post) {
        return (
            <div className="py-24 text-center">
                <h2 className="text-2xl font-bold">Post not found</h2>
                <button onClick={onBack} className="mt-4 text-[#EC4899] underline">
                    Go back to blog
                </button>
            </div>
        );
    }

    return (
        <article className="py-24 bg-[#FAFAFA] min-h-screen">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <button
                    onClick={onBack}
                    className="mb-8 flex items-center gap-2 text-[#3F3F46] hover:text-[#18181B] transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to blog
                </button>

                <header className="mb-12">
                    {post.image ? (
                        <img
                            src={post.image}
                            alt={post.title}
                            className="w-full h-[500px] object-cover rounded-[3rem] shadow-2xl mb-16 border-8 border-white"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=1200&q=80';
                            }}
                        />
                    ) : (
                        <div className="w-full h-[400px] bg-zinc-900 rounded-[3rem] mb-16 flex items-center justify-center text-white p-12 overflow-hidden relative shadow-2xl">
                            <span className="text-8xl font-serif font-bold opacity-10 absolute -right-8 -bottom-8 rotate-12">{post.title}</span>
                            <h1 className="text-5xl font-bold text-center relative z-10 leading-tight">{post.title}</h1>
                        </div>
                    )}
                    <h1 className="text-4xl sm:text-5xl font-bold text-[#18181B] leading-tight mb-4">
                        {post.title}
                    </h1>
                    <p className="text-xl text-[#3F3F46] leading-relaxed">
                        {post.description}
                    </p>
                </header>

                <div
                    className="blog-content prose prose-lg max-w-none 
            prose-headings:text-[#18181B] prose-headings:font-bold
            prose-p:text-[#3F3F46] prose-p:leading-relaxed
            prose-img:rounded-2xl prose-img:shadow-lg prose-img:my-10
            prose-a:text-[#EC4899] prose-a:font-semibold hover:prose-a:underline"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                />

                <div className="mt-24 pt-12 border-t border-zinc-200 text-center">
                    <button
                        onClick={onBack}
                        className="bg-[#18181B] text-white px-8 py-3 rounded-full hover:bg-zinc-800 transition-all font-semibold"
                    >
                        Check more articles
                    </button>
                </div>
            </div>
        </article>
    );
}
