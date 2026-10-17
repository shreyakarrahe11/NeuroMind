import { useEffect, useState } from 'react';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';
import { SafeUserButton } from '../auth/ClerkBridge';
import { useAssessment } from '../../context/AssessmentContext';
import logoImage from '../../assets/logo.png';

export function LandingNavbar({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { navigateTo } = useAssessment();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goHome = () => {
    setMobileOpen(false);
    navigateTo('/');
  };

  const links = [
    { label: 'HOME', href: '/', action: goHome },
    { label: 'HOW IT WORKS', href: '/how-it-works', action: () => { setMobileOpen(false); navigateTo('/how-it-works'); } },
    { label: 'ASSESSMENT', href: '/assessment', action: () => { setMobileOpen(false); navigateTo('/assessment'); } },
    { label: 'ABOUT', href: '/about', action: () => { setMobileOpen(false); navigateTo('/about'); } },
  ];

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#4A2333]/95 backdrop-blur shadow-xl py-3' : 'bg-[#4A2333] py-5'}`}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">
          <button onClick={goHome} className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <img src={logoImage} alt="NeuroMind Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-heading font-bold text-2xl tracking-tight text-white">NeuroMind</span>
          </button>

          <nav className="hidden lg:flex items-center gap-8 xl:gap-10">
            {links.map((link) => (
              <button
                key={link.label}
                type="button"
                onClick={() => {
                  if (link.action) {
                    link.action();
                    return;
                  }
                  setMobileOpen(false);
                  if (link.href.startsWith('#')) {
                    window.location.hash = link.href;
                  } else {
                    navigateTo(link.href);
                  }
                }}
                className="font-bold text-white hover:text-[#F29D88] transition-colors text-[13px] tracking-wide"
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/75">Signed in</span>
                <SafeUserButton />
              </div>
            ) : (
              <>
                <button onClick={() => navigateTo('/login')} className="px-6 py-3 rounded-full font-bold text-sm text-white border border-white/30 hover:bg-white/10 transition-colors">
                  LOGIN
                </button>
                <button onClick={() => navigateTo('/login')} className="bg-[#F29D88] hover:bg-[#e08b76] text-white px-7 py-3 rounded-full font-bold text-sm shadow-lg transition-colors flex items-center gap-2">
                  START ASSESSMENT
                  <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center"><ArrowUpRight className="w-4 h-4" /></span>
                </button>
              </>
            )}
          </div>

          <button className="lg:hidden text-white" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle navigation">
            {mobileOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-[#391826] border-t border-white/10 shadow-2xl">
          <div className="px-4 pt-2 pb-6 space-y-2">
            {links.map((link) => (
              <button
                key={link.label}
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  if (link.action) {
                    link.action();
                    return;
                  }
                  if (link.href.startsWith('#')) {
                    window.location.hash = link.href;
                    return;
                  }
                  navigateTo(link.href);
                }}
                className="block w-full px-3 py-3 text-left text-white font-bold hover:bg-[#4A2333] hover:text-[#F29D88] rounded-lg"
              >
                {link.label}
              </button>
            ))}
            {isAuthenticated ? (
              <div className="pt-3 flex items-center justify-center">
                <SafeUserButton />
              </div>
            ) : (
              <div className="pt-3 grid grid-cols-2 gap-3">
                <button onClick={() => { setMobileOpen(false); navigateTo('/login'); }} className="bg-white/10 text-white rounded-full py-3 font-bold">LOGIN</button>
                <button onClick={() => { setMobileOpen(false); navigateTo('/login'); }} className="bg-[#F29D88] text-white rounded-full py-3 font-bold">START</button>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.header>
  );
}
