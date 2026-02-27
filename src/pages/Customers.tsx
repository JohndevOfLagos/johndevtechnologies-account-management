import { useState, useEffect } from "react";
import { Users, Plus, Edit2, Save, X, ChevronLeft, ChevronRight } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Database } from "@/integrations/supabase/types";

type CustomerType = Database["public"]["Enums"]["customer_type"];

const typeBadge: Record<CustomerType, string> = {
  vip: "bg-primary/10 text-primary border-primary/20",
  regular: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  normal: "bg-muted text-muted-foreground border-border",
};

const PAGE_SIZE = 20;

const Customers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    type: "normal" as CustomerType,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<CustomerType>("normal");

  // Fetch customers with transactions to calculate balance
  const { data: customerData, isLoading } = useQuery({
    queryKey: ["customers", page],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // 1. Fetch Customers
      const { data: customers, error, count } = await supabase
        .from("customers")
        .select("*, transactions(amount, payment_status)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      // 2. Process Balance
      const processed = customers.map((customer) => {
        const balance = customer.transactions
          ? customer.transactions
              .filter((t) => t.payment_status === "unpaid")
              .reduce((sum, t) => sum + Number(t.amount), 0)
          : 0;
        return { ...customer, balance };
      });

      return { customers: processed, count };
    },
  });

  const customers = customerData?.customers || [];
  const totalCount = customerData?.count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Add customer mutation
  const addCustomerMutation = useMutation({
    mutationFn: async (newCust: typeof newCustomer) => {
      const { error } = await supabase.from("customers").insert([
        {
          name: newCust.name,
          phone: newCust.phone || null,
          customer_type: newCust.type,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setIsAddOpen(false);
      setNewCustomer({ name: "", phone: "", type: "normal" });
      toast({
        title: "Success",
        description: "Customer added successfully",
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

  // Update customer type mutation
  const updateTypeMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: CustomerType }) => {
      console.log("Updating customer:", id, "to type:", type);
      const { data, error } = await supabase
        .from("customers")
        .update({ customer_type: type })
        .eq("id", id)
        .select();

      if (error) {
        console.error("Error updating customer:", error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        throw new Error("Update failed: No records were updated. Please check permissions.");
      }
      
      console.log("Update successful:", data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setEditingId(null);
      toast({
        title: "Success",
        description: "Customer type updated successfully",
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

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addCustomerMutation.mutate(newCustomer);
  };

  const startEditing = (customer: any) => {
    setEditingId(customer.id);
    setEditingType(customer.customer_type);
  };

  const saveType = () => {
    if (editingId) {
      updateTypeMutation.mutate({ id: editingId, type: editingType });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Customers</h1>
            <p className="text-sm text-muted-foreground">
              Manage VIP, Regular, and Normal customers
            </p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary border-0 text-primary-foreground gap-2">
                <Plus className="h-4 w-4" /> Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Customer</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newCustomer.name}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newCustomer.phone}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={newCustomer.type}
                    onValueChange={(val: CustomerType) =>
                      setNewCustomer({ ...newCustomer, type: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    className="gradient-primary"
                    disabled={addCustomerMutation.isPending}
                  >
                    {addCustomerMutation.isPending ? "Adding..." : "Add Customer"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Loading customers...</div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3">
              {customers.map((c) => (
                <Card
                  key={c.id}
                  className="p-4 flex items-center justify-between hover:border-primary/20 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.phone || "No phone"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">
                      ₦{c.balance.toLocaleString()}
                    </span>
                    
                    {editingId === c.id ? (
                      <div className="flex items-center gap-2">
                        <Select
                          value={editingType}
                          onValueChange={(val: CustomerType) =>
                            setEditingType(val)
                          }
                        >
                          <SelectTrigger className="h-8 w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="regular">Regular</SelectItem>
                            <SelectItem value="vip">VIP</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-green-600"
                          onClick={saveType}
                          disabled={updateTypeMutation.isPending}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-600"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={typeBadge[c.customer_type]}
                        >
                          {c.customer_type.toUpperCase()}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 opacity-50 hover:opacity-100"
                          onClick={() => startEditing(c)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
              {customers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No customers found. Add one to get started.
                </div>
              )}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Customers;
