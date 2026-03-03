import { useState } from "react";
import Header from "./components/Header";
import Hero from "./components/Hero";
import PreviewSection from "./components/PreviewSection";
import GallerySection from "./components/GallerySection";
import Features from "./components/Features";
import FAQ from "./components/FAQ";
import Footer from "./components/Footer";
import ContactList from "./components/ContactList";

export type ViewState = "home" | "contact-list";

export default function App() {
  const [view, setView] = useState<ViewState>("home");

  return (
    <div className="min-h-screen bg-white font-sans text-zinc-900 selection:bg-emerald-200 selection:text-emerald-900">
      <Header setView={setView} currentView={view} />
      <main>
        {view === "home" ? (
          <>
            <Hero />
            <PreviewSection />
            <GallerySection />
            <Features />
            <FAQ />
          </>
        ) : (
          <ContactList onBack={() => setView("home")} />
        )}
      </main>
      <Footer />
    </div>
  );
}
