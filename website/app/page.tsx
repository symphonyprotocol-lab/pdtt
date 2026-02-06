import { Header } from "@/components/header";
import { HeroSection } from "@/components/hero-section";
import { ProblemSection } from "@/components/problem-section";
import { SolutionSection } from "@/components/solution-section";
import { TechnologySection } from "@/components/technology-section";
import { EcosystemSection } from "@/components/ecosystem-section";
import { MarketSection } from "@/components/market-section";
import { VisionSection } from "@/components/vision-section";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <TechnologySection />
      <EcosystemSection />
      <MarketSection />
      <VisionSection />
      <Footer />
    </main>
  );
}
