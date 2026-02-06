import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Globe, 
  ShieldCheck, 
  Users,
  Target
} from "lucide-react";

const marketStats = [
  {
    icon: Globe,
    value: "$3T+",
    label: "Global Retail Data Market",
    description: "Trillion-dollar opportunity in untapped offline consumer data"
  },
  {
    icon: TrendingUp,
    value: "47%",
    label: "YoY Growth",
    description: "Real-world data becoming core Web3 infrastructure"
  },
  {
    icon: ShieldCheck,
    value: "89%",
    label: "Privacy Demand",
    description: "Increasing demand for privacy-compliant advertising solutions"
  },
];

export function MarketSection() {
  return (
    <section id="market" className="section-padding bg-muted/30">
      <div className="container-custom">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 px-4 py-1">
            Market Opportunity
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
            Massive Market{" "}
            <span className="gradient-text">Opportunity</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Positioned at the intersection of Web3, AI, and the trillion-dollar
            consumer data economy.
          </p>
        </div>

        {/* Market Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {marketStats.map((stat, index) => (
            <div 
              key={index} 
              className="relative group bg-background rounded-2xl p-8 border border-border hover:border-primary/30 transition-all hover:shadow-xl"
            >
              {/* Background gradient on hover */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <stat.icon className="w-7 h-7 text-primary" />
                </div>
                
                <p className="text-5xl md:text-6xl font-bold gradient-text mb-2">
                  {stat.value}
                </p>
                <p className="text-lg font-semibold mb-2">{stat.label}</p>
                <p className="text-muted-foreground">{stat.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Target/Traction */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 to-purple-600 p-8 md:p-12">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div 
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  radial-gradient(circle at 20% 50%, white 1px, transparent 1px),
                  radial-gradient(circle at 80% 50%, white 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px'
              }}
            />
          </div>
          
          <div className="relative text-center text-white">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Target className="w-8 h-8" />
              <span className="text-sm uppercase tracking-wider font-medium opacity-80">
                Growth Target
              </span>
            </div>
            
            <div className="flex items-baseline justify-center gap-2 mb-4">
              <span className="text-6xl md:text-8xl font-bold">10M</span>
              <span className="text-2xl md:text-3xl font-light">DAU</span>
            </div>
            
            <p className="text-xl md:text-2xl font-light opacity-90 mb-2">
              Daily Active Users
            </p>
            <p className="text-lg opacity-75">
              Target within 5 years
            </p>
            
            {/* Progress indicators */}
            <div className="flex justify-center gap-4 mt-8">
              {[1, 2, 3, 4, 5].map((year) => (
                <div key={year} className="text-center">
                  <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${
                    year === 1 ? 'bg-white' : 'bg-white/30'
                  }`} />
                  <span className="text-xs opacity-70">Y{year}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
