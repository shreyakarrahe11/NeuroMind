import React from 'react';
import { useSafeUser } from '../components/auth/ClerkBridge';
import { LandingNavbar } from '../components/landing/LandingNavbar';
import { Hero } from '../components/landing/Hero';
import { UnderstandingChanges } from '../components/landing/UnderstandingChanges';
import { Services } from '../components/landing/Services';
import { WhyChooseUs } from '../components/landing/WhyChooseUs';
import { Footer } from '../components/landing/Footer';
import { ScrollToTop } from '../components/landing/ScrollToTop';
import { TopProgressBar } from '../components/landing/TopProgressBar';
import { useAssessment } from '../context/AssessmentContext';
import pageTitleBackground from '../assets/page-title.jpg';

export const LandingPage: React.FC = () => {
  const { user, navigateTo } = useAssessment();
  const { isSignedIn } = useSafeUser();
  const isAuthenticated = isSignedIn || user.isAuthenticated;

  return (
    <div
      className="font-sans antialiased text-[#6C5D62] selection:bg-[#F29D88] selection:text-white overflow-x-hidden"
      style={{
        backgroundImage: `url(${pageTitleBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      <TopProgressBar />
      <LandingNavbar isAuthenticated={isAuthenticated} />
      <main>
        <Hero
          isAuthenticated={isAuthenticated}
          onStartAssessment={() => navigateTo(isAuthenticated ? '/assessment' : '/login')}
          onExplore={() => navigateTo('/how-it-works')}
        />
        <UnderstandingChanges />
        <Services />
        <WhyChooseUs />
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
};
