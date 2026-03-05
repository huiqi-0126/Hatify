import { useEffect, useState } from "react";
import blogData from "../data/blog.json";

interface BlogPostProps {
    postId: string;
    onBack: () => void;
}

export default function BlogPost({ postId, onBack }: BlogPostProps) {
    const post = blogData.find((p) => p.id === postId);

    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
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
            prose-a:text-[#EC4899] prose-a:font-semibold hover:prose-a:underline
            [&_h1:first-of-type]:hidden"
                    dangerouslySetInnerHTML={{
                        __html: post.content.replace(
                            /src="(?:\/)?blog_content/g,
                            `src="${import.meta.env.BASE_URL || '/'}blog_content`
                        )
                    }}
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

            {/* Back to Top Button */}
            {showScrollTop && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-10 right-10 z-50 p-5 bg-emerald-600 text-white rounded-full shadow-2xl hover:bg-emerald-700 transition-all active:scale-90 group"
                    title="Back to Top"
                >
                    <svg className="w-6 h-6 group-hover:-translate-y-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                </button>
            )}
        </article>
    );
}
