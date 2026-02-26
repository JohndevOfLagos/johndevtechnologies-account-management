import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Search, CreditCard, CheckCircle, User, Banknote, Users } from "lucide-react";
import { StatCard } from "@/components/StatCard";

const DebtManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  // Fetch Customers based on search
  const { data: customers } = useQuery({
    queryKey: ["customers", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("customers")
        .select("id, name, phone, customer_type")
        .order("name");
      
      if (searchTerm) {
        query = query.ilike("name", `%${searchTerm}%`);
      }
      
      const { data, error } = await query.limit(10);
      if (error) throw error;
      return data;
    },
    enabled: true,
  });

  // Fetch Unpaid Transactions for Selected Customer
  const { data: unpaidTransactions, isLoading: isLoadingDebt } = useQuery({
    queryKey: ["unpaid-transactions", selectedCustomer?.id],
    enabled: !!selectedCustomer?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          services (name)
        `)
        .eq("customer_id", selectedCustomer.id)
        .eq("payment_status", "unpaid");

      if (error) throw error;
      return data;
    },
  });

  // Fetch All Unpaid Transactions for Overview
  const { data: allUnpaid } = useQuery({
    queryKey: ["all-unpaid-overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          amount,
          customers (customer_type)
        `)
        .eq("payment_status", "unpaid");

      if (error) throw error;
      return data;
    },
  });

  // Real-time subscription for transactions (for debt updates)
  useEffect(() => {
    const channel = supabase
      .channel("debt-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["unpaid-transactions"] });
          queryClient.invalidateQueries({ queryKey: ["all-unpaid-overview"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Calculate Overview Stats
  const overviewStats = allUnpaid?.reduce((acc, tx) => {
    const type = tx.customers?.customer_type || "normal";
    acc[type] = (acc[type] || 0) + Number(tx.amount);
    acc.total = (acc.total || 0) + Number(tx.amount);
    return acc;
  }, { vip: 0, regular: 0, normal: 0, total: 0 });

  // Calculate Total Debt for Selected Customer
  const totalDebt = unpaidTransactions?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;

  // Clear Debt Mutation
  const clearDebtMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomer || !unpaidTransactions?.length) return;

      const idsToUpdate = unpaidTransactions.map(tx => tx.id);

      const { error } = await supabase
        .from("transactions")
        .update({ payment_status: "paid" })
        .in("id", idsToUpdate);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unpaid-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["all-unpaid-overview"] });
      toast({
        title: "Success",
        description: `Cleared debt of ₦${totalDebt.toLocaleString()} for ${selectedCustomer.name}`,
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
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
            <h1 className="text-2xl font-display font-bold">Debt Management</h1>
            <p className="text-sm text-muted-foreground">Manage and clear customer debts</p>
          </div>
        </div>

        {/* Debt Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Outstanding"
            value={`₦${(overviewStats?.total || 0).toLocaleString()}`}
            change="All customers"
            changeType="negative"
            icon={Banknote}
          />
          <StatCard
            title="VIP Debt"
            value={`₦${(overviewStats?.vip || 0).toLocaleString()}`}
            change="Pay Monthly"
            icon={Users}
          />
          <StatCard
            title="Regular Debt"
            value={`₦${(overviewStats?.regular || 0).toLocaleString()}`}
            change="Pay Bi-Weekly"
            icon={Users}
          />
          <StatCard
            title="Normal Debt"
            value={`₦${(overviewStats?.normal || 0).toLocaleString()}`}
            change="Pay Instantly"
            icon={Users}
          />
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Customer Search Section */}
          <Card className="p-6 md:col-span-1 h-fit">
            <h2 className="font-semibold mb-4">Select Customer</h2>
            <div className="relative mb-4">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {customers?.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                    selectedCustomer?.id === customer.id
                      ? "bg-primary/10 border-primary/20 border"
                      : "hover:bg-muted border border-transparent"
                  }`}
                >
                  <div>
                    <p className="font-medium text-sm">{customer.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{customer.customer_type}</p>
                  </div>
                  {selectedCustomer?.id === customer.id && (
                    <CheckCircle className="h-4 w-4 text-primary" />
                  )}
                </div>
              ))}
              {customers?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No customers found</p>
              )}
            </div>
          </Card>

          {/* Debt Details Section */}
          <Card className="p-6 md:col-span-2">
            {selectedCustomer ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h2 className="text-xl font-bold">{selectedCustomer.name}</h2>
                    <p className="text-sm text-muted-foreground capitalize">
                      {selectedCustomer.customer_type} Customer
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Unpaid Debt</p>
                    <p className="text-3xl font-display font-bold text-red-600">
                      ₦{totalDebt.toLocaleString()}
                    </p>
                  </div>
                </div>

                {isLoadingDebt ? (
                  <div className="text-center py-8">Loading debt records...</div>
                ) : unpaidTransactions && unpaidTransactions.length > 0 ? (
                  <>
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm text-muted-foreground">Unpaid Transactions</h3>
                      <div className="border rounded-md divide-y max-h-[300px] overflow-y-auto">
                        {unpaidTransactions.map((tx) => (
                          <div key={tx.id} className="p-3 flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{tx.services?.name || "Service"}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(tx.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <p className="font-medium">₦{tx.amount.toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <Button 
                        className="w-full gradient-primary text-primary-foreground" 
                        size="lg"
                        onClick={() => clearDebtMutation.mutate()}
                        disabled={clearDebtMutation.isPending}
                      >
                        {clearDebtMutation.isPending ? "Processing..." : `Clear All Debt (₦${totalDebt.toLocaleString()})`}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        This will mark all {unpaidTransactions.length} unpaid transactions as Paid.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <h3 className="font-display font-semibold text-green-700">No Unpaid Debt</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      This customer has no outstanding payments.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                <User className="h-12 w-12 opacity-20 mb-4" />
                <p>Select a customer to view their debt status</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DebtManagement;
