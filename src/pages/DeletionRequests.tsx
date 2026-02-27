import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Trash2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const DeletionRequests = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch Pending Requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ["deletion-requests"],
    queryFn: async () => {
      // We need to join with profiles to get employee name, and services to get service name
      // But profiles is a separate table not directly linked by foreign key in the standard Supabase schema generation sometimes
      // Let's assume standard join works if keys exist.
      // If not, we fetch requests and then fetch profiles manually.
      
      const { data, error } = await supabase
        .from("deletion_requests")
        .select(`
          *,
          services (name)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profile names manually since profiles might not be joined easily if FK is auth.users
      const employeeIds = data.map(r => r.employee_id);
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", employeeIds);

      return data.map(req => ({
        ...req,
        employee_name: profiles?.find(p => p.id === req.employee_id)?.full_name || "Unknown Employee"
      }));
    },
  });

  // Approve Request Mutation
  const approveMutation = useMutation({
    mutationFn: async (request: any) => {
      // 1. Delete the actual records
      let query = supabase.from("transactions").delete().eq("employee_id", request.employee_id);
      
      if (request.service_id) {
        query = query.eq("service_id", request.service_id);
      }

      const { error: deleteError } = await query;
      if (deleteError) throw deleteError;

      // 2. Update request status
      const { error: updateError } = await supabase
        .from("deletion_requests")
        .update({ status: "approved" })
        .eq("id", request.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deletion-requests"] });
      toast({ title: "Approved", description: "Records deleted and request approved." });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  // Reject Request Mutation
  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from("deletion_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deletion-requests"] });
      toast({ title: "Rejected", description: "Request rejected." });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Deletion Requests</h1>
            <p className="text-sm text-muted-foreground">Approve or reject employee record deletion requests</p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Loading requests...</div>
        ) : requests && requests.length > 0 ? (
          <div className="grid gap-4">
            {requests.map((req) => (
              <Card key={req.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{req.employee_name}</h3>
                    <Badge variant="outline" className="text-yellow-600 bg-yellow-50 border-yellow-200">
                      Pending
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Requests to delete <strong>{req.service_id ? req.services?.name : "All Services"}</strong> records.
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Approx. {req.record_count} records
                    </span>
                    <span>•</span>
                    <span>{format(new Date(req.created_at), "PPP p")}</span>
                  </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                  <Button 
                    variant="outline" 
                    className="flex-1 md:flex-none border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => rejectMutation.mutate(req.id)}
                    disabled={rejectMutation.isPending || approveMutation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button 
                    className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => approveMutation.mutate(req)}
                    disabled={rejectMutation.isPending || approveMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve & Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-20" />
            <h3 className="text-lg font-medium">No Pending Requests</h3>
            <p>All clean! There are no deletion requests to review.</p>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DeletionRequests;
