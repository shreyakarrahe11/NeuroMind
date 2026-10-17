import React from 'react';
import { ExploreLayout } from '../../components/explore/ExploreLayout';
import { ExploreCTA } from '../../components/explore/ExploreCTA';
import { motion } from 'motion/react';
import { Brain } from 'lucide-react';

export const ExploreMemoryPage: React.FC = () => {
  return (
    <ExploreLayout>
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 bg-[#F5F8FF] overflow-hidden">
        <div className="absolute right-0 top-0 w-1/3 h-full bg-blue-50 -z-10 rounded-l-[100px]" />
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-20 h-20 rounded-[2rem] bg-blue-100 text-blue-600 flex items-center justify-center shadow-lg"
              >
                <Brain className="w-10 h-10" />
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl md:text-6xl font-heading font-bold text-[#4A2333] tracking-tight leading-tight"
              >
                Remember. Recall. Recognize.
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xl md:text-2xl text-slate-600 font-medium max-w-lg"
              >
                You will complete a few short activities that ask you to remember and recognize familiar objects.
              </motion.p>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 h-80 flex items-center justify-center">
                <div className="text-8xl">🍎</div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="space-y-24 max-w-5xl mx-auto">
            {/* Step 1 */}
            <div className="flex flex-col md:flex-row gap-12 items-center">
              <div className="w-full md:w-1/2 space-y-4">
                <h3 className="text-3xl font-bold text-[#4A2333]">Remember the Pictures</h3>
                <p className="text-lg text-slate-600">You will see several pictures one at a time. Try to remember them.</p>
              </div>
              <div className="w-full md:w-1/2 bg-[#FDF8F5] p-12 rounded-[2rem] border border-slate-100 flex flex-col items-center justify-center">
                <div className="text-8xl mb-6">🍎</div>
                <div className="px-6 py-2 bg-white rounded-full text-sm font-bold text-slate-500 shadow-sm">
                  Object 1 of 10
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col md:flex-row-reverse gap-12 items-center">
              <div className="w-full md:w-1/2 space-y-4">
                <h3 className="text-3xl font-bold text-[#4A2333]">Tell Us What You Remember</h3>
                <p className="text-lg text-slate-600">Type the objects you remember.</p>
              </div>
              <div className="w-full md:w-1/2 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="space-y-4">
                  <div className="w-full p-4 rounded-xl border-2 border-blue-500 bg-blue-50 text-blue-900 font-medium">
                    Apple...
                  </div>
                  <div className="w-full p-4 rounded-xl border border-slate-200 text-slate-400">
                    Type here...
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 & 4 */}
            <div className="flex flex-col md:flex-row gap-12 items-center">
              <div className="w-full md:w-1/2 space-y-4">
                <div className="inline-block px-4 py-1 bg-slate-100 text-slate-600 rounded-full text-sm font-bold mb-2">
                  Later in the assessment
                </div>
                <h3 className="text-3xl font-bold text-[#4A2333]">Remember Again Later</h3>
                <p className="text-lg text-slate-600">After another short activity, you will be asked what you remember from earlier.</p>
              </div>
              <div className="w-full md:w-1/2 bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                <div className="text-center mb-6 text-[#4A2333] font-bold text-xl">Choose the Ones You Saw</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="aspect-square bg-white rounded-2xl flex items-center justify-center text-4xl shadow-sm border-2 border-emerald-500">🍎</div>
                  <div className="aspect-square bg-white rounded-2xl flex items-center justify-center text-4xl shadow-sm border border-slate-200 opacity-50">🚗</div>
                  <div className="aspect-square bg-white rounded-2xl flex items-center justify-center text-4xl shadow-sm border border-slate-200 opacity-50">🎸</div>
                  <div className="aspect-square bg-white rounded-2xl flex items-center justify-center text-4xl shadow-sm border-2 border-emerald-500">🚲</div>
                </div>
                <p className="text-center mt-6 text-sm text-slate-500">Select the pictures you remember seeing before.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ExploreCTA title="Ready to try the Memory Assessment?" buttonText="START MEMORY ASSESSMENT" />
    </ExploreLayout>
  );
};
