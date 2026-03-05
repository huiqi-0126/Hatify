import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import LanguageSelector from "./LanguageSelector";
import { ViewState } from "../App";

interface HeaderProps {
  setView: (view: ViewState) => void;
  currentView: ViewState;
}

export default function Header({ setView, currentView }: HeaderProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (window.location.pathname === "/Contact") {
      setView("contact-list");
    }
  }, [setView]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0 flex items-center">
            <button
              onClick={() => {
                setView("home");
                window.history.pushState({}, "", "/");
              }}
              className="text-2xl font-bold tracking-tighter text-zinc-900"
            >
              Hatify<span className="text-emerald-600">.</span>
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                setView("blog");
                window.history.pushState({}, "", "/Blog");
              }}
              className={`text-sm font-medium transition-colors hover:text-emerald-600 ${currentView === "blog" ? "text-emerald-600 font-bold" : "text-zinc-600"
                }`}
            >
              Blog
            </button>
            <LanguageSelector />
          </div>
        </div>
      </div>
    </header>
  );
}


