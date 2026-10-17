import { motion } from 'motion/react';
import caregiverImage from '../../assets/about-1-1.png';

export function UnderstandingChanges() {
  return (
    <section className="py-24 bg-white relative overflow-hidden">
      <motion.div
        animate={{ x: [0, 18, 0], y: [0, -12, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-5 top-20 h-32 w-32 rounded-full bg-[#F29D88]/10 blur-3xl"
      />
      <motion.div
        animate={{ x: [0, -18, 0], y: [0, 12, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute right-10 bottom-10 h-40 w-40 rounded-full bg-[#7FB3D5]/10 blur-3xl"
      />

      <div className="max-w-350 mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30, rotateY: -10 }}
            whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative group"
          >
            <motion.div
              whileHover={{ scale: 1.04, rotateX: 3 }}
              transition={{ duration: 0.4 }}
              animate={{ y: [0, -4, 0] }}
              className="aspect-4/3 rounded-4xl overflow-hidden relative shadow-lg group-hover:shadow-2xl transition-shadow"
            >
              <img
                src={caregiverImage}
                alt="Caregiver with senior patient"
                className="w-full h-full object-cover object-top"
              />
              <motion.div 
                className="absolute inset-0 bg-linear-to-t from-black/5 to-transparent"
                animate={{ opacity: [0.05, 0.15, 0.05] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              animate={{ y: [0, -8, 0] }}
              whileHover={{ scale: 1.05, rotate: 2 }}
              className="absolute -bottom-10 right-4 md:right-10 bg-[#FDF8F5] p-8 rounded-3xl shadow-xl max-w-75 group-hover:shadow-2xl transition-all"
            >
              <p className="text-[#4A2333] text-[11px] font-bold tracking-[0.2em] mb-2 uppercase">Built For</p>
              <h4 className="text-[#4A2333] text-2xl font-heading font-bold mb-4 leading-tight">EARLY<br/>AWARENESS</h4>
              <p className="text-slate-500 text-[10px] font-bold tracking-widest uppercase">Research-Led Assessment</p>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="lg:pl-10 mt-16 lg:mt-0"
          >
            <div className="space-y-6">
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="text-[#F29D88] font-bold tracking-[0.15em] text-xs uppercase"
              >
                Why one signal is never the whole picture
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-3xl md:text-4xl font-heading font-bold tracking-tight text-[#4A2333] leading-[1.15]"
              >
                Understanding the small<br/>changes that matter.
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="text-xl text-slate-500 font-medium pt-2"
              >
                Cognitive changes are not always easy to notice.
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-lg text-slate-500 leading-relaxed"
              >
                NeuroMind was created to look beyond a single test or isolated
                result, using a multi-agent AI pipeline to bring different forms of
                information together into one considered, explainable assessment profile.
              </motion.p>

              <motion.div 
                initial={{ opacity: 0, scaleX: 0 }}
                whileInView={{ opacity: 1, scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="w-full h-px bg-slate-200/60 my-10 origin-left"
              />

              <ul className="space-y-6 text-lg text-slate-600">
                {[
                  'The goal is simple: combine four modalities into one connected assessment.',
                  'Explain every result in plain language, not just a score.',
                  'Encourage timely, informed conversations with a professional.'
                ].map((item, index) => (
                  <motion.li
                    key={item}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.35 + index * 0.1 }}
                    whileHover={{ x: 6 }}
                    className="flex items-start cursor-default group"
                  >
                    <motion.span
                      className="inline-block"
                      whileHover={{ scale: 1.2 }}
                    >
                      <strong className="text-[#4A2333] group-hover:text-[#F29D88] transition-colors">{index === 0 ? 'The goal is simple:' : ''}</strong>
                    </motion.span>
                    <span> {item.replace('The goal is simple: ', '')}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
