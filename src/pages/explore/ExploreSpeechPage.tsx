import React from 'react';
import { ExploreLayout } from '../../components/explore/ExploreLayout';
import { ExploreCTA } from '../../components/explore/ExploreCTA';
import { motion } from 'motion/react';
import { Mic, UploadCloud, BookOpen, Volume2, CheckCircle2 } from 'lucide-react';

export const ExploreSpeechPage: React.FC = () => {
  return (
    <ExploreLayout>
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 bg-[#FFF5F5] overflow-hidden">
        <div className="absolute right-0 top-0 w-1/3 h-full bg-red-50 -z-10 rounded-l-[100px]" />
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-20 h-20 rounded-[2rem] bg-red-100 text-red-600 flex items-center justify-center shadow-lg"
              >
                <Mic className="w-10 h-10" />
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl md:text-6xl font-heading font-bold text-[#4A2333] tracking-tight leading-tight"
              >
                Let Your Voice Be Part of the Assessment
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xl md:text-2xl text-slate-600 font-medium max-w-lg"
              >
                You can read a short passage aloud or upload a recording.
              </motion.p>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col items-center space-y-6">
                <div className="w-full flex justify-center">
                  <div className="w-32 h-32 rounded-full bg-red-50 flex items-center justify-center animate-pulse">
                    <Mic className="w-12 h-12 text-red-400" />
                  </div>
                </div>
                <div className="flex gap-2">
                  {[1,2,3,4,5,4,3,2,1].map((h, i) => (
                    <div key={i} className="w-2 bg-red-300 rounded-full" style={{ height: `${h * 8}px` }} />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* What Happens */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-[#4A2333]">What happens?</h2>
          </div>
          
          <div className="space-y-16 max-w-5xl mx-auto">
            {/* Step 1 */}
            <div className="flex flex-col md:flex-row gap-12 items-center">
              <div className="w-full md:w-1/2 space-y-4">
                <div className="flex items-center gap-4 text-red-600 font-bold mb-2">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">1</div>
                  <span>Read</span>
                </div>
                <h3 className="text-2xl font-bold text-[#4A2333]">You will see a short and simple passage.</h3>
              </div>
              <div className="w-full md:w-1/2 bg-[#FDF8F5] p-8 rounded-3xl border border-slate-100">
                <p className="text-lg text-slate-700 italic font-serif leading-relaxed">
                  "Every morning, Maria opens the window. She watches the birds in the garden. The air feels cool and fresh. She makes a warm cup of tea. Then she sits quietly and reads a book."
                </p>
              </div>
            </div>

            {/* Step 2 & 3 */}
            <div className="flex flex-col md:flex-row-reverse gap-12 items-center">
              <div className="w-full md:w-1/2 space-y-4">
                <div className="flex items-center gap-4 text-red-600 font-bold mb-2">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">2</div>
                  <span>Speak</span>
                </div>
                <h3 className="text-2xl font-bold text-[#4A2333]">Read the passage aloud at a comfortable pace.</h3>
                <p className="text-lg text-slate-600">The screen helps you follow the passage as you read.</p>
              </div>
              <div className="w-full md:w-1/2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-center py-12">
                <div className="w-24 h-24 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/30">
                  <Mic className="w-10 h-10" />
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col md:flex-row gap-12 items-center">
              <div className="w-full md:w-1/2 space-y-4">
                <div className="flex items-center gap-4 text-red-600 font-bold mb-2">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">3</div>
                  <span>Finish</span>
                </div>
                <h3 className="text-2xl font-bold text-[#4A2333]">Your recording is saved.</h3>
                <p className="text-lg text-slate-600">It is added to the rest of your assessment.</p>
              </div>
              <div className="w-full md:w-1/2 bg-emerald-50 p-8 rounded-3xl border border-emerald-100 flex items-center justify-center py-12 text-emerald-600">
                 <CheckCircle2 className="w-20 h-20" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Record or Upload */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center space-y-16">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-[#4A2333]">Two ways to complete</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white p-10 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-2">
                <Mic className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-[#4A2333]">Record</h3>
              <p className="text-lg text-slate-600">Use your microphone to record your voice.</p>
            </div>
            
            <div className="bg-white p-10 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mb-2">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-[#4A2333]">Upload</h3>
              <p className="text-lg text-slate-600">Already have a recording? Upload it here.</p>
            </div>
          </div>
        </div>
      </section>

      <ExploreCTA title="Ready to try the Speech Assessment?" buttonText="START SPEECH ASSESSMENT" />
    </ExploreLayout>
  );
};
