import React from 'react';
import { ExploreLayout } from '../../components/explore/ExploreLayout';
import { ExploreCTA } from '../../components/explore/ExploreCTA';
import { motion } from 'motion/react';
import { Activity, Play, Image as ImageIcon } from 'lucide-react';

export const ExploreAttentionPage: React.FC = () => {
  return (
    <ExploreLayout>
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 bg-[#FFFBF0] overflow-hidden">
        <div className="absolute right-0 top-0 w-1/3 h-full bg-amber-50 -z-10 rounded-l-[100px]" />
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-20 h-20 rounded-[2rem] bg-amber-100 text-amber-600 flex items-center justify-center shadow-lg"
              >
                <Activity className="w-10 h-10" />
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl md:text-6xl font-heading font-bold text-[#4A2333] tracking-tight leading-tight"
              >
                Focus. Watch. Listen. Respond.
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xl md:text-2xl text-slate-600 font-medium max-w-lg"
              >
                You will complete short activities that ask you to stay focused and respond when you notice something important.
              </motion.p>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col items-center justify-center space-y-6 min-h-[300px]">
                <div className="flex gap-4">
                  <div className="w-16 h-24 bg-slate-100 rounded-xl flex items-center justify-center text-3xl font-bold text-slate-800">7</div>
                  <div className="w-16 h-24 bg-slate-100 rounded-xl flex items-center justify-center text-3xl font-bold text-slate-800">2</div>
                  <div className="w-16 h-24 bg-amber-100 rounded-xl flex items-center justify-center text-3xl font-bold text-amber-600 border-2 border-amber-400">9</div>
                  <div className="w-16 h-24 bg-slate-100 rounded-xl flex items-center justify-center text-3xl font-bold text-slate-800">4</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="space-y-24 max-w-5xl mx-auto">
            
            {/* Digit Activity */}
            <div className="flex flex-col md:flex-row gap-12 items-center">
              <div className="w-full md:w-1/2 space-y-4">
                <h3 className="text-3xl font-bold text-[#4A2333]">Numbers</h3>
                <p className="text-lg text-slate-600">Remember the numbers and enter them after they disappear.</p>
              </div>
              <div className="w-full md:w-1/2 bg-[#FDF8F5] p-12 rounded-[2rem] border border-slate-100 text-center">
                <div className="text-4xl tracking-[1em] font-bold text-[#4A2333] mb-6">7 2 9 4</div>
              </div>
            </div>

            {/* Reaction Activity */}
            <div className="flex flex-col md:flex-row-reverse gap-12 items-center">
              <div className="w-full md:w-1/2 space-y-4">
                <h3 className="text-3xl font-bold text-[#4A2333]">Reaction</h3>
                <p className="text-lg text-slate-600">Tap as quickly as you can when you see the target.</p>
              </div>
              <div className="w-full md:w-1/2 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center gap-6">
                <div className="text-lg font-bold text-slate-400">Wait...</div>
                <div className="w-24 h-24 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/40" />
              </div>
            </div>

            {/* Visual Activity */}
            <div className="flex flex-col md:flex-row gap-12 items-center">
              <div className="w-full md:w-1/2 space-y-4">
                <h3 className="text-3xl font-bold text-[#4A2333]">Visual Watch</h3>
                <p className="text-lg text-slate-600">Watch carefully. Press the button whenever you see a person wearing a red shirt.</p>
              </div>
              <div className="w-full md:w-1/2 bg-slate-900 p-8 rounded-[2rem] flex flex-col items-center">
                <div className="w-full aspect-video bg-slate-800 rounded-xl mb-6 flex items-center justify-center text-slate-600">
                  <ImageIcon className="w-12 h-12" />
                </div>
                <button className="w-full py-4 rounded-xl bg-emerald-500 text-white font-black text-xl tracking-widest shadow-lg">TARGET</button>
              </div>
            </div>

            {/* Audio Activity */}
            <div className="flex flex-col md:flex-row-reverse gap-12 items-center">
              <div className="w-full md:w-1/2 space-y-4">
                <h3 className="text-3xl font-bold text-[#4A2333]">Audio Listening</h3>
                <p className="text-lg text-slate-600">Listen carefully. Press the button whenever you hear the target sound.</p>
              </div>
              <div className="w-full md:w-1/2 bg-[#FDF8F5] p-8 rounded-[2rem] border border-slate-100 flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-6">
                  <Play className="w-8 h-8 ml-1" />
                </div>
                <button className="w-full py-4 rounded-xl bg-emerald-500 text-white font-black text-xl tracking-widest shadow-lg">TARGET HEARD</button>
              </div>
            </div>

            {/* Music & Video */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                <h3 className="text-2xl font-bold text-[#4A2333] mb-4">Music</h3>
                <p className="text-slate-600 mb-8">Listen carefully and respond whenever you hear the special sound in the music.</p>
                <button className="w-full py-4 rounded-xl bg-emerald-500 text-white font-black text-lg shadow-lg">I HEARD THE TARGET</button>
              </div>
              <div className="bg-slate-900 p-8 rounded-[2rem]">
                <h3 className="text-2xl font-bold text-white mb-4">Video</h3>
                <p className="text-slate-400 mb-8">Watch carefully and respond whenever the important event happens.</p>
                <button className="w-full py-4 rounded-xl bg-emerald-500 text-white font-black text-lg shadow-lg">TARGET</button>
              </div>
            </div>

          </div>
        </div>
      </section>

      <ExploreCTA title="Ready to try the Attention Assessment?" buttonText="START ATTENTION ASSESSMENT" />
    </ExploreLayout>
  );
};
