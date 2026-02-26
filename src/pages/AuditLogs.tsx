import { ScrollText } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";

const AuditLogs = () => (
  <DashboardLayout>
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">Track all system changes and modifications</p>
      </div>
      <Card className="p-12 text-center">
        <ScrollText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
        <h3 className="font-display font-semibold text-muted-foreground">Audit log tracking coming soon</h3>
        <p className="text-sm text-muted-foreground/70 mt-1">All edits and changes will be logged here</p>
      </Card>
    </div>
  </DashboardLayout>
);

export default AuditLogs;
