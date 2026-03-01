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
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calculator, Calendar, Filter, User, Phone } from "lucide-react";
import { format } from "date-fns";

const DebtCalculator = () => {
  const [filters, setFilters] = useState({
    name: "",
    phone: "",
    type: "all",
    dateFrom: "",
    dateTo: "",
  });

  const { data: debtData, isLoading } = useQuery({
    queryKey: ["debt-calculator", filters],
    queryFn: async () => {
      let query = supabase
        .from("transactions")
        .select(`
          id,
          amount,
          created_at,
          customers (
            name,
            phone,
            customer_type
          ),
          services (name)
        `)
        .eq("payment_status", "unpaid");

      if (filters.name) {
        query = query.ilike("customers.name", `%${filters.name}%`);
      }
      if (filters.phone) {
        query = query.ilike("customers.phone", `%${filters.phone}%`);
      }
      if (filters.type !== "all") {
        query = query.eq("customers.customer_type", filters.type);
      }
      if (filters.dateFrom) {
        query = query.gte("created_at", `${filters.dateFrom}T00:00:00`);
      }
      if (filters.dateTo) {
        query = query.lte("created_at", `${filters.dateTo}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const totalDebt = debtData?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;
  const recordCount = debtData?.length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Calculator className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Debt Calculator</h1>
            <p className="text-sm text-muted-foreground">Calculate unpaid debts with advanced filters</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Filters Card */}
          <Card className="p-6 h-fit space-y-4">
            <div className="flex items-center gap-2 font-semibold text-lg">
              <Filter className="h-5 w-5" />
              <h2>Filters</h2>
            </div>
            
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <div className="relative">
                <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search name..." 
                  className="pl-9"
                  value={filters.name}
                  onChange={e => setFilters({...filters, name: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search phone..." 
                  className="pl-9"
                  value={filters.phone}
                  onChange={e => setFilters({...filters, phone: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Customer Type</Label>
              <Select 
                value={filters.type} 
                onValueChange={val => setFilters({...filters, type: val})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>From Date</Label>
                <Input 
                  type="date" 
                  value={filters.dateFrom}
                  onChange={e => setFilters({...filters, dateFrom: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>To Date</Label>
                <Input 
                  type="date" 
                  value={filters.dateTo}
                  onChange={e => setFilters({...filters, dateTo: e.target.value})}
                />
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setFilters({ name: "", phone: "", type: "all", dateFrom: "", dateTo: "" })}
            >
              Reset Filters
            </Button>
          </Card>

          {/* Results Card */}
          <div className="md:col-span-2 space-y-6">
            {/* Summary Stat */}
            <Card className="p-6 bg-primary/5 border-primary/20">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Calculated Debt</p>
                <h3 className="text-4xl font-display font-bold text-primary mt-2">
                  ₦{totalDebt.toLocaleString()}
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  From {recordCount} unpaid records found
                </p>
              </div>
            </Card>

            {/* List */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Detailed Breakdown</h3>
              {isLoading ? (
                <div className="text-center py-8">Calculating...</div>
              ) : debtData && debtData.length > 0 ? (
                <div className="space-y-0 divide-y border rounded-md max-h-[500px] overflow-y-auto">
                  {debtData.map((tx) => (
                    <div key={tx.id} className="p-4 hover:bg-muted/50 transition-colors flex justify-between items-center">
                      <div>
                        <p className="font-medium">{tx.customers?.name || "Anonymous"}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <span className="capitalize badge bg-gray-100 px-1 rounded">{tx.customers?.customer_type || "Unknown"}</span>
                          <span>•</span>
                          <span>{format(new Date(tx.created_at), 'MMM dd, yyyy')}</span>
                          <span>•</span>
                          <span>{tx.services?.name}</span>
                        </div>
                      </div>
                      <p className="font-bold text-red-600">₦{Number(tx.amount).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No unpaid records found matching these filters.
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DebtCalculator;
