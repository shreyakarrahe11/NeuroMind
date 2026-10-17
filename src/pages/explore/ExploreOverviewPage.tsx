import React from 'react';
import { ExploreLayout } from '../../components/explore/ExploreLayout';
import { ExploreCTA } from '../../components/explore/ExploreCTA';
import { motion } from 'motion/react';
import { Mic, Brain, Activity, HeartPulse, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAssessment } from '../../context/AssessmentContext';
import serviceImage from '../../assets/service1-1.png';
import aboutImage from '../../assets/about-1-1.png';
import chooseUsImage from '../../assets/choose-us-1-1.png';

export const ExploreOverviewPage: React.FC = () => {
  const { navigateTo } = useAssessment();

  const features = [
    {
      id: 'speech',
      icon: Mic,
      title: 'Talk',
      desc: 'Record or upload your voice.',
      color: 'text-red-600',
      bg: 'bg-red-50',
      route: '/explore/speech',
      accent: 'from-red-500 to-pink-500'
    },
    {
      id: 'memory',
      icon: Brain,
      title: 'Remember',
      desc: 'Complete simple memory activities.',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      route: '/explore/memory',
      accent: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'attention',
      icon: Activity,
      title: 'Focus',
      desc: 'Take attention and reaction activities.',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      route: '/explore/attention',
      accent: 'from-amber-500 to-orange-500'
    },
    {
      id: 'lifestyle',
      icon: HeartPulse,
      title: 'Answer',
      desc: 'Questions about your daily habits.',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      route: '/explore/lifestyle',
      accent: 'from-violet-500 to-fuchsia-500'
    }
  ];

  const expectations = [
    {
      title: 'Speech',
      desc: 'You will read a short passage aloud or provide a recording.'
    },
    {
      title: 'Memory',
      desc: 'You will remember pictures and answer simple recall questions.'
    },
    {
      title: 'Attention',
      desc: 'You will complete short activities using pictures, sounds, music, and video.'
    },
    {
      title: 'Lifestyle',
      desc: 'You will answer a few questions about sleep, exercise, habits, and health.'
    }
  ];

  const benefits = [
    {
      title: 'Guided',
      desc: 'You are taken through each activity step by step.'
    },
    {
      title: 'Interactive',
      desc: 'You do the activities yourself instead of simply filling in a score.'
    },
    {
      title: 'Easy to Follow',
      desc: 'Clear instructions and simple screens make the assessment easy to understand.'
    },
    {
      title: 'Complete',
      desc: 'Several areas are looked at together rather than relying on only one activity.'
    }
  ];

  const highlightCards = [
    { title: 'Speech scan', image: serviceImage },
    { title: 'Memory check', image: aboutImage },
    { title: 'Attention & routine', image: chooseUsImage }
  ];

  return (
    <ExploreLayout>
      <section className="relative pt-28 pb-20 lg:pt-36 lg:pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(247,163,140,0.25),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(170,194,255,0.2),_transparent_30%)]" />
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-8 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 rounded-full border border-[#E8D6CE] bg-white/75 px-4 py-2 text-sm font-semibold text-[#7F5F66] shadow-sm backdrop-blur"
              >
                <Sparkles className="h-4 w-4" />
                Interactive cognitive screening
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="text-5xl md:text-6xl font-heading font-black text-[#4A2333] tracking-tight leading-[1.02]"
              >
                Understand your cognitive health with a more complete picture.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14 }}
                className="max-w-xl text-xl md:text-2xl text-slate-600 font-medium"
              >
                NeuroMind combines voice, memory, focus, and everyday health insights into one simple, guided experience.
              </motion.p>

            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96, rotate: -4 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.12, duration: 0.7 }}
              className="relative mx-auto w-full max-w-xl"
            >
              <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-[#F7D9C4]/60 via-[#DCEAFF]/60 to-[#F9D4E3]/60 blur-2xl" />

              <motion.div
                animate={{ y: [0, -14, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                className="relative rounded-[2rem] border border-white/70 bg-white/70 p-4 shadow-[0_30px_80px_rgba(74,35,51,0.12)] backdrop-blur-xl"
              >
                <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-100">
                  <img src={serviceImage} alt="Cognitive assessment preview" className="h-[420px] w-full object-cover" />
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-heading font-bold text-[#4A2333] mb-4">How it Works</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Together, these activities create a more complete assessment experience. Your completed assessment is reviewed together.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            <div className="hidden lg:block absolute left-8 right-8 top-1/2 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent -translate-y-1/2" />

            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.08 }}
                  whileHover={{ y: -8, rotateX: 8, rotateY: -8, scale: 1.02 }}
                  className="group relative cursor-pointer rounded-[2rem] border border-slate-100 bg-white/80 p-7 shadow-[0_20px_50px_rgba(74,35,51,0.08)] backdrop-blur-sm"
                  onClick={() => navigateTo(feature.route)}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div className={`absolute inset-x-5 top-0 h-1 rounded-b-full bg-gradient-to-r ${feature.accent}`} />
                  <div className={`mb-6 flex h-20 w-20 items-center justify-center rounded-2xl ${feature.bg} ${feature.color} shadow-md`}>
                    <Icon className="h-8 w-8" />
                  </div>
                  <h3 className="mb-3 text-2xl font-bold text-slate-800">{feature.title}</h3>
                  <p className="mb-6 text-slate-600">{feature.desc}</p>
                  <span className="inline-flex items-center gap-2 text-sm font-bold text-[#4A2333] transition-all group-hover:gap-3">
                    VIEW DETAILS <ArrowRight className="h-4 w-4" />
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-[#4A2333]">What will I do?</h2>
          </div>

          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] items-center">
            <div className="grid gap-5">
              {expectations.map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -18 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.06 }}
                  className="rounded-[1.5rem] border border-slate-100 bg-white/80 p-5 shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1 rounded-full bg-[#FCE6DF] p-2 text-[#4A2333]">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[#4A2333]">{item.title}</h3>
                      <p className="mt-1 text-slate-600">{item.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, x: 18 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-[#F7D9C4]/40 via-[#EAF0FF]/40 to-[#F8D4E7]/40 blur-2xl" />
              <div className="relative grid gap-5 lg:grid-cols-3">
                {highlightCards.map((card, idx) => (
                  <motion.div
                    key={card.title}
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 5 + idx, repeat: Infinity, ease: 'easeInOut', delay: idx * 0.4 }}
                    whileHover={{ scale: 1.03, rotate: idx % 2 === 0 ? -2 : 2 }}
                    className="overflow-hidden rounded-[1.8rem] border border-white/70 bg-white/75 p-2 shadow-[0_25px_60px_rgba(74,35,51,0.12)] backdrop-blur"
                  >
                    <img src={card.image} alt={card.title} className="h-64 w-full rounded-[1.2rem] object-cover" />
                    <div className="px-2 py-4">
                      <p className="text-lg font-bold text-[#4A2333]">{card.title}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-[#4A2333]">Why choose NeuroMind?</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16 max-w-5xl mx-auto">
            {benefits.map((benefit, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="flex flex-col gap-3 rounded-[1.5rem] border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur-sm"
              >
                <h3 className="text-2xl font-bold text-slate-800">{benefit.title}</h3>
                <p className="text-lg text-slate-600">{benefit.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <div className="rounded-[2.5rem] bg-[#1E2430] p-10 text-white shadow-[0_25px_70px_rgba(30,36,48,0.25)]">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-white">After your assessment</h2>

            <div className="mt-10 space-y-6 text-xl font-medium text-slate-300">
              <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                Complete the activities
              </motion.div>
              <div className="text-slate-500">↓</div>
              <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.15 }}>
                Your results are reviewed
              </motion.div>
              <div className="text-slate-500">↓</div>
              <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }}>
                You can see your assessment summary
              </motion.div>
              <div className="text-slate-500">↓</div>
              <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.45 }} className="text-white font-bold text-2xl">
                You can view a clear report
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      <ExploreCTA />
    </ExploreLayout>
  );
};
