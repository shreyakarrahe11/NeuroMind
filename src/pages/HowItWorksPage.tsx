import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ChevronRight, Brain, Mic, NotebookText, Activity, ScrollText } from 'lucide-react';
import { useAssessment } from '../context/AssessmentContext';
import { useSafeUser } from '../components/auth/ClerkBridge';
import { LandingNavbar } from '../components/landing/LandingNavbar';
import { Footer } from '../components/landing/Footer';
import { ScrollToTop } from '../components/landing/ScrollToTop';
import { TopProgressBar } from '../components/landing/TopProgressBar';
import { pageTitleBackground, serviceImage } from '../assets';

export const HowItWorksPage: React.FC = () => {
  const { navigateTo, user } = useAssessment();
  const { isSignedIn } = useSafeUser();
  const isAuthenticated = isSignedIn || user.isAuthenticated;
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      number: '01',
      title: 'Start',
      description: 'Begin the guided assessment and enter basic patient information.',
      icon: Brain,
    },
    {
      number: '02',
      title: 'Respond',
      description: 'Complete four short activities: speech, memory, attention, and a lifestyle questionnaire.',
      icon: Mic,
    },
    {
      number: '03',
      title: 'Process',
      description: 'Each modality is prepared and passed to its own dedicated model.',
      icon: NotebookText,
    },
    {
      number: '04',
      title: 'Analyse',
      description: 'A multi-agent pipeline fuses the four results and generates an explanation for each one.',
      icon: Activity,
    },
    {
      number: '05',
      title: 'Report',
      description: 'Findings, evidence, and explanations are presented in a clear clinical-style report.',
      icon: ScrollText,
    },
  ];

  return (
    <div
      className="font-sans antialiased text-[#6C5D62] selection:bg-[#F29D88] selection:text-white overflow-x-hidden min-h-screen"
      style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.88), rgba(255,255,255,0.94)), url(${pageTitleBackground})`,
        backgroundAttachment: 'fixed',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <TopProgressBar />
      <LandingNavbar isAuthenticated={isAuthenticated} />

      <main className="pt-20 relative z-10">
        <section className="relative py-24 lg:py-28 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(247,163,140,0.2),transparent_25%),radial-gradient(circle_at_bottom_right,rgba(170,194,255,0.16),transparent_30%)]" />
          <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center space-y-8 mb-16"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-[#E8D6CE] bg-white/75 px-4 py-2 text-sm font-semibold text-[#7F5F66] shadow-sm backdrop-blur">
                <Brain className="h-4 w-4" />
                Guided cognitive journey
              </div>

              <h1 className="text-5xl md:text-6xl font-heading font-black tracking-tight text-[#4A2333] leading-[1.04]">
                From your response to your report
              </h1>

              <p className="text-xl md:text-2xl text-slate-600 font-medium max-w-3xl mx-auto leading-relaxed">
                See how NeuroMind turns assessment responses into a structured report.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative py-8"
            >
              <div className="grid grid-cols-5 gap-4 md:gap-6">
                {steps.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.title} className="relative flex flex-col items-center text-center">
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: i * 0.1 }}
                        className={`flex h-16 w-16 items-center justify-center rounded-full border-2 ${
                          i <= activeStep
                            ? 'border-[#F29D88] bg-[#F29D88] text-white shadow-lg shadow-[#F29D88]/20'
                            : 'border-[#E6D9D1] bg-white/80 text-[#4A2333]'
                        }`}
                      >
                        <Icon className="h-7 w-7" />
                      </motion.div>

                      <div className="mt-3 text-xs md:text-sm font-bold uppercase tracking-[0.2em] text-[#A76A5B]">{step.number}</div>
                      <p className="mt-1 text-base md:text-lg font-semibold text-[#4A2333]">{step.title}</p>

                      {i < steps.length - 1 && (
                        <div className="absolute right-[-18%] top-8 hidden md:block">
                          <ChevronRight className="h-5 w-5 text-[#D7B3A8]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </section>

        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-4xl md:text-5xl font-heading font-bold tracking-tight text-[#4A2333] mb-16 text-center"
            >
              The process
            </motion.h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
              {steps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: i * 0.08 }}
                    whileHover={{ y: -8, rotateX: 5, rotateY: -5 }}
                    onClick={() => setActiveStep(i)}
                    className={`cursor-pointer rounded-[1.8rem] border p-7 shadow-sm backdrop-blur-sm transition-all ${
                      i === activeStep
                        ? 'border-[#F29D88] bg-white shadow-[0_22px_48px_rgba(74,35,51,0.08)]'
                        : 'border-slate-100 bg-white/75 hover:border-[#F3C2AD]'
                    }`}
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F8E3DA] text-[#4A2333]">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-[#A76A5B]">{step.number}</div>
                    <h3 className="mt-2 text-2xl font-heading font-bold text-[#4A2333]">{step.title}</h3>
                    <p className="mt-3 text-slate-600 leading-relaxed">{step.description}</p>
                  </motion.div>
                );
              })}
            </div>

            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-12 rounded-[1.8rem] border border-[#EAD7CC] bg-white/80 p-8 shadow-[0_18px_40px_rgba(74,35,51,0.06)] backdrop-blur-sm"
            >
              <p className="text-lg text-slate-600 leading-relaxed">
                <span className="font-semibold text-[#4A2333]">{steps[activeStep].title}:</span> {steps[activeStep].description}
              </p>
            </motion.div>
          </div>
        </section>

        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="space-y-8"
              >
                <h2 className="text-4xl md:text-5xl font-heading font-bold tracking-tight text-[#4A2333] leading-[1.15]">
                  What happens behind the screen?
                </h2>
                <p className="text-lg text-slate-600 leading-relaxed">
                  The technology works in the background so the assessment experience remains simple for the user.
                </p>

                <div className="space-y-4">
                  {[
                    { label: 'Input', text: 'Your assessment responses across all four modalities are collected and validated.', icon: '📥' },
                    { label: 'Processing', text: 'Each modality is prepared and formatted for its own dedicated model.', icon: '⚙️' },
                    { label: 'Model analysis', text: 'Trained models score speech, memory, attention, and lifestyle independently.', icon: '🤖' },
                    { label: 'Multimodal fusion', text: 'A multi-agent pipeline combines the four results into one combined cognitive profile.', icon: '🔗' },
                    { label: 'Explainability (XAI)', text: 'SHAP-based explanations show which signals most influenced the result.', icon: '🔎' },
                    { label: 'Report', text: 'Findings and explanations are formatted into a clear, shareable report.', icon: '📄' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start gap-4 rounded-3xl border border-slate-100 bg-white/75 p-4 shadow-sm">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F8E3DA] text-xl">{item.icon}</div>
                      <div>
                        <h4 className="font-semibold text-[#4A2333] text-lg">{item.label}</h4>
                        <p className="text-slate-600">{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.12 }}
                className="relative mx-auto w-full max-w-xl"
              >
                <div className="absolute -inset-8 rounded-[2.5rem] bg-linear-to-br from-[#F7D9C4]/60 via-[#DCEAFF]/60 to-[#F9D4E3]/60 blur-2xl" />
                <motion.div
                  animate={{ y: [0, -10, 0], rotate: [0, 1.5, 0] }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                  whileHover={{ rotateY: 8, rotateX: -6, scale: 1.02 }}
                  className="relative overflow-hidden rounded-4xl border border-white/75 bg-white/75 p-4 shadow-[0_30px_80px_rgba(74,35,51,0.12)] backdrop-blur-xl"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <motion.img
                    src={serviceImage}
                    alt="Assessment flow preview"
                    className="h-104 w-full rounded-[1.4rem] object-cover"
                    whileHover={{ scale: 1.04 }}
                    transition={{ duration: 0.5 }}
                  />
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="max-w-4xl mx-auto px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="rounded-[2.5rem] bg-[#1E2430] px-8 py-12 text-white shadow-[0_25px_70px_rgba(30,36,48,0.25)]"
            >
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-white leading-tight">
                Your report is a starting point
              </h2>
              <p className="mt-5 text-lg text-slate-300 leading-relaxed">
                NeuroMind provides an assessment output for awareness and understanding. It is not a medical diagnosis or a replacement for professional clinical evaluation.
              </p>

              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigateTo(isAuthenticated ? '/assessment' : '/login')}
                className="mt-8 inline-flex items-center justify-center gap-2 bg-[#F29D88] text-white px-8 py-4 rounded-full font-semibold shadow-lg shadow-[#F29D88]/20 transition hover:bg-[#E68670]"
              >
                Start assessment <ArrowRight className="w-5 h-5" />
              </motion.button>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
};
