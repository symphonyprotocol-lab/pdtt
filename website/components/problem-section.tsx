import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Database, 
  UserX, 
  Target, 
  ShieldAlert,
  TrendingDown
} from "lucide-react";

const problems = [
  {
    icon: Database,
    title: "Fragmented Data",
    description: "Offline consumer purchase data is fragmented across systems and completely inaccessible for analysis.",
    stat: "95%",
    statLabel: "of offline data unused"
  },
  {
    icon: UserX,
    title: "Zero User Benefits",
    description: "Users generate valuable data every day but receive no financial benefit from their consumption patterns.",
    stat: "$0",
    statLabel: "returned to consumers"
  },
  {
    icon: Target,
    title: "Poor Targeting",
    description: "Brands lack SKU-level targeting precision, leading to inefficient ad spend and poor campaign ROI.",
    stat: "40%",
    statLabel: "of ad spend wasted"
  },
  {
    icon: ShieldAlert,
    title: "Privacy Risks",
    description: "Privacy and compliance risks prevent meaningful data sharing between consumers, brands, and platforms.",
    stat: "78%",
    statLabel: "fear data misuse"
  },
];

export function ProblemSection() {
  return (
    <section id="problem" className="section-padding bg-muted/30">
      <div className="container-custom">
        {/* Section Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-primary mb-3 uppercase tracking-wider">
            The Problem
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
            A Broken Data Economy
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            The current consumer data landscape is fragmented, unfair, and inefficient.
            Everyone loses except the middlemen.
          </p>
        </div>

        {/* Problem Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {problems.map((problem, index) => (
            <Card 
              key={index} 
              className="group relative overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg"
            >
              {/* Gradient accent on hover */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <problem.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold gradient-text">{problem.stat}</p>
                    <p className="text-xs text-muted-foreground">{problem.statLabel}</p>
                  </div>
                </div>
                <CardTitle className="text-xl">{problem.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{problem.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary stat */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-destructive/10 text-destructive">
            <TrendingDown className="w-5 h-5" />
            <span className="font-medium">$200B+ in data value lost annually</span>
          </div>
        </div>
      </div>
    </section>
  );
}
