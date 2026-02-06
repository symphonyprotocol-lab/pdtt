import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Wallet, 
  Layers3, 
  Link2, 
  Building,
  ArrowRight,
  Rocket
} from "lucide-react";

const expansions = [
  {
    icon: Wallet,
    title: "Personal Data Asset Centers",
    description: "Individual data vaults giving users full control over their digital footprint"
  },
  {
    icon: Layers3,
    title: "Multi-Scenario Data Onboarding",
    description: "Expanding beyond receipts to health, mobility, and lifestyle data"
  },
  {
    icon: Link2,
    title: "Cross-Chain Infrastructure",
    description: "Interoperable data layer connecting multiple blockchain ecosystems"
  },
  {
    icon: Building,
    title: "Institutional Trading Layer",
    description: "Enterprise-grade data trading for financial institutions and corporations"
  },
];

export function VisionSection() {
  return (
    <section id="vision" className="section-padding">
      <div className="container-custom">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 px-4 py-1">
            Vision
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
            Vision &{" "}
            <span className="gradient-text">Future Expansion</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Building the global real-world data asset protocol — a new foundation
            for the data economy.
          </p>
        </div>

        {/* Expansion Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {expansions.map((item, index) => (
            <Card 
              key={index} 
              className="group relative overflow-hidden hover:shadow-xl transition-all duration-300"
            >
              {/* Number badge */}
              <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                {index + 1}
              </div>
              
              <CardContent className="p-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <item.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Closing Statement CTA */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-8 md:p-16 text-center">
          {/* Background effects */}
          <div className="absolute inset-0">
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
          </div>
          
          <div className="relative z-10">
            <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-8">
              <Rocket className="w-8 h-8 text-white" />
            </div>
            
            <blockquote className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-8 leading-tight">
              &ldquo;Rebuilding the global data economy —<br />
              <span className="gradient-text">starting from real-world consumption.</span>&rdquo;
            </blockquote>
            
            <p className="text-lg text-slate-300 mb-10 max-w-xl mx-auto">
              Join us in creating a fairer, more transparent data economy where 
              every purchase creates value for the people who make it.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button 
                size="lg" 
                className="gradient-bg hover:opacity-90 text-lg px-8 py-6"
              >
                Get Started
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8 py-6 bg-transparent border-white/50 text-white hover:bg-white/10 hover:border-white/70 hover:text-white"
              >
                Contact Us
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
