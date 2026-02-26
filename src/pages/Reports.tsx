import { BarChart3, Download } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Reports = () => (
  <DashboardLayout>
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">Daily and monthly financial reports</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" /> Export PDF
        </Button>
      </div>
      <Card className="p-12 text-center">
        <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
        <h3 className="font-display font-semibold text-muted-foreground">Report generation coming soon</h3>
        <p className="text-sm text-muted-foreground/70 mt-1">Daily and monthly reports with PDF export</p>
      </Card>
    </div>
  </DashboardLayout>
);

export default Reports;
