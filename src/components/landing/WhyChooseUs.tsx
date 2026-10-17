import { Layers, ClipboardList, BookOpenCheck, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

const features = [
  {
    title: 'Multimodal by Design',
    description: 'Cognitive health is multidimensional. NeuroMind brings together complementary signals from speech, memory, attention and contextual information.',
    icon: Layers,
  },
  {
    title: 'Structured Assessment',
    description: 'Each assessment is designed around defined cognitive domains, measurable tasks and interpretable outcomes.',
    icon: ClipboardList,
  },
  {
    title: 'Research-Informed',
    description: "NeuroMind's assessment framework is informed by cognitive science, dementia research and evidence-based screening approaches.",
    icon: BookOpenCheck,
  },
  {
    title: 'Responsible by Design',
    description: 'NeuroMind is designed to support awareness and research — not replace professional diagnosis or clinical evaluation.',
    icon: ShieldCheck,
  },
];

export function WhyChooseUs() {
  return (
    <section className="py-24 bg-[#F8F4EE] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-white px-5 py-2 rounded-full mb-6 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F29D88]" />
            <span className="text-[#4A2333] font-bold text-sm tracking-wide">Our Approach</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-heading font-bold tracking-tight text-[#4A2333] leading-[1.15]">
            Designed around the complexity of cognition
          </h2>
        </motion.div>

        {/* Four cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="flex flex-col gap-5 rounded-3xl border border-white bg-white/80 p-7 shadow-sm hover:shadow-xl transition-all text-left group"
              >
                <motion.div
                  className="w-14 h-14 rounded-2xl bg-[#FDF8F5] flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow"
                  whileHover={{ scale: 1.08, rotate: 3 }}
                >
                  <Icon className="w-6 h-6 text-[#4A2333]" strokeWidth={1.5} aria-hidden="true" />
                </motion.div>
                <div>
                  <h3 className="text-xl font-heading font-semibold text-[#4A2333] mb-2">{f.title}</h3>
                  <p className="text-[#6C5D62] leading-relaxed">{f.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
