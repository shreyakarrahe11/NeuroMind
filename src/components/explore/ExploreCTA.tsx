import React from 'react';
import { useAssessment } from '../../context/AssessmentContext';
import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface ExploreCTAProps {
  title?: string;
  description?: string;
  buttonText?: string;
}

export const ExploreCTA: React.FC<ExploreCTAProps> = ({
  title = "Ready to begin?",
  description = "Take your time and complete each section at your own pace.",
  buttonText = "START ASSESSMENT",
}) => {
  const { user, navigateTo } = useAssessment();

  const handleStart = () => {
    if (user.isAuthenticated) {
      navigateTo('/assessment');
    } else {
      navigateTo('/login');
    }
  };

  return (
    <section className="py-24 bg-[#FDF8F5] relative overflow-hidden border-t border-[#F9EFEA]">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="space-y-8"
        >
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-[#4A2333] tracking-tight">
              {title}
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              {description}
            </p>
          </div>

          <button
            onClick={handleStart}
            className="inline-flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-[#4A2333] hover:bg-[#5D2E42] text-white font-bold text-lg shadow-xl shadow-[#4A2333]/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>{buttonText}</span>
            <ArrowRight className="w-6 h-6" />
          </button>
          
          <p className="text-sm font-semibold text-slate-500 pt-4">
            {user.isAuthenticated ? '→ Assessment Dashboard' : '→ Login / Create Account'}
          </p>
        </motion.div>
      </div>
    </section>
  );
};
