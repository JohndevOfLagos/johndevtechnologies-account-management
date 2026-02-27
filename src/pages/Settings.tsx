import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Trash2, Shield, User } from "lucide-react";

const Settings = () => {
  const { toast } = useToast();
  const { user, role } = useAuth();
  const [isClearOpen, setIsClearOpen] = useState(false);
  const [serviceToClear, setServiceToClear] = useState<string>("all");
  const [recordCount, setRecordCount] = useState<number | null>(null);

  // Check records count when dialog opens or service changes
  const checkRecords = async () => {
    if (!user) return;
    let query = supabase.from("transactions").select("*", { count: 'exact', head: true }).eq("employee_id", user.id);
    
    if (serviceToClear !== "all") {
      const { data: service } = await supabase.from("services").select("id").eq("name", serviceToClear).single();
      if (service) {
        query = query.eq("service_id", service.id);
      }
    }
    
    const { count } = await query;
    setRecordCount(count);
  };

  useEffect(() => {
    if (isClearOpen) {
      checkRecords();
    }
  }, [isClearOpen, serviceToClear]);

  // Request Clearance Mutation (Employee Only)
  const requestClearanceMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;

      let serviceId = null;
      if (serviceToClear !== "all") {
        const { data: service } = await supabase.from("services").select("id").eq("name", serviceToClear).single();
        serviceId = service?.id;
      }

      const { error } = await supabase.from("deletion_requests").insert({
        employee_id: user.id,
        service_id: serviceId,
        record_count: recordCount,
        status: 'pending'
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setIsClearOpen(false);
      toast({ title: "Request Sent", description: "Deletion request sent to Admin for approval." });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-display font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account preferences</p>
        </div>

        <div className="grid gap-6">
          {/* Profile Card */}
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                {user?.email?.[0]?.toUpperCase() || <User />}
              </div>
              <div>
                <h2 className="text-xl font-semibold">My Profile</h2>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium capitalize">{role}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Data Management Card (Employee Only) */}
          {role !== 'admin' && (
            <Card className="p-6 border-red-200 bg-red-50/10">
              <div className="flex items-center gap-2 mb-4">
                <Trash2 className="h-5 w-5 text-red-500" />
                <h3 className="text-lg font-semibold text-red-700">Request Record Deletion</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">Clear My Records</h4>
                  <p className="text-sm text-muted-foreground">
                    Request to delete your transaction history. This requires Admin approval.
                  </p>
                </div>
                
                <Button 
                  variant="destructive" 
                  onClick={() => setIsClearOpen(true)}
                  className="w-full sm:w-auto"
                >
                  Request Deletion
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Clear Records Dialog */}
        <Dialog open={isClearOpen} onOpenChange={setIsClearOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Record Deletion</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="text-sm text-muted-foreground">
                <p>This will send a request to the Admin to delete your records.</p>
                {recordCount !== null && (
                  <p className="mt-2 font-medium text-foreground">
                    Found {recordCount} records to delete.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Filter by Service</Label>
                <Select value={serviceToClear} onValueChange={setServiceToClear}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    <SelectItem value="Charging Station">Charging Station</SelectItem>
                    <SelectItem value="Accessories">Accessories</SelectItem>
                    <SelectItem value="POS Agent">POS Agent</SelectItem>
                    <SelectItem value="Snooker Spot">Snooker Spot</SelectItem>
                    <SelectItem value="Repairs">Repairs</SelectItem>
                    <SelectItem value="Device Sales">Device Sales</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsClearOpen(false)}>Cancel</Button>
              <Button 
                variant="destructive" 
                onClick={() => requestClearanceMutation.mutate()}
                disabled={requestClearanceMutation.isPending}
              >
                {requestClearanceMutation.isPending ? "Sending..." : "Send Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
