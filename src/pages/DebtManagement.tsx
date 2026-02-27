import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Search, CreditCard, CheckCircle, User, Banknote, Users, Send, Filter, CheckSquare } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { useAuth } from "@/contexts/AuthContext";
import { Checkbox } from "@/components/ui/checkbox";

const DebtManagement = () => {
  const { toast } = useToast();
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  
  // Advanced Filters
  const [filters, setFilters] = useState({
    name: "",
    phone: "",
    type: "all",
    status: "unpaid",
    dateFrom: "",
    dateTo: "",
  });

  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [isSelectAll, setIsSelectAll] = useState(false);

  // 1. Fetch Customers who match the profile filters (Name, Phone, Type)
  const { data: customers } = useQuery({
    queryKey: ["customers-filtered", filters.name, filters.phone, filters.type],
    queryFn: async () => {
      let query = supabase
        .from("customers")
        .select("id, name, phone, customer_type")
        .order("name");
      
      if (filters.name) query = query.ilike("name", `%${filters.name}%`);
      if (filters.phone) query = query.ilike("phone", `%${filters.phone}%`);
      if (filters.type !== "all") query = query.eq("customer_type", filters.type);
      
      const { data, error } = await query.limit(50); // Limit results for performance
      if (error) throw error;
      return data || [];
    },
  });

  // 2. Fetch Transactions for ALL filtered customers (filtered by Status and Date)
  const { data: filteredTransactions, isLoading: isLoadingDebt } = useQuery({
    queryKey: ["filtered-transactions", filters, customers],
    enabled: !!customers && customers.length > 0,
    queryFn: async () => {
      if (!customers || customers.length === 0) return [];
      
      const customerIds = customers.map(c => c.id);
      
      let query = supabase
        .from("transactions")
        .select(`
          id,
          amount,
          created_at,
          customer_id,
          payment_status,
          services (name)
        `)
        .in("customer_id", customerIds);

      if (filters.status !== "all") {
        query = query.eq("payment_status", filters.status);
      }

      if (filters.dateFrom) query = query.gte("created_at", `${filters.dateFrom}T00:00:00`);
      if (filters.dateTo) query = query.lte("created_at", `${filters.dateTo}T23:59:59`);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Derived Data
  const customersWithData = customers?.map(cust => {
    const custTransactions = filteredTransactions?.filter(tx => tx.customer_id === cust.id) || [];
    const totalAmount = custTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const hasUnpaid = custTransactions.some(tx => tx.payment_status === "unpaid");
    return { ...cust, totalAmount, transactions: custTransactions, hasUnpaid };
  }).filter(c => c.transactions.length > 0) || []; 

  // Handle Selection
  const handleSelectAll = () => {
    if (isSelectAll) {
      setSelectedCustomerIds([]);
    } else {
      setSelectedCustomerIds(customersWithData.map(c => c.id));
    }
    setIsSelectAll(!isSelectAll);
  };

  const handleSelectCustomer = (id: string) => {
    if (selectedCustomerIds.includes(id)) {
      setSelectedCustomerIds(selectedCustomerIds.filter(cid => cid !== id));
      setIsSelectAll(false);
    } else {
      setSelectedCustomerIds([...selectedCustomerIds, id]);
    }
  };

  // Calculate Totals for Selection
  const selectedCustomersData = customersWithData.filter(c => selectedCustomerIds.includes(c.id));
  const grandTotalAmount = selectedCustomersData.reduce((sum, c) => sum + c.totalAmount, 0);

  // Clear Debt Mutation (Admin) - Only affects UNPAID transactions within selection
  const clearDebtMutation = useMutation({
    mutationFn: async () => {
      if (selectedCustomersData.length === 0) return;

      // Filter only unpaid transactions to clear
      const unpaidTxIds = selectedCustomersData.flatMap(c => 
        c.transactions.filter(t => t.payment_status === "unpaid").map(t => t.id)
      );
      
      if (unpaidTxIds.length === 0) {
        throw new Error("No unpaid transactions found in selection.");
      }

      const { error } = await supabase
        .from("transactions")
        .update({ payment_status: "paid" })
        .in("id", unpaidTxIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["filtered-transactions"] });
      setSelectedCustomerIds([]);
      setIsSelectAll(false);
      toast({ title: "Success", description: "Selected debts have been marked as paid." });
    },
    onError: (error) => toast({ variant: "destructive", title: "Error", description: error.message }),
  });

  // Request Clearance Mutation (Employee) - Only affects UNPAID
  const requestClearanceMutation = useMutation({
    mutationFn: async () => {
      if (selectedCustomersData.length === 0 || !user) return;

      // Calculate unpaid amount per customer
      const requests = selectedCustomersData
        .map(c => {
          const unpaidAmount = c.transactions
            .filter(t => t.payment_status === "unpaid")
            .reduce((sum, t) => sum + Number(t.amount), 0);
          
          return {
            customer_id: c.id,
            requested_by: user.id,
            amount: unpaidAmount,
            status: 'pending'
          };
        })
        .filter(r => r.amount > 0);

      if (requests.length === 0) {
         throw new Error("No unpaid debt to request clearance for.");
      }

      const { error } = await supabase.from("debt_clearance_requests").insert(requests);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Request Sent", description: `Sent clearance requests.` });
      setSelectedCustomerIds([]);
      setIsSelectAll(false);
      queryClient.invalidateQueries({ queryKey: ["debt-requests"] });
    },
    onError: (error) => toast({ variant: "destructive", title: "Error", description: error.message }),
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
            <p className="text-sm text-muted-foreground">Filter, select, and clear customer debts</p>
          </div>
        </div>

        <div className="grid md:grid-cols-12 gap-6">
          {/* Filters Panel */}
          <Card className="p-4 md:col-span-3 h-fit space-y-4">
            <div className="flex items-center gap-2 font-semibold">
              <Filter className="h-4 w-4" /> Filters
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input placeholder="Search name..." value={filters.name} onChange={e => setFilters({...filters, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input placeholder="Search phone..." value={filters.phone} onChange={e => setFilters({...filters, phone: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={filters.type} onValueChange={val => setFilters({...filters, type: val})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={val => setFilters({...filters, status: val})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input type="date" value={filters.dateFrom} onChange={e => setFilters({...filters, dateFrom: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input type="date" value={filters.dateTo} onChange={e => setFilters({...filters, dateTo: e.target.value})} />
            </div>
          </Card>

          {/* Results & Actions Panel */}
          <Card className="p-6 md:col-span-9">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Checkbox 
                  checked={isSelectAll} 
                  onCheckedChange={handleSelectAll}
                  id="select-all"
                />
                <Label htmlFor="select-all" className="cursor-pointer font-medium">
                  Select All Matching ({customersWithData.length})
                </Label>
              </div>
              <div className="text-right">
                 <span className="text-sm text-muted-foreground">Selected Total:</span>
                 <span className="ml-2 text-xl font-bold text-primary">₦{grandTotalAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="border rounded-md divide-y max-h-[500px] overflow-y-auto mb-6">
              {isLoadingDebt ? (
                <div className="p-8 text-center text-muted-foreground">Loading data...</div>
              ) : customersWithData.length > 0 ? (
                customersWithData.map(customer => (
                  <div key={customer.id} className="p-4 hover:bg-muted/50 transition-colors flex items-center gap-4">
                    <Checkbox 
                      checked={selectedCustomerIds.includes(customer.id)}
                      onCheckedChange={() => handleSelectCustomer(customer.id)}
                    />
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <p className="font-semibold">{customer.name}</p>
                        <p className={`font-bold ${customer.hasUnpaid ? "text-red-600" : "text-green-600"}`}>
                          ₦{customer.totalAmount.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                        <span className="capitalize badge bg-gray-100 px-1 rounded">{customer.customer_type}</span>
                        <span>•</span>
                        <span>{customer.transactions.length} Records</span>
                        <span>•</span>
                        <span>{customer.phone || "No Phone"}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  No customers found matching these filters.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              {filters.status !== 'paid' && ( // Only show action buttons if we are looking at Unpaid or All
                role === "admin" ? (
                  <Button 
                    className="gradient-primary text-white w-full md:w-auto"
                    disabled={selectedCustomerIds.length === 0 || clearDebtMutation.isPending}
                    onClick={() => clearDebtMutation.mutate()}
                  >
                    {clearDebtMutation.isPending ? "Processing..." : `Clear Selected Debt`}
                  </Button>
                ) : (
                  <Button 
                    className="bg-orange-500 hover:bg-orange-600 text-white w-full md:w-auto gap-2"
                    disabled={selectedCustomerIds.length === 0 || requestClearanceMutation.isPending}
                    onClick={() => requestClearanceMutation.mutate()}
                  >
                    <Send className="h-4 w-4" />
                    {requestClearanceMutation.isPending ? "Sending..." : `Request Clearance`}
                  </Button>
                )
              )}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DebtManagement;
