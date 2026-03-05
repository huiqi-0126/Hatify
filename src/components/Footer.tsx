import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Mail, Copy, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Footer({ setView }: { setView?: (view: 'home' | 'contact-list' | 'blog') => void }) {
  const { t } = useTranslation();
  const [modalContent, setModalContent] = useState<{ title: string, url?: string, type: 'iframe' | 'contact' | 'privacy' | 'terms' } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('support@dreambrand.studio');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <footer className="bg-[#f8f7f5] border-t border-zinc-200 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Left side: Logo and Slogan */}
          <div className="space-y-6">
            <div className="flex items-baseline">
              <button
                onClick={() => setView?.('home')}
                className="text-3xl font-serif font-bold tracking-tighter text-zinc-900"
              >
                Hatify
              </button>
              <span
                onClick={() => setView?.('contact-list')}
                className="text-3xl font-serif font-bold text-emerald-600 cursor-default select-none"
                title="Admin Entrance"
              >.</span>
            </div>
            <p className="text-zinc-600 text-base leading-relaxed max-w-md">
              {t('hero.desc')}
            </p>
          </div>

          {/* Right side: Links */}
          <div className="flex flex-col md:items-end justify-center">
            <ul className="space-y-4">
              <li className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-300"></div>
                <button
                  onClick={() => setModalContent({ title: t('footer.contactUs', 'Contact Us'), type: 'contact' })}
                  className="text-zinc-600 hover:text-zinc-900 transition-colors"
                >
                  {t('footer.contactUs', 'Contact Us')}
                </button>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-300"></div>
                <button
                  onClick={() => setModalContent({ title: t('footer.privacyPolicy', 'Privacy Policy'), type: 'privacy' })}
                  className="text-zinc-600 hover:text-zinc-900 transition-colors"
                >
                  {t('footer.privacyPolicy', 'Privacy Policy')}
                </button>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-300"></div>
                <button
                  onClick={() => setModalContent({ title: t('footer.termsOfService', 'Terms of Service'), type: 'terms' })}
                  className="text-zinc-600 hover:text-zinc-900 transition-colors"
                >
                  {t('footer.termsOfService', 'Terms of Service')}
                </button>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-300"></div>
                <button
                  onClick={() => {
                    setView?.('blog');
                    window.scrollTo(0, 0);
                  }}
                  className="text-zinc-600 hover:text-zinc-900 transition-colors"
                >
                  {t('footer.blog', 'Blog')}
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-zinc-200 flex justify-center md:justify-start">
          <p className="text-sm text-zinc-500">
            &copy; {new Date().getFullYear()} Hatify. All rights reserved.
          </p>
        </div>
      </div>

      {/* Modal for Footer Links */}
      <AnimatePresence>
        {modalContent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setModalContent(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-6 border-b border-zinc-100 shrink-0">
                <h3 className="text-xl font-serif font-bold text-zinc-900">
                  {modalContent.title}
                </h3>
                <button
                  onClick={() => setModalContent(null)}
                  className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 bg-zinc-50/50 overflow-y-auto">
                {modalContent.type === 'iframe' ? (
                  <div className="w-full h-[70vh] bg-white rounded-xl border border-zinc-200 overflow-hidden">
                    <iframe
                      src={modalContent.url}
                      className="w-full h-full border-0"
                      title={modalContent.title}
                    />
                  </div>
                ) : modalContent.type === 'contact' ? (
                  <div className="py-16 px-8 text-center bg-white rounded-xl border border-zinc-200">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Mail className="w-8 h-8" />
                    </div>
                    <h4 className="text-2xl font-serif font-bold text-zinc-900 mb-4">Get in Touch</h4>
                    <p className="text-lg text-zinc-600 mb-8 max-w-md mx-auto">
                      For questions about custom orders, collaborations, or general inquiries, please email us at:
                    </p>
                    <div className="flex items-center justify-center gap-4">
                      <a
                        href="mailto:support@dreambrand.studio"
                        className="text-2xl font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                      >
                        support@dreambrand.studio
                      </a>
                      <button
                        onClick={handleCopyEmail}
                        className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-colors"
                        title="Copy email address"
                      >
                        {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                ) : modalContent.type === 'privacy' ? (
                  <div className="py-8 px-8 text-left bg-white rounded-xl border border-zinc-200">
                    <div className="space-y-6 text-zinc-600">
                      <p className="text-sm text-zinc-400">Last updated: {new Date().toLocaleDateString()}</p>
                      <section>
                        <h4 className="text-lg font-bold text-zinc-900 mb-2">1. Introduction</h4>
                        <p>Welcome to Hatify. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website and tell you about your privacy rights and how the law protects you.</p>
                      </section>
                      <section>
                        <h4 className="text-lg font-bold text-zinc-900 mb-2">2. The Data We Collect</h4>
                        <p>We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                          <li><strong>Identity Data</strong> includes first name, last name, username or similar identifier.</li>
                          <li><strong>Contact Data</strong> includes billing address, delivery address, email address and telephone numbers.</li>
                          <li><strong>Transaction Data</strong> includes details about payments to and from you and other details of products and services you have purchased from us.</li>
                        </ul>
                      </section>
                      <section>
                        <h4 className="text-lg font-bold text-zinc-900 mb-2">3. How We Use Your Data</h4>
                        <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                          <li>Where we need to perform the contract we are about to enter into or have entered into with you.</li>
                          <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
                          <li>Where we need to comply with a legal obligation.</li>
                        </ul>
                      </section>
                      <section>
                        <h4 className="text-lg font-bold text-zinc-900 mb-2">4. Data Security</h4>
                        <p>We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed.</p>
                      </section>
                    </div>
                  </div>
                ) : modalContent.type === 'terms' ? (
                  <div className="py-8 px-8 text-left bg-white rounded-xl border border-zinc-200">
                    <div className="space-y-6 text-zinc-600">
                      <p className="text-sm text-zinc-400">Last updated: {new Date().toLocaleDateString()}</p>
                      <section>
                        <h4 className="text-lg font-bold text-zinc-900 mb-2">1. Acceptance of Terms</h4>
                        <p>By accessing and using Hatify, you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.</p>
                      </section>
                      <section>
                        <h4 className="text-lg font-bold text-zinc-900 mb-2">2. Custom Orders</h4>
                        <p>All custom hat designs are subject to review. We reserve the right to reject any design that violates our content guidelines, including but not limited to copyrighted material, offensive content, or inappropriate imagery.</p>
                      </section>
                      <section>
                        <h4 className="text-lg font-bold text-zinc-900 mb-2">3. Intellectual Property</h4>
                        <p>You retain all rights to the designs you submit. By submitting a design, you grant us a non-exclusive, worldwide, royalty-free license to produce the physical product and, with your permission, display it in our gallery.</p>
                      </section>
                      <section>
                        <h4 className="text-lg font-bold text-zinc-900 mb-2">4. Returns and Refunds</h4>
                        <p>Due to the custom nature of our products, we do not accept returns or exchanges unless the item is defective or there is a manufacturing error on our part. Please review your design carefully before submitting your order.</p>
                      </section>
                    </div>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </footer>
  );
}
