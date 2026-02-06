import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Building2, 
  Code2, 
  Layers,
  ArrowLeftRight,
  DollarSign,
  LayoutDashboard,
  Gavel,
  Tags
} from "lucide-react";

const participants = [
  { icon: Users, label: "Users", description: "Data providers earning rewards", position: "top" },
  { icon: Building2, label: "Brands", description: "Advertisers seeking insights", position: "right" },
  { icon: Code2, label: "Developers", description: "Building on the protocol", position: "bottom" },
  { icon: Layers, label: "Platform", description: "Infrastructure & settlement", position: "left" },
];

const revenueStreams = [
  { 
    icon: DollarSign, 
    title: "Data Marketplace Fees", 
    description: "Transaction fees on data trades" 
  },
  { 
    icon: LayoutDashboard, 
    title: "Self-Serve Dashboard", 
    description: "Premium advertiser tools & analytics" 
  },
  { 
    icon: Gavel, 
    title: "Real-Time Bidding", 
    description: "Precision targeting system fees" 
  },
  { 
    icon: Tags, 
    title: "Labeling Marketplace", 
    description: "Open data labeling services" 
  },
];

export function EcosystemSection() {
  return (
    <section id="ecosystem" className="section-padding">
      <div className="container-custom">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 px-4 py-1">
            Ecosystem
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
            Business Model &{" "}
            <span className="gradient-text">Ecosystem</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A four-sided network creating powerful flywheel effects and sustainable
            value for all participants.
          </p>
        </div>

        {/* Network Visualization */}
        <div className="mb-20">
          <div className="relative max-w-xl mx-auto">
            {/* Center hub */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full gradient-bg flex items-center justify-center z-10">
              <div className="text-center text-white">
                <ArrowLeftRight className="w-8 h-8 mx-auto mb-1" />
                <span className="text-sm font-semibold">Network Effect</span>
              </div>
            </div>
            
            {/* Connection lines */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 400">
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.3" />
                </linearGradient>
              </defs>
              {/* Lines connecting corners through center */}
              <line x1="80" y1="80" x2="320" y2="320" stroke="url(#lineGradient)" strokeWidth="2" strokeDasharray="4 4" />
              <line x1="320" y1="80" x2="80" y2="320" stroke="url(#lineGradient)" strokeWidth="2" strokeDasharray="4 4" />
              <line x1="200" y1="40" x2="200" y2="360" stroke="url(#lineGradient)" strokeWidth="2" strokeDasharray="4 4" />
              <line x1="40" y1="200" x2="360" y2="200" stroke="url(#lineGradient)" strokeWidth="2" strokeDasharray="4 4" />
            </svg>
            
            {/* Participant nodes */}
            <div className="relative aspect-square">
              {/* Top - Users */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <Card className="w-32 text-center hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <p className="font-semibold text-sm">Users</p>
                    <p className="text-xs text-muted-foreground">Data providers</p>
                  </CardContent>
                </Card>
              </div>
              
              {/* Right - Brands */}
              <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2">
                <Card className="w-32 text-center hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-2">
                      <Building2 className="w-6 h-6 text-purple-600" />
                    </div>
                    <p className="font-semibold text-sm">Brands</p>
                    <p className="text-xs text-muted-foreground">Advertisers</p>
                  </CardContent>
                </Card>
              </div>
              
              {/* Bottom - Developers */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
                <Card className="w-32 text-center hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-2">
                      <Code2 className="w-6 h-6 text-teal-600" />
                    </div>
                    <p className="font-semibold text-sm">Developers</p>
                    <p className="text-xs text-muted-foreground">Builders</p>
                  </CardContent>
                </Card>
              </div>
              
              {/* Left - Platform */}
              <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <Card className="w-32 text-center hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-2">
                      <Layers className="w-6 h-6 text-orange-600" />
                    </div>
                    <p className="font-semibold text-sm">Platform</p>
                    <p className="text-xs text-muted-foreground">Infrastructure</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Streams */}
        <div>
          <h3 className="text-2xl font-bold text-center mb-8">Revenue Streams</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {revenueStreams.map((stream, index) => (
              <Card key={index} className="group hover:shadow-lg transition-all hover:border-primary/30">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <stream.icon className="w-7 h-7 text-white" />
                  </div>
                  <h4 className="font-semibold mb-2">{stream.title}</h4>
                  <p className="text-sm text-muted-foreground">{stream.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
