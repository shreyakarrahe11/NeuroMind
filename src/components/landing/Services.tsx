import { Mic, Brain, Focus, Activity } from 'lucide-react';
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lightbox } from './Lightbox';
import speechImage from '../../assets/image.png';
import memoryImage from '../../assets/images.png';
import attentionImage from '../../assets/images (1).png';
import lifestyleImage from '../../assets/service1-1.png';

const ServiceCard: React.FC<{ s: any, i: number }> = ({ s, i }) => {
  const [loaded, setLoaded] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientY - rect.top - rect.height / 2) / 20;
    const y = (e.clientX - rect.left - rect.width / 2) / 20;
    setRotation({ x, y });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 40, rotateX: -10 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: i * 0.15, ease: 'easeOut' }}
      whileHover={{ y: -12, scale: 1.02, boxShadow: '0_35px_60px_rgba(74,35,51,0.15)' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: rotation.x,
        rotateY: rotation.y,
        perspective: '1000px'
      }}
      className="bg-[#F8F4EE] rounded-4xl pt-12 px-8 pb-8 flex flex-col h-full text-center relative mt-6 transition-all duration-300 shadow-[0_20px_45px_rgba(74,35,51,0.05)] border border-white/40"
    >
      <motion.div
        animate={{ y: [0, -8, 0], rotateZ: [0, 1, -1, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="flex justify-center mb-6"
      >
        {s.icon}
      </motion.div>
      <h3 className="text-2xl font-heading font-semibold text-[#4A2333] mb-4">{s.title}</h3>
      <p className="text-[#6C5D62] mb-10 leading-relaxed text-lg">
        {s.description}
      </p>
      
      <motion.div 
        whileHover={{ scale: 1.04 }}
        className={`relative rounded-2xl overflow-hidden mt-auto aspect-4/3 cursor-zoom-in ${!loaded ? 'bg-gray-200 animate-pulse' : ''}`}
        onClick={() => setIsLightboxOpen(true)}
      >
        <motion.img 
          src={s.image} 
          alt={s.title} 
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className={`w-full h-full object-cover transition-all duration-700 ${loaded ? 'opacity-100' : 'opacity-0'}`} 
          onLoad={() => setLoaded(true)}
        />
      </motion.div>

      <Lightbox 
        src={s.image} 
        alt={s.title} 
        isOpen={isLightboxOpen} 
        onClose={() => setIsLightboxOpen(false)} 
      />
    </motion.div>
  );
}

export function Services() {
  const services = [
    {
      icon: <Mic className="w-12 h-12 text-[#F29D88] stroke-1" aria-hidden="true" />,
      title: 'Speech & Language',
      description: 'For speech, language, fluency and related features.',
      image: speechImage
    },
    {
      icon: <Brain className="w-12 h-12 text-[#F29D88] stroke-1" aria-hidden="true" />,
      title: 'Memory & Learning',
      description: 'For learning, immediate recall, delayed recall and recognition.',
      image: memoryImage
    },
    {
      icon: <Focus className="w-12 h-12 text-[#F29D88] stroke-1" aria-hidden="true" />,
      title: 'Attention & Executive Function',
      description: 'For attention, working memory, processing speed, inhibition and cognitive control.',
      image: attentionImage
    },
    {
      icon: <Activity className="w-12 h-12 text-[#F29D88] stroke-1" aria-hidden="true" />,
      title: 'Lifestyle & Context',
      description: 'For sleep, activity and daily-routine factors that add context to the other domains.',
      image: lifestyleImage
    }
  ];

  return (
    <section id="services" className="py-24 bg-white relative">
      {/* Decorative floating dots */}
      <div className="absolute top-40 left-32 w-3 h-3 rounded-full bg-[#F29D88] opacity-60 hidden lg:block" />
      <div className="absolute top-48 left-48 w-6 h-6 rounded-full bg-[#F8F4EE] hidden lg:block" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-20 relative"
        >
          <h2 className="text-3xl md:text-4xl font-heading font-bold tracking-tight text-[#4A2333] mb-4 leading-tight">
            Four modalities, <br className="hidden sm:block" /> one connected assessment
          </h2>
          <p className="text-lg text-slate-500 leading-relaxed">
            Each modality is assessed on its own, then brought together by NeuroMind's multi-agent pipeline for a fuller picture.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((s, i) => (
            <ServiceCard key={i} s={s} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
