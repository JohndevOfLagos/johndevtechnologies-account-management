import { LucideIcon, Plus } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ServicePageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  fields: string[];
}

export function ServicePage({ title, description, icon: Icon, fields }: ServicePageProps) {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold">{title}</h1>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          <Button className="gradient-primary border-0 text-primary-foreground gap-2">
            <Plus className="h-4 w-4" />
            New Record
          </Button>
        </div>

        <Card className="p-6">
          <div className="text-center py-12">
            <Icon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-display font-semibold text-muted-foreground">No records yet</h3>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Create your first {title.toLowerCase()} record to get started
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {fields.map((f) => (
                <span key={f} className="text-xs bg-secondary text-secondary-foreground px-3 py-1 rounded-full">
                  {f}
                </span>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
