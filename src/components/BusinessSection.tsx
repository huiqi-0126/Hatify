import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { Briefcase, Truck, Users } from "lucide-react";

export default function BusinessSection() {
  const { t } = useTranslation();
  
  return (
    <section className="py-24 bg-white border-t border-zinc-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-4">
            Custom Hats for Businesses: Dropshipping & Bulk Orders
          </h2>
          <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
            Scale your brand with our premium headwear solutions. Perfect for merchandise, team gear, or corporate gifts.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-2">Bulk Orders</h3>
            <p className="text-zinc-600">Significant discounts for orders of 10+ hats. Premium quality for your entire team.</p>
          </div>
          <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-2">Dropshipping</h3>
            <p className="text-zinc-600">Seamless integration and reliable fulfillment for your e-commerce brand.</p>
          </div>
          <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-2">Brand Support</h3>
            <p className="text-zinc-600">Professional design assistance to ensure your logo looks perfect on every hat.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
