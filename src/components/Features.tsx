import { motion } from "motion/react";
import { ShieldCheck, Scissors, Droplets, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Features() {
  const { t } = useTranslation();
  const features = [
    {
      name: t('features.f1Title'),
      description: t('features.f1Desc'),
      icon: Scissors,
    },
    {
      name: t('features.f2Title'),
      description: t('features.f2Desc'),
      icon: ShieldCheck,
    },
    {
      name: t('features.f3Title'),
      description: t('features.f3Desc'),
      icon: Sparkles,
    },
    {
      name: t('features.f4Title'),
      description: t('features.f4Desc'),
      icon: Droplets,
    },
  ];

  return (
    <section
      id="features"
      className="py-24 bg-zinc-50 border-t border-zinc-100"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-sm font-semibold text-emerald-600 tracking-wide uppercase">
            {t('features.subtitle')}
          </h2>
          <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
            {t('features.title')}
          </p>
          <p className="mt-4 max-w-2xl text-xl text-zinc-500 mx-auto">
            {t('features.desc')}
          </p>
        </div>

        <div className="mt-20">
          <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative bg-white p-8 rounded-2xl shadow-sm border border-zinc-100 hover:shadow-md transition-shadow"
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <span className="flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 ring-8 ring-zinc-50">
                    <feature.icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-8 text-center">
                  <h3 className="text-lg font-medium text-zinc-900">
                    {feature.name}
                  </h3>
                  <p className="mt-4 text-base text-zinc-500 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
