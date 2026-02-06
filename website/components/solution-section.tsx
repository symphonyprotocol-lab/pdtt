import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Receipt, 
  Sparkles, 
  Link2, 
  Coins, 
  BarChart3,
  ArrowRight,
  Brain,
  Blocks,
  Store
} from "lucide-react";

const flowSteps = [
  {
    icon: Receipt,
    title: "Upload Receipts",
    description: "Users upload purchase receipts"
  },
  {
    icon: Sparkles,
    title: "AI Verification",
    description: "AI verifies and extracts SKU data"
  },
  {
    icon: Link2,
    title: "On-Chain Assets",
    description: "Data converted to blockchain assets"
  },
  {
    icon: Coins,
    title: "Token Rewards",
    description: "Users receive token rewards"
  },
  {
    icon: BarChart3,
    title: "Data Access",
    description: "Advertisers access verified data"
  },
];

const highlights = [
  {
    icon: Brain,
    title: "AI + Blockchain Infrastructure",
    description: "Dual-engine technology stack combining AI verification with blockchain transparency."
  },
  {
    icon: Coins,
    title: "Real-World Data Monetization",
    description: "Turn everyday purchases into valuable digital assets and earn rewards."
  },
  {
    icon: Store,
    title: "Decentralized Marketplace",
    description: "Open marketplace for privacy-preserved consumer insights and targeting."
  },
];

export function SolutionSection() {
  return (
    <section id="solution" className="section-padding">
      <div className="container-custom">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 px-4 py-1">
            The Solution
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
            Introducing{" "}
            <span className="gradient-text">PDTT Platform</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Purchase Data Tokenization & Trading — transforming how consumer data
            is captured, verified, and monetized.
          </p>
        </div>

        {/* Flow Diagram */}
        <div className="mb-20">
          <div className="relative">
            {/* Connection line */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 -translate-y-1/2 z-0" />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 relative z-10">
              {flowSteps.map((step, index) => (
                <div key={index} className="relative">
                  <div className="flex flex-col items-center text-center">
                    {/* Step number */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full gradient-bg text-white text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </div>
                    
                    {/* Icon container */}
                    <div className="w-20 h-20 rounded-2xl bg-background border-2 border-border shadow-lg flex items-center justify-center mb-4 hover:border-primary transition-colors">
                      <step.icon className="w-8 h-8 text-primary" />
                    </div>
                    
                    <h3 className="font-semibold mb-1">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                  
                  {/* Arrow for mobile/tablet */}
                  {index < flowSteps.length - 1 && (
                    <div className="lg:hidden flex justify-center my-4">
                      <ArrowRight className="w-5 h-5 text-muted-foreground rotate-90 sm:rotate-0" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Highlight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {highlights.map((highlight, index) => (
            <Card 
              key={index} 
              className="relative overflow-hidden group hover:shadow-xl transition-all duration-300"
            >
              {/* Gradient border effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <CardHeader>
                <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center mb-4">
                  <highlight.icon className="w-7 h-7 text-white" />
                </div>
                <CardTitle className="text-xl">{highlight.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{highlight.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
