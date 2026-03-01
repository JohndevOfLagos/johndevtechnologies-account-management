import { useState, useEffect } from "react";
import { BarChart3, Download, FileSpreadsheet, Star } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type CustomerType = Database["public"]["Enums"]["customer_type"] | "all" | "unknown";

const Reports = () => {
  const queryClient = useQueryClient();
  const [customerTypeFilter, setCustomerTypeFilter] = useState<CustomerType>("all");

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("reports-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["reports"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Fetch Transactions for Report
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["reports", customerTypeFilter],
    queryFn: async () => {
      let query = supabase
        .from("transactions")
        .select(`
          *,
          customers (name, customer_type),
          services (name),
          users:employee_id (email)
        `)
        .order("created_at", { ascending: false });

      if (customerTypeFilter === "unknown") {
        query = query.is("customer_id", null);
      } else {
        // Default: Exclude anonymous transactions unless specifically filtered
        if (customerTypeFilter === "all") {
           query = query.not("customer_id", "is", null);
        } else if (customerTypeFilter !== "all") {
           query = query.eq("customers.customer_type", customerTypeFilter);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const exportCSV = () => {
    if (!transactions || transactions.length === 0) return;

    const headers = [
      "Date",
      "Service",
      "Customer",
      "Type",
      "Amount",
      "Profit",
      "Status",
      "Employee"
    ];

    const rows = transactions.map((tx) => [
      new Date(tx.created_at).toLocaleDateString(),
      tx.services?.name || "Unknown",
      tx.customers?.name || "Unknown",
      tx.customers?.customer_type || "Unknown",
      tx.amount,
      tx.profit || 0,
      tx.payment_status,
      // @ts-ignore - Supabase types join fix
      tx.users?.email || "Unknown"
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `report_${customerTypeFilter}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalRevenue = transactions?.reduce((sum, tx) => {
    // Only count paid transactions
    if (tx.payment_status !== "paid") return sum;
    
    // For POS Agent, only count profit as revenue
    if (tx.services?.name === "POS Agent") {
      const profit = Number(tx.profit);
      return sum + (isNaN(profit) ? 0 : profit);
    }
    
    // For other services, count the full amount
    const amount = Number(tx.amount);
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0) || 0;

  const totalProfit = transactions?.reduce((sum, tx) => sum + (Number(tx.profit) || 0), 0) || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold">Reports</h1>
            <p className="text-sm text-muted-foreground">
              Generate and export financial reports
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={customerTypeFilter}
              onValueChange={(val: CustomerType) => setCustomerTypeFilter(val)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="unknown">Unknown (Anonymous)</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2" onClick={exportCSV} disabled={!transactions?.length}>
              <FileSpreadsheet className="h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground font-medium">Total Revenue</p>
            <p className="text-2xl font-bold mt-1">₦{totalRevenue.toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground font-medium">Total Profit</p>
            <p className="text-2xl font-bold mt-1 text-green-600">₦{totalProfit.toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground font-medium">Total Transactions</p>
            <p className="text-2xl font-bold mt-1">{transactions?.length || 0}</p>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b bg-muted/40">
            <h3 className="font-semibold">Transaction History</h3>
          </div>
          {isLoading ? (
            <div className="p-8 text-center">Loading data...</div>
          ) : !transactions?.length ? (
            <div className="p-8 text-center text-muted-foreground">No records found for this filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/20 text-left">
                    <th className="p-3 font-medium text-muted-foreground">Date</th>
                    <th className="p-3 font-medium text-muted-foreground">Service</th>
                    <th className="p-3 font-medium text-muted-foreground">Customer</th>
                    <th className="p-3 font-medium text-muted-foreground">Type</th>
                    <th className="p-3 font-medium text-muted-foreground text-right">Amount</th>
                    <th className="p-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/10">
                      <td className="p-3">{new Date(tx.created_at).toLocaleDateString()}</td>
                      <td className="p-3 font-medium">{tx.services?.name}</td>
                      <td className="p-3">{tx.customers?.name}</td>
                      <td className="p-3 capitalize">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          tx.customers?.customer_type === 'vip' ? 'bg-purple-100 text-purple-700' :
                          tx.customers?.customer_type === 'regular' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {tx.customers?.customer_type}
                        </span>
                      </td>
                      <td className="p-3 text-right">₦{tx.amount.toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${
                          tx.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {tx.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
