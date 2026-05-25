import { Activity, Brain, Database, KeyRound, Radio, Workflow } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const metrics = [
  { label: "AI Requests", value: "0", detail: "Groq route ready", icon: Brain },
  { label: "Events Queued", value: "0", detail: "Postgres bus", icon: Radio },
  { label: "Memories", value: "0", detail: "pgvector-ready", icon: Database },
  { label: "Workflows", value: "0", detail: "Trigger engine", icon: Workflow },
  { label: "API Keys", value: "0", detail: "Org scoped", icon: KeyRound },
  { label: "Health", value: "OK", detail: "Free-tier posture", icon: Activity }
];

export function MetricGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric) => (
        <Card key={metric.label}>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold">{metric.value}</p>
              <p className="mt-1 text-xs text-muted">{metric.detail}</p>
            </div>
            <metric.icon className="h-6 w-6 text-accent" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
