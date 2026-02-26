import { Users, Plus } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const mockCustomers = [
  { name: "Adebayo M.", phone: "0801234567", type: "vip" as const, balance: "₦12,500" },
  { name: "Chioma K.", phone: "0809876543", type: "regular" as const, balance: "₦5,200" },
  { name: "Emeka O.", phone: "0807654321", type: "normal" as const, balance: "₦0" },
  { name: "Fatima S.", phone: "0803456789", type: "vip" as const, balance: "₦8,000" },
];

const typeBadge = {
  vip: "bg-primary/10 text-primary border-primary/20",
  regular: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  normal: "bg-muted text-muted-foreground border-border",
};

const Customers = () => (
  <DashboardLayout>
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Customers</h1>
          <p className="text-sm text-muted-foreground">Manage VIP, Regular, and Normal customers</p>
        </div>
        <Button className="gradient-primary border-0 text-primary-foreground gap-2">
          <Plus className="h-4 w-4" /> Add Customer
        </Button>
      </div>

      <div className="grid gap-3">
        {mockCustomers.map((c) => (
          <Card key={c.phone} className="p-4 flex items-center justify-between hover:border-primary/20 transition-colors">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">{c.balance}</span>
              <Badge variant="outline" className={typeBadge[c.type]}>
                {c.type.toUpperCase()}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  </DashboardLayout>
);

export default Customers;
