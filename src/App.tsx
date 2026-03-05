import { useState, useEffect } from "react";
import Header from "./components/Header";
import Hero from "./components/Hero";
import PreviewSection from "./components/PreviewSection";
import GallerySection from "./components/GallerySection";
import Features from "./components/Features";
import FAQ from "./components/FAQ";
import Footer from "./components/Footer";
import ContactList from "./components/ContactList";

export type ViewState = "home" | "contact-list" | "blog" | "blog-post";

import BlogList from "./components/BlogList";
import BlogPost from "./components/BlogPost";

export default function App() {
  const [view, setView] = useState<ViewState>("home");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  useEffect(() => {
    // Basic routing logic for deep links - aware of subdirectories
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, "");
    const path = window.location.pathname;

    if (path.endsWith(base + '/Contact') || path.endsWith(base + '/Contact/')) {
      setView("contact-list");
    } else if (path.endsWith(base + '/Blog') || path.endsWith(base + '/Blog/')) {
      setView("blog");
    } else if (path.includes('/blog/')) {
      const parts = path.split('/');
      const id = parts[parts.length - 1];
      if (id) {
        setSelectedPostId(id);
        setView("blog-post");
      }
    }
  }, []);

  const handleSelectPost = (id: string) => {
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, "");
    setSelectedPostId(id);
    setView("blog-post");
    window.history.pushState({}, "", `${base}/blog/${id}`);
  };

  const handleBackToBlog = () => {
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, "");
    setView("blog");
    setSelectedPostId(null);
    window.history.pushState({}, "", `${base}/Blog`);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-zinc-900 selection:bg-emerald-200 selection:text-emerald-900">
      <Header setView={setView} currentView={view} />
      <main>
        {view === "home" && (
          <>
            <Hero />
            <PreviewSection />
            <GallerySection />
            <Features />
            <FAQ />
          </>
        )}
        {view === "contact-list" && (
          <ContactList onBack={() => setView("home")} />
        )}
        {view === "blog" && (
          <BlogList onSelectPost={handleSelectPost} />
        )}
        {view === "blog-post" && selectedPostId && (
          <BlogPost postId={selectedPostId} onBack={handleBackToBlog} />
        )}
      </main>
      <Footer setView={setView} />
    </div>
  );
}
