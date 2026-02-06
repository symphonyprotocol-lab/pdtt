import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Animated Background */}
      <div className="absolute inset-0 -z-10">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50" />
        
        {/* Animated network nodes */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-float-delay" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-400/5 to-purple-400/5 rounded-full blur-3xl" />
        
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `
              linear-gradient(to right, #3B82F6 1px, transparent 1px),
              linear-gradient(to bottom, #3B82F6 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px'
          }}
        />
        
        {/* Floating dots */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-500/30 rounded-full animate-pulse-slow" />
        <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-purple-500/30 rounded-full animate-pulse-slow" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-blue-500/30 rounded-full animate-pulse-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-1/4 right-1/3 w-3 h-3 bg-purple-500/30 rounded-full animate-pulse-slow" style={{ animationDelay: '0.5s' }} />
      </div>

      <div className="container-custom text-center">
        {/* Badges */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <Badge variant="secondary" className="px-4 py-2 text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Sparkles className="w-4 h-4 mr-2" />
            AI + Blockchain
          </Badge>
          <Badge variant="secondary" className="px-4 py-2 text-sm font-medium bg-purple-50 text-purple-700 border border-purple-200">
            Real-World Data Economy
          </Badge>
        </div>

        {/* Main Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
          <span className="block">Symphony Protocol Lab</span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl sm:text-2xl md:text-3xl text-muted-foreground font-light mb-4">
          Turning Offline Consumer Data into{" "}
          <span className="gradient-text font-medium">On-Chain Assets</span>
        </p>

        {/* Description */}
        <p className="max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground mb-10">
          Building infrastructure connecting real-world economic activity to Web3.
          An AI + Blockchain dual-engine powering the new data economy.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button size="lg" className="gradient-bg hover:opacity-90 text-lg px-8 py-6">
            Get Started
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <Button size="lg" variant="outline" className="text-lg px-8 py-6">
            Learn More
          </Button>
        </div>

        {/* Product name */}
        <div className="mt-16">
          <p className="text-sm text-muted-foreground mb-2">Powered by</p>
          <p className="text-2xl font-bold gradient-text">PDTT</p>
          <p className="text-sm text-muted-foreground">Purchase Data Tokenization & Trading</p>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
          <div className="w-1 h-2 bg-muted-foreground/50 rounded-full" />
        </div>
      </div>
    </section>
  );
}
