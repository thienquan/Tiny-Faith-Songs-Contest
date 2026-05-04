import dynamic from 'next/dynamic';
import { Navbar } from '@/components/sections/Navbar';
import { Hero } from '@/components/sections/Hero';
import { About } from '@/components/sections/About';
import { Timeline } from '@/components/sections/Timeline';
import { Prizes } from '@/components/sections/Prizes';
import { HowTo } from '@/components/sections/HowTo';
import { Criteria } from '@/components/sections/Criteria';
import { Poster } from '@/components/sections/Poster';
import { Footer } from '@/components/sections/Footer';

const RegistrationForm = dynamic(
  () => import('@/components/sections/RegistrationForm').then((mod) => mod.RegistrationForm),
  { ssr: false },
);

export default function Page() {
  return (
    <main className="relative" data-testid="landing-main">
      <Navbar />
      <Hero />
      <About />
      <Timeline />
      <Prizes />
      <HowTo />
      <Criteria />
      <Poster />
      <RegistrationForm />
      <Footer />
    </main>
  );
}
