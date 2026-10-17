import React from 'react';
import { useAssessment } from '../context/AssessmentContext';
import { PatientInfoForm } from '../components/PatientInfoForm';
import { motion } from 'motion/react';
import {
  Mic,
  Brain,
  Activity,
  HeartPulse,
  Lock,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

export const AssessmentOverviewPage: React.FC = () => {
  const { session, navigateTo, resetAssessment } = useAssessment();
  const { status } = session;

  const sections = [
    {
      id: 'speech',
      title: 'Speech',
      description: 'Record or upload your speech sample.',
      route: '/speech',
      icon: Mic,
      iconBg: 'bg-red-50 text-red-600',
      isCompleted: status.speech,
      isLocked: false,
    },
    {
      id: 'memory',
      title: 'Memory',
      description: 'Complete memory tasks to assess recall and recognition.',
      route: '/memory',
      icon: Brain,
      iconBg: 'bg-blue-50 text-blue-600',
      isCompleted: status.memory,
      isLocked: !status.speech,
    },
    {
      id: 'attention',
      title: 'Attention',
      description: 'Complete tasks that evaluate attention and reaction time.',
      route: '/attention',
      icon: Activity,
      iconBg: 'bg-amber-50 text-amber-600',
      isCompleted: status.attention,
      isLocked: !status.speech || !status.memory,
    },
    {
      id: 'lifestyle',
      title: 'Lifestyle',
      description: 'Answer questions about your lifestyle and health.',
      route: '/lifestyle',
      icon: HeartPulse,
      iconBg: 'bg-purple-50 text-purple-600',
      isCompleted: status.lifestyle,
      isLocked: !status.speech || !status.memory || !status.attention,
    },
  ];

  const allCompleted = Object.values(status).every(Boolean);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
    },
  } as const;

  return (
    <div className="space-y-12 max-w-4xl mx-auto">
      {/* Screen 2 Header */}
      <div className="space-y-3">
        <h1 className="text-3xl md:text-4xl font-heading font-bold text-[#4A2333] tracking-tight">
          Assessment Overview
        </h1>
        <p className="text-base text-slate-500 font-medium">
          Complete all sections to generate your comprehensive cognitive report.
        </p>
      </div>
      
      <PatientInfoForm />

      {/* Screen 2 Assessment Cards List */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-5"
      >
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <motion.div
              key={section.id}
              variants={itemVariants}
              whileHover={{ scale: 1.01 }}
              className="p-6 md:p-8 bg-[#FDF8F5] rounded-[2rem] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 transition-colors hover:bg-[#F9EFEA]"
            >
              <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-2xl ${section.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className="w-7 h-7" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xl font-bold text-[#4A2333]">{section.title}</h3>
                  <p className="text-sm text-slate-500">{section.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-200/50">
                <span className={`text-sm font-semibold px-4 py-1.5 rounded-full ${
                  section.isCompleted
                    ? 'bg-emerald-100 text-emerald-800'
                    : section.isLocked
                    ? 'bg-slate-100 text-slate-400'
                    : 'bg-white text-slate-500'
                }`}>
                  {section.isCompleted ? 'Completed' : section.isLocked ? 'Locked' : 'Not started'}
                </span>
                <button
                  onClick={() => !section.isLocked && navigateTo(section.route)}
                  disabled={section.isLocked}
                  className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all ${
                    section.isLocked
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : section.isCompleted
                      ? 'bg-white hover:bg-slate-50 text-[#4A2333] border border-slate-200 cursor-pointer'
                      : 'bg-[#4A2333] hover:bg-[#5D2E42] text-white cursor-pointer'
                  }`}
                >
                  {section.isLocked ? (
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      <span>Locked</span>
                    </div>
                  ) : section.isCompleted ? 'View Status' : 'Start'}
                </button>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Screen 2 Bottom Action or Status Box */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FDF8F5] text-slate-500 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <span className="text-sm text-slate-500 font-medium">
            All sections are required to generate a complete assessment.
          </span>
        </div>
        {allCompleted && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigateTo('/review')}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#4A2333] hover:bg-[#5D2E42] text-white font-bold text-base transition-colors flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <span>Proceed to Review</span>
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        )}
        {!allCompleted && (
          <button
            onClick={resetAssessment}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-[#4A2333] font-bold text-sm transition-colors cursor-pointer shrink-0"
          >
            Start New Assessment
          </button>
        )}
      </motion.div>
    </div>
  );
};
