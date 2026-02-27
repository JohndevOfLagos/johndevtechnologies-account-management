import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { CheckCircle, XCircle, Clock, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const DebtRequests = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch Pending Requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ["debt-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("debt_clearance_requests")
        .select(`
          *,
          customers (name, customer_type)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel("requests-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "debt_clearance_requests" },
        () => queryClient.invalidateQueries({ queryKey: ["debt-requests"] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Approve Request Mutation
  const approveMutation = useMutation({
    mutationFn: async (request: any) => {
      // 1. Update transactions to paid
      const { error: txError } = await supabase
        .from("transactions")
        .update({ payment_status: "paid" })
        .eq("customer_id", request.customer_id)
        .eq("payment_status", "unpaid");

      if (txError) throw txError;

      // 2. Update request status
      const { error: reqError } = await supabase
        .from("debt_clearance_requests")
        .update({ status: "approved" })
        .eq("id", request.id);

      if (reqError) throw reqError;
    },
    onSuccess: () => {
      toast({ title: "Approved", description: "Debt cleared and request approved." });
      queryClient.invalidateQueries({ queryKey: ["debt-requests"] });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  // Reject Request Mutation
  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("debt_clearance_requests")
        .update({ status: "rejected" })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Rejected", description: "Request rejected." });
      queryClient.invalidateQueries({ queryKey: ["debt-requests"] });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Debt Clearance Requests</h1>
            <p className="text-sm text-muted-foreground">Review and approve employee requests</p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Loading requests...</div>
        ) : !requests?.length ? (
          <Card className="p-12 text-center text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
            <h3 className="text-lg font-semibold">No Pending Requests</h3>
            <p>All clear! No employees are waiting for approval.</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {requests.map((req) => (
              <Card key={req.id} className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{req.customers?.name}</h3>
                    <Badge variant="outline" className="capitalize">
                      {req.customers?.customer_type}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Requested by: <span className="font-medium text-foreground">
                        Employee
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(req.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Amount to Clear</p>
                    <p className="text-2xl font-bold text-red-600">₦{Number(req.amount).toLocaleString()}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => rejectMutation.mutate(req.id)}
                      disabled={rejectMutation.isPending || approveMutation.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      className="gradient-primary"
                      onClick={() => approveMutation.mutate(req)}
                      disabled={rejectMutation.isPending || approveMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DebtRequests;
