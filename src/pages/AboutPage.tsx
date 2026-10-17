import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Brain, ShieldCheck, Sparkles, Target, GraduationCap } from 'lucide-react';
import { useAssessment } from '../context/AssessmentContext';
import { LandingNavbar } from '../components/landing/LandingNavbar';
import { Footer } from '../components/landing/Footer';
import { ScrollToTop } from '../components/landing/ScrollToTop';
import { TopProgressBar } from '../components/landing/TopProgressBar';
import { useSafeUser } from '../components/auth/ClerkBridge';
import { aboutIllustration, pageTitleBackground } from '../assets';

export const AboutPage: React.FC = () => {
  const { navigateTo, user } = useAssessment();
  const { isSignedIn } = useSafeUser();
  const isAuthenticated = isSignedIn || user.isAuthenticated;

  const features = [
    {
      title: 'Multimodal',
      description: 'Speech, memory, attention, and lifestyle are assessed together, not as isolated tests.',
      icon: Brain,
    },
    {
      title: 'Explainable',
      description: 'Every prediction comes with a plain-language explanation of what drove it, not just a score.',
      icon: Sparkles,
    },
    {
      title: 'Responsible',
      description: 'Designed to support awareness and encourage professional evaluation, never to replace it.',
      icon: ShieldCheck,
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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(247,163,140,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(170,194,255,0.2),transparent_28%)]" />
          <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
            <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="space-y-8 text-center lg:text-left"
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-[#E8CFC6] bg-white/70 px-4 py-2 text-sm font-semibold text-[#7A4D57] shadow-sm backdrop-blur">
                  <Brain className="h-4 w-4" />
                  Multimodal cognitive screening platform
                </div>

                <h1 className="text-5xl md:text-6xl font-heading font-black tracking-tight text-[#4A2333] leading-[1.04]">
                  A different way to look at cognitive health
                </h1>

                <p className="max-w-xl text-xl md:text-2xl text-slate-600 font-medium leading-relaxed">
                  NeuroMind is a multimodal cognitive screening and research platform that brings together speech, memory, attention, and contextual signals — designed to support research and early awareness, not diagnosis.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.96, rotate: -3 }}
                whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.1 }}
                style={{ transformStyle: 'preserve-3d' }}
                whileHover={{ rotateY: 6, rotateX: -6, scale: 1.02 }}
                className="relative mx-auto w-full max-w-xl"
              >
                <div className="absolute -inset-8 rounded-[2.5rem] bg-linear-to-br from-[#F7D9C4]/60 via-[#DCEAFF]/60 to-[#F9D4E3]/60 blur-2xl" />
                <motion.div
                  animate={{ y: [0, -12, 0], rotate: [0, 1.5, 0] }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative overflow-hidden rounded-4xl border border-white/70 bg-white/75 p-4 shadow-[0_30px_80px_rgba(74,35,51,0.12)] backdrop-blur-xl"
                >
                  <motion.img
                    src={aboutIllustration}
                    alt="NeuroMind mind map"
                    className="h-107.5 w-full rounded-[1.4rem] object-cover"
                    whileHover={{ scale: 1.04 }}
                    transition={{ duration: 0.5 }}
                  />
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-12 items-center mb-20">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                style={{ transformStyle: 'preserve-3d' }}
                whileHover={{ rotateY: -8, rotateX: 6, y: -8 }}
                className="relative rounded-4xl border border-white/70 bg-white/75 p-5 shadow-[0_20px_50px_rgba(74,35,51,0.08)] backdrop-blur-sm"
              >
                <motion.img
                  src={aboutIllustration}
                  alt="Person centered support"
                  className="h-90 w-full rounded-3xl object-cover"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                  whileHover={{ scale: 1.03 }}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-4xl md:text-5xl font-heading font-bold tracking-tight text-[#4A2333] leading-[1.15] mb-4">
                    Why we built NeuroMind
                  </h2>
                  <p className="text-lg text-slate-600 leading-relaxed">
                    Cognitive changes can be subtle and different for everyone, and rarely show up in just one place. NeuroMind was built to assess speech, memory, attention, and lifestyle together through a coordinated multi-agent AI pipeline, then explain what each result means in plain language rather than a single opaque score.
                  </p>
                </div>

                <div className="space-y-5 pt-4">
                  {features.map((feature, i) => {
                    const Icon = feature.icon;
                    return (
                      <motion.div
                        key={feature.title}
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: i * 0.12 }}
                        whileHover={{ y: -6, rotateX: 4 }}
                        className="flex gap-4 rounded-3xl border border-slate-100 bg-white/75 p-5 shadow-sm"
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F8E3DA] text-[#4A2333] shadow-sm">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-[#4A2333] mb-1 text-lg">{feature.title}</h3>
                          <p className="text-slate-600">{feature.description}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </div>
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
                  Our vision
                </h2>
                <p className="text-xl text-slate-600 leading-relaxed">
                  To make early cognitive assessment more approachable while encouraging timely professional guidance when concerns arise.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.12 }}
                style={{ transformStyle: 'preserve-3d' }}
                whileHover={{ rotateY: 7, rotateX: -5, y: -8 }}
                className="relative rounded-4xl border border-white/70 bg-white/75 p-4 shadow-[0_30px_75px_rgba(74,35,51,0.12)] backdrop-blur-xl"
              >
                <motion.div
                  animate={{ y: [0, -10, 0], rotate: [0, -1.2, 0] }}
                  transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100"
                >
                  <motion.img
                    src={aboutIllustration}
                    alt="Focused assessment journey"
                    className="h-90 w-full object-cover"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.5 }}
                  />
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-[#F8F4EE]">
          <div className="max-w-5xl mx-auto px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center max-w-2xl mx-auto mb-14"
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#7A4D57] shadow-sm mb-6">
                <GraduationCap className="h-4 w-4" />
                Academic capstone project
              </div>
              <h2 className="text-3xl md:text-4xl font-heading font-bold tracking-tight text-[#4A2333] leading-[1.15] mb-4">
                Built as a final-year project
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                NeuroMind is being developed by a B.Tech Computer Science team at G. H. Raisoni College of Engineering (GHRCE), Nagpur, under faculty guidance, as a multimodal cognitive screening and research platform.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-3 gap-6 mb-12">
              {[
                { label: 'Institution', value: 'GHRCE, Nagpur' },
                { label: 'Focus Area', value: 'Multimodal Cognitive Screening' },
                { label: 'Status', value: 'Active Final-Year Project' },
              ].map((item) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="rounded-3xl border border-white bg-white/80 p-6 text-center shadow-sm"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#A76A5B] mb-2">{item.label}</p>
                  <p className="text-lg font-semibold text-[#4A2333]">{item.value}</p>
                </motion.div>
              ))}
            </div>

            <p className="max-w-2xl mx-auto text-center text-sm text-slate-500 leading-relaxed">
              NeuroMind is a research prototype developed for academic purposes. It is not a certified diagnostic tool and does not replace professional medical evaluation.
            </p>
          </div>
        </section>

        <section className="py-24">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="rounded-[2.5rem] bg-[#1E2430] px-8 py-12 text-white shadow-[0_25px_70px_rgba(30,36,48,0.25)]"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100">
                <Target className="h-4 w-4" />
                See the complete flow
              </div>

              <h2 className="mt-8 text-3xl md:text-4xl font-heading font-bold text-white leading-tight">
                See how NeuroMind works
              </h2>
              <p className="mt-4 text-lg text-slate-300 leading-relaxed">
                Follow the journey from assessment input to the final report.
              </p>

              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigateTo('/how-it-works')}
                className="mt-8 inline-flex items-center gap-2 bg-[#F29D88] text-white px-8 py-4 rounded-full font-semibold shadow-lg shadow-[#F29D88]/20 transition hover:bg-[#E68670]"
              >
                How it works <ArrowRight className="w-5 h-5" />
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
