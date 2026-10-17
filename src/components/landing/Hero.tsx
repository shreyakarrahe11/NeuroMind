import { useRef } from 'react';
import { motion, useMotionValue, useScroll, useSpring, useTransform } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import bannerImage from '../../assets/banner-2-1.png';


export function Hero({
  onStartAssessment,
  onExplore,
  isAuthenticated = false,
}: {
  onStartAssessment?: () => void,
  onExplore?: () => void,
  isAuthenticated?: boolean,
}) {
  const heroRef = useRef<HTMLElement>(null);
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const smoothX = useSpring(cursorX, { stiffness: 100, damping: 20, mass: 0.5 });
  const smoothY = useSpring(cursorY, { stiffness: 100, damping: 20, mass: 0.5 });

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start']
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    cursorX.set(x);
    cursorY.set(y);
  };

  const handlePointerLeave = () => {
    cursorX.set(0);
    cursorY.set(0);
  };

  return (
    <section
      ref={heroRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      <motion.div className="absolute inset-0 z-0" style={{ y: backgroundY }}>
        <img
          src={bannerImage}
          alt="NeuroMind cognitive health background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-r from-black/35 via-black/25 to-black/35" />
        <motion.div
          className="pointer-events-none absolute left-0 top-0 z-10 hidden h-16 w-16 rounded-full bg-[#F29D88]/60 blur-lg md:block shadow-lg"
          style={{ x: smoothX, y: smoothY, translateX: '-50%', translateY: '-50%' }}
        />
        <motion.div
          animate={{ y: [0, -18, 0], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -left-20 top-20 h-80 w-80 rounded-full bg-[#F29D88]/20 blur-3xl"
        />
        <motion.div
          animate={{ y: [0, 18, 0], opacity: [0.12, 0.22, 0.12] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-[#7FB3D5]/20 blur-3xl"
        />
      </motion.div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full pt-48 sm:pt-56 lg:pt-64">
        <div className="max-w-2xl relative">
          <motion.h1
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.15, ease: 'easeOut' }}
            className="text-4xl lg:text-5xl xl:text-6xl font-heading font-bold tracking-tight text-white leading-[1.05] mb-5 drop-shadow-[0_16px_32px_rgba(0,0,0,0.28)]"
          >
            Understanding cognition through multiple signals.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.28 }}
            className="text-white/90 text-lg md:text-xl mb-8 max-w-xl leading-relaxed font-light drop-shadow-[0_10px_20px_rgba(0,0,0,0.25)]"
          >
            NeuroMind brings together speech, memory, attention, and contextual information into a structured multimodal assessment framework designed to support cognitive research and early awareness.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-5"
          >
            <motion.button
              type="button"
              whileHover={{ scale: 1.08, y: -6, rotateZ: 2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onStartAssessment?.()}
              className="bg-white text-[#4A2333] pl-8 pr-2 py-3 rounded-full font-bold text-base flex items-center gap-6 hover:bg-gray-50 transition-colors group shadow-[0_30px_60px_rgba(0,0,0,0.3)] cursor-pointer"
            >
              {isAuthenticated ? 'CONTINUE ASSESSMENT' : 'START ASSESSMENT'}
              <motion.div
                animate={{ rotate: [0, 15, 0], scale: [1, 1.2, 1], y: [0, -2, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                className="w-12 h-12 bg-linear-to-br from-[#F29D88] to-[#E8726E] rounded-full flex items-center justify-center text-white group-hover:shadow-lg transition-all shadow-[0_16px_32px_rgba(242,157,136,0.5)]"
                aria-hidden="true"
              >
                <ArrowUpRight className="w-5 h-5" aria-hidden="true" />
              </motion.div>
            </motion.button>

            <motion.button
              type="button"
              whileHover={{ scale: 1.08, y: -6, rotateZ: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onExplore?.()}
              className="bg-transparent border-2 border-white/50 text-white pl-8 pr-2 py-3 rounded-full font-bold text-base flex items-center gap-6 hover:bg-white/15 hover:border-white/80 transition-all group cursor-pointer backdrop-blur-md shadow-[0_0_50px_rgba(255,255,255,0.15)]"
            >
              HOW NEUROMIND WORKS
              <motion.div
                animate={{ rotate: [0, 15, 0], scale: [1, 1.2, 1], y: [0, -2, 0] }}
                transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
                className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white group-hover:bg-white/30 transition-all"
                aria-hidden="true"
              >
                <ArrowUpRight className="w-5 h-5" aria-hidden="true" />
              </motion.div>
            </motion.button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -25, y: 25 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.8, delay: 0.55 }}
            whileHover={{ y: -3, scale: 1.02 }}
            className="mt-10 hidden md:flex items-center gap-3 rounded-full border border-white/25 bg-white/8 px-4 py-3 text-sm text-white/90 backdrop-blur-md shadow-[0_14px_30px_rgba(0,0,0,0.12)] w-max cursor-default"
          >
            <motion.span
              animate={{ scale: [1, 1.15, 1], boxShadow: ['0_0_16px_rgba(242,157,136,0.9)', '0_0_28px_rgba(242,157,136,1)', '0_0_16px_rgba(242,157,136,0.9)'] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              className="inline-flex h-2.5 w-2.5 rounded-full bg-[#F29D88]"
            />
            Multimodal, structured, and research-informed
          </motion.div>
        </div>
      </div>
    </section>
  );
}
