import { useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useAssessment } from '../../context/AssessmentContext';
import logoImage from '../../assets/logo.png';

const quickLinks = [
  { label: 'Home', href: '/' },
  { label: 'About NeuroMind', href: '/about' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Assessment', href: '/assessment' },
];

const termsContent = [
  'Results may not always be accurate and can vary based on the information provided.',
  'Please consult a qualified doctor or healthcare professional before making any health-related decisions.',
];

const privacyContent = [
  'Privacy: Your personal and assessment information should be kept confidential and handled securely.',
  'Do not share your reports with unauthorized individuals.',
];

export function Footer() {
  const [activePolicy, setActivePolicy] = useState<'terms' | 'privacy' | null>(null);
  const { navigateTo } = useAssessment();

  return (
    <>
      {activePolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B101A]/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#4A2333] p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-white">
                {activePolicy === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'}
              </h3>
              <button
                type="button"
                onClick={() => setActivePolicy(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/80 transition hover:bg-white/10 hover:text-white"
                aria-label="Close policy dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 rounded-xl border border-white/10 bg-[#391826] p-4 text-sm leading-6 text-white/75">
              {(activePolicy === 'terms' ? termsContent : privacyContent).map((item, index) => (
                <p key={item + index}>{item}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      <footer className="bg-[#4A2333] text-white pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-14 mb-12"
          >
          <div className="lg:pr-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 shadow-sm ring-1 ring-white/10">
                <img src={logoImage} alt="NeuroMind Logo" className="h-full w-full object-cover" />
              </div>
              <span className="font-bold text-2xl tracking-tight text-white">
                NeuroMind
              </span>
            </div>
            <p className="leading-relaxed text-sm text-white/70 max-w-sm">
              Understanding cognitive health through structured assessment, meaningful insights, and explainable results.
            </p>
          </div>

          <div>
            <h3 className="text-white text-lg font-bold mb-5 tracking-wide">Quick Links</h3>
            <ul className="space-y-3.5">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <button
                    type="button"
                    onClick={() => navigateTo(link.href)}
                    className="text-white/70 hover:text-[#F29D88] transition-colors flex items-center gap-3 group text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F29D88] rounded-sm"
                  >
                    <ArrowRight className="w-4 h-4 text-[#F29D88] group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:pl-4">
            <h3 className="text-white text-lg font-bold mb-5 tracking-wide">Project Information</h3>
            <ul className="space-y-3 text-sm text-white/70 leading-relaxed">
              <li className="font-semibold text-white">NeuroMind</li>
              <li>Multimodal Cognitive Screening &amp; Research Platform</li>
              <li className="text-white/60">A final-year B.Tech capstone project — GHRCE, Nagpur.</li>
            </ul>
          </div>
        </motion.div>

        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
          <p className="text-white/60">&copy; {new Date().getFullYear()} NeuroMind. All Rights Reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-white/60">
            <button
              type="button"
              onClick={() => setActivePolicy('terms')}
              className="hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-[#F29D88] rounded-sm"
            >
              Terms &amp; Conditions
            </button>
            <button
              type="button"
              onClick={() => setActivePolicy('privacy')}
              className="hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-[#F29D88] rounded-sm"
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </div>
    </footer>
    </>
  );
}
