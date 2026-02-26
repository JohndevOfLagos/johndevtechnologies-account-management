import { UserCog } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";

const Employees = () => (
  <DashboardLayout>
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold">Employees</h1>
        <p className="text-sm text-muted-foreground">Manage staff and their permissions</p>
      </div>
      <Card className="p-12 text-center">
        <UserCog className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
        <h3 className="font-display font-semibold text-muted-foreground">Employee management coming soon</h3>
        <p className="text-sm text-muted-foreground/70 mt-1">Add and manage employee accounts with role-based access</p>
      </Card>
    </div>
  </DashboardLayout>
);

export default Employees;
