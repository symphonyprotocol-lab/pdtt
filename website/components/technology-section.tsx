import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Blocks, 
  Shield,
  ScanSearch,
  Tag,
  AlertTriangle,
  Coins,
  FileCheck,
  Scale,
  Lock,
  Server,
  Eye
} from "lucide-react";

const techColumns = [
  {
    title: "AI Engine",
    icon: Brain,
    color: "blue",
    features: [
      { icon: ScanSearch, label: "Receipt Verification", description: "Automated authenticity checks" },
      { icon: Tag, label: "SKU Data Labeling", description: "Precise product identification" },
      { icon: AlertTriangle, label: "Fraud Detection", description: "ML-powered anomaly detection" },
    ]
  },
  {
    title: "Blockchain Engine",
    icon: Blocks,
    color: "purple",
    features: [
      { icon: Coins, label: "Token Reward Clearing", description: "Instant settlement on-chain" },
      { icon: FileCheck, label: "Data Ownership Verification", description: "Immutable provenance records" },
      { icon: Scale, label: "Transparent Settlement", description: "Auditable transactions" },
    ]
  },
  {
    title: "Privacy Architecture",
    icon: Shield,
    color: "teal",
    features: [
      { icon: Lock, label: "Encrypted Transmission", description: "End-to-end encryption" },
      { icon: Server, label: "Trusted Execution Environment", description: "Hardware-level isolation" },
      { icon: Eye, label: "Zero-Knowledge Proofs", description: "Privacy-preserving verification" },
    ]
  },
];

export function TechnologySection() {
  return (
    <section id="technology" className="section-padding bg-muted/30">
      <div className="container-custom">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 px-4 py-1">
            Technology
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
            Technology & Privacy{" "}
            <span className="gradient-text">Advantage</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A robust technology stack designed for security, scalability, and privacy
            from the ground up.
          </p>
        </div>

        {/* Three Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {techColumns.map((column, colIndex) => (
            <Card key={colIndex} className="relative overflow-hidden">
              {/* Top gradient bar */}
              <div className={`absolute top-0 left-0 right-0 h-1 ${
                column.color === 'blue' ? 'bg-blue-500' :
                column.color === 'purple' ? 'bg-purple-500' :
                'bg-teal-500'
              }`} />
              
              <CardHeader className="text-center pb-6">
                <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
                  column.color === 'blue' ? 'bg-blue-500/10' :
                  column.color === 'purple' ? 'bg-purple-500/10' :
                  'bg-teal-500/10'
                }`}>
                  <column.icon className={`w-8 h-8 ${
                    column.color === 'blue' ? 'text-blue-500' :
                    column.color === 'purple' ? 'text-purple-500' :
                    'text-teal-500'
                  }`} />
                </div>
                <CardTitle className="text-2xl">{column.title}</CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {column.features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${
                      column.color === 'blue' ? 'bg-blue-50' :
                      column.color === 'purple' ? 'bg-purple-50' :
                      'bg-teal-50'
                    }`}>
                      <feature.icon className={`w-5 h-5 ${
                        column.color === 'blue' ? 'text-blue-600' :
                        column.color === 'purple' ? 'text-purple-600' :
                        'text-teal-600'
                      }`} />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{feature.label}</h4>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom stats */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { value: "99.9%", label: "Accuracy Rate" },
            { value: "<100ms", label: "Processing Time" },
            { value: "256-bit", label: "Encryption" },
            { value: "SOC 2", label: "Compliant" },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <p className="text-3xl font-bold gradient-text mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
