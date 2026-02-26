import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  gradient?: boolean;
}

export function StatCard({ title, value, change, changeType = "neutral", icon: Icon, gradient }: StatCardProps) {
  return (
    <Card
      className={`relative overflow-hidden p-5 transition-all duration-300 hover:shadow-lg ${
        gradient
          ? "gradient-primary text-primary-foreground border-0"
          : "bg-card hover:border-primary/20"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className={`text-xs font-medium uppercase tracking-wide ${gradient ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
            {title}
          </p>
          <p className="text-2xl font-display font-bold">{value}</p>
          {change && (
            <p className={`text-xs font-medium ${
              gradient
                ? "text-primary-foreground/80"
                : changeType === "positive"
                ? "text-chart-4"
                : changeType === "negative"
                ? "text-destructive"
                : "text-muted-foreground"
            }`}>
              {change}
            </p>
          )}
        </div>
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
          gradient ? "bg-primary-foreground/20" : "bg-primary/10"
        }`}>
          <Icon className={`h-5 w-5 ${gradient ? "text-primary-foreground" : "text-primary"}`} />
        </div>
      </div>
    </Card>
  );
}
