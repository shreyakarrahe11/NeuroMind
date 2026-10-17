import React from 'react';
import { TopProgressBar } from '../landing/TopProgressBar';
import { LandingNavbar } from '../landing/LandingNavbar';
import { Footer } from '../landing/Footer';
import { ScrollToTop } from '../landing/ScrollToTop';
import pageTitleBackground from '../../assets/page-title.jpg';

export const ExploreLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div
      className="font-sans antialiased text-[#6C5D62] selection:bg-[#F29D88] selection:text-white overflow-x-hidden min-h-screen flex flex-col relative"
      style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.88), rgba(255,255,255,0.92)), url(${pageTitleBackground})`,
        backgroundAttachment: 'fixed',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-8 h-64 w-64 rounded-full bg-[#F7D9C4]/60 blur-3xl" />
        <div className="absolute top-20 right-10 h-72 w-72 rounded-full bg-[#D8E8FF]/70 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-[#F5C6C7]/50 blur-3xl" />
      </div>
      <TopProgressBar />
      <LandingNavbar />
      <main className="flex-1 relative z-10">
        {children}
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
};
