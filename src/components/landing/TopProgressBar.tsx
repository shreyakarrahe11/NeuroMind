import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export function TopProgressBar() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial page load simulation
    const timer = setTimeout(() => setIsLoading(false), 1200);

    // Intercept clicks on links to simulate page navigation loading
    const handleNavigation = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      
      // If clicking a link, show the progress bar briefly
      if (link && link.getAttribute('href')) {
        setIsLoading(true);
        setTimeout(() => setIsLoading(false), 800);
      }
    };

    document.addEventListener('click', handleNavigation);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleNavigation);
    };
  }, []);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          role="progressbar"
          aria-hidden="true"
          className="fixed top-0 left-0 right-0 h-1 bg-[#F29D88] z-[100] origin-left shadow-[0_0_10px_#F29D88]"
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{ scaleX: 1, opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      )}
    </AnimatePresence>
  );
}
