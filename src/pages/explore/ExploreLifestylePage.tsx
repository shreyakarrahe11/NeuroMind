import React from 'react';
import { ExploreLayout } from '../../components/explore/ExploreLayout';
import { ExploreCTA } from '../../components/explore/ExploreCTA';
import { motion } from 'motion/react';
import { HeartPulse, Moon, Activity as ActivityIcon, Cigarette, Wine, ActivitySquare } from 'lucide-react';

export const ExploreLifestylePage: React.FC = () => {
  return (
    <ExploreLayout>
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 bg-[#F9F5FF] overflow-hidden">
        <div className="absolute right-0 top-0 w-1/3 h-full bg-purple-50 -z-10 rounded-l-[100px]" />
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-20 h-20 rounded-[2rem] bg-purple-100 text-purple-600 flex items-center justify-center shadow-lg"
              >
                <HeartPulse className="w-10 h-10" />
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl md:text-6xl font-heading font-bold text-[#4A2333] tracking-tight leading-tight"
              >
                Tell Us About Your Everyday Life
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xl md:text-2xl text-slate-600 font-medium max-w-lg"
              >
                A few questions about sleep, exercise, habits, and health help complete your assessment.
              </motion.p>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 grid grid-cols-2 gap-4">
                <div className="bg-purple-50 rounded-2xl p-6 flex flex-col items-center gap-3 text-purple-600">
                  <Moon className="w-8 h-8" />
                  <span className="font-bold">Sleep</span>
                </div>
                <div className="bg-purple-50 rounded-2xl p-6 flex flex-col items-center gap-3 text-purple-600">
                  <ActivityIcon className="w-8 h-8" />
                  <span className="font-bold">Exercise</span>
                </div>
                <div className="bg-purple-50 rounded-2xl p-6 flex flex-col items-center gap-3 text-purple-600">
                  <Wine className="w-8 h-8" />
                  <span className="font-bold">Alcohol</span>
                </div>
                <div className="bg-purple-50 rounded-2xl p-6 flex flex-col items-center gap-3 text-purple-600">
                  <ActivitySquare className="w-8 h-8" />
                  <span className="font-bold">Health History</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-[#4A2333]">Simple Questions</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="bg-[#FDF8F5] p-8 rounded-[2rem] border border-slate-100 flex gap-6">
              <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <Moon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#4A2333] mb-2">How many hours do you usually sleep?</h3>
                <p className="text-slate-600">How would you describe your sleep?</p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex gap-6">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <ActivityIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#4A2333] mb-2">How much physical activity do you usually get?</h3>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex gap-6">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Cigarette className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#4A2333] mb-2">Do you currently smoke?</h3>
              </div>
            </div>

            <div className="bg-[#FDF8F5] p-8 rounded-[2rem] border border-slate-100 flex gap-6">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Wine className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#4A2333] mb-2">How often do you drink alcohol?</h3>
              </div>
            </div>

            <div className="bg-slate-50 md:col-span-2 p-8 rounded-[2rem] border border-slate-100 flex gap-6">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <ActivitySquare className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#4A2333] mb-2">Do you have any of these health conditions?</h3>
                <p className="text-slate-600">Select from a list of common conditions.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ExploreCTA title="Ready to tell us about your lifestyle?" buttonText="START LIFESTYLE ASSESSMENT" />
    </ExploreLayout>
  );
};
