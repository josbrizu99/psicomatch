import React, { Suspense, lazy, useState, useEffect } from 'react';
import HeroSection from '../components/common/HeroSection';
import SkeletonLoader from '../components/common/SkeletonLoader';
import { homeContentService } from '../services/homeContentService';

// Lazy load de componentes que no son críticos para la primera pintura
const HowItWorks = lazy(() => import('../components/home/HowItWorks'));
const Features = lazy(() => import('../components/home/Features'));
const Stats = lazy(() => import('../components/home/Stats'));
const FeaturedProfessionals = lazy(() => import('../components/home/FeaturedProfessionals'));
const Testimonials = lazy(() => import('../components/home/Testimonials'));
const FAQ = lazy(() => import('../components/home/FAQ'));

const Home = () => {
  const [homeContent, setHomeContent] = useState(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const content = await homeContentService.getHomeContent();
        setHomeContent(content);
      } catch (error) {
        console.error("Error loading home content", error);
      }
    };
    fetchContent();
  }, []);

  return (
    <div className="min-h-screen">
      <HeroSection />

      <Suspense fallback={<div className="container mx-auto px-4 py-8"><SkeletonLoader width="100%" height="400px" /></div>}>
        <HowItWorks />
      </Suspense>

      <Suspense fallback={<div className="container mx-auto px-4 py-8"><SkeletonLoader width="100%" height="300px" /></div>}>
        <Features />
      </Suspense>

      <Suspense fallback={<div className="py-8"><SkeletonLoader width="100%" height="200px" /></div>}>
        <Stats customStats={homeContent?.stats} />
      </Suspense>

      <Suspense fallback={<div className="container mx-auto px-4 py-8"><SkeletonLoader width="100%" height="500px" /></div>}>
        <FeaturedProfessionals />
      </Suspense>

      <Suspense fallback={<div className="container mx-auto px-4 py-8"><SkeletonLoader width="100%" height="400px" /></div>}>
        <Testimonials customTestimonials={homeContent?.testimonials} />
      </Suspense>

      <Suspense fallback={<div className="container mx-auto px-4 py-8"><SkeletonLoader width="100%" height="600px" /></div>}>
        <FAQ customFaqs={homeContent?.faqs} />
      </Suspense>
    </div>
  );
};

export default Home;
