import { useState, useEffect } from "react";
import { LucideIcon, Plus, User, Banknote, Calendar, Pencil, Trash2, Filter, Star } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { useAuth } from "@/contexts/AuthContext";
import { Database } from "@/integrations/supabase/types";

type CustomerType = Database["public"]["Enums"]["customer_type"];
type PaymentStatus = Database["public"]["Enums"]["payment_status"];

interface ServicePageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  fields: string[];
}

export function ServicePage({
  title,
  description,
  icon: Icon,
  fields,
}: ServicePageProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false); // Edit dialog state
  const [editingTx, setEditingTx] = useState<any>(null); // Transaction being edited
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    type: "normal" as CustomerType,
  });
  const [amount, setAmount] = useState("");
  const [profit, setProfit] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("paid");
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [transactionType, setTransactionType] = useState<"Withdraw" | "Transfer" | "Deposit">("Withdraw");
  const [gamesPlayed, setGamesPlayed] = useState(""); // State for games played (Snooker)
  
  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");
  const [customerTypeFilter, setCustomerTypeFilter] = useState<CustomerType | "all" | "unknown">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Delete Confirmation State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Filter out standard fields from metadata inputs
  const metadataFields = fields.filter(
    (f) =>
      ![
        "Customer Name",
        "Amount",
        "Payment Status",
        "Profit",
        "Cash Received", // Often used in POS, treat as metadata if needed or handle specially
        "Timestamp",
        "Withdraw Amount", // Exclude these as they are handled by transaction type logic
        "Transfer Amount",
        "Played Time", // Clean up old reference if any
        "Games Played", // Exclude standard metadata input for this, we'll handle it specially
      ].includes(f)
  );

  // Fetch Service ID
  const { data: service } = useQuery({
    queryKey: ["service", title],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id")
        .eq("name", title)
        .maybeSingle(); // Changed from single() to maybeSingle() to handle missing service gracefully
      
      if (error) {
        console.error("Error fetching service:", error);
        return null;
      }
      
      // If service doesn't exist, try to create it (optional self-healing)
      if (!data) {
        console.log(`Service '${title}' not found, attempting to create...`);
        const { data: newService, error: createError } = await supabase
          .from("services")
          .insert([{ name: title }])
          .select("id")
          .single();
          
        if (createError) {
          console.error("Error creating service:", createError);
          return null;
        }
        return newService;
      }
      
      return data;
    },
  });

  // Fetch Customers
  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, phone, customer_type")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch Transactions with Filters
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions", service?.id, searchTerm, statusFilter, customerTypeFilter, startDate, endDate],
    enabled: !!service?.id,
    queryFn: async () => {
      console.log("Fetching transactions for service ID:", service?.id);
      
      const term = searchTerm.toLowerCase();
      // Check if user is specifically searching for "unknown" or "anonymous" records
      const isSearchUnknown = term === "unknown" || term === "unknow" || term === "anonymous";
      
      // Use inner join if:
      // 1. We have a search term AND it's NOT a search for "unknown" (we want strict name matching)
      // 2. We have a specific customer type filter (VIP/Regular/Normal)
      const useInnerJoin = (searchTerm && !isSearchUnknown) || (customerTypeFilter !== "all" && customerTypeFilter !== "unknown");
      
      let query = supabase
        .from("transactions")
        .select(`
          *,
          customers${useInnerJoin ? "!inner" : ""} (name, customer_type)
        `)
        .eq("service_id", service!.id)
        .order("created_at", { ascending: false });

      // Apply Filters
      if (searchTerm) {
        if (isSearchUnknown) {
          // User explicitly searched for "unknown", show anonymous records
          query = query.is("customer_id", null);
        } else {
          // Normal search by name (inner join handles the filtering)
          query = query.ilike('customers.name', `%${searchTerm}%`);
        }
      } else {
        // Default: Show ALL transactions, including unknown/anonymous ones
        // Only filter if a specific customer type is selected
        if (customerTypeFilter === "unknown") {
          query = query.is("customer_id", null);
        } 
        // We REMOVED the "else if (customerTypeFilter === 'all')" block that was hiding null customer_ids
      }

      if (statusFilter !== "all") {
        query = query.eq("payment_status", statusFilter);
      }

      if (customerTypeFilter !== "all" && customerTypeFilter !== "unknown") {
        query = query.eq("customers.customer_type", customerTypeFilter);
      }

      if (startDate) {
        query = query.gte("created_at", new Date(startDate).toISOString());
      }

      if (endDate) {
        // Set end date to end of day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query = query.lte("created_at", end.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching transactions:", error);
        throw error;
      }
      
      console.log("Transactions fetched:", data);
      return data;
    },
  });

  // Real-time subscription for transactions
  useEffect(() => {
    if (!service?.id) return;

    const channel = supabase
      .channel(`service-transactions-${service.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `service_id=eq.${service.id}`,
        },
        (payload) => {
          console.log("Real-time update received:", payload);
          queryClient.invalidateQueries({ queryKey: ["transactions", service.id] });
          // Also invalidate dashboard queries just in case
          queryClient.invalidateQueries({ queryKey: ["all-transactions"] });
          queryClient.invalidateQueries({ queryKey: ["unpaid-transactions"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [service?.id, queryClient]);

  // Create Transaction Mutation
  const createTransactionMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not authenticated");
      if (!service) throw new Error("Service not found");

      let customerId = selectedCustomerId;

      // Check for duplicate customer name if creating new
      if (isNewCustomer) {
        const trimmedName = newCustomer.name.trim();
        
        // Check if name exists (case-insensitive)
        const { data: existing, error: checkError } = await supabase
          .from("customers")
          .select("id, name")
          .ilike("name", trimmedName)
          .limit(1);

        if (checkError) throw checkError;
        
        if (existing && existing.length > 0) {
          throw new Error(`Customer "${existing[0].name}" already exists.`);
        }

        const { data: custData, error: custError } = await supabase
          .from("customers")
          .insert([
            {
              name: trimmedName,
              phone: newCustomer.phone || null,
              customer_type: newCustomer.type,
            },
          ])
          .select()
          .single();

        if (custError) throw custError;
        customerId = custData.id;
      } else if (!customerId || customerId === "none") {
        // Allow transaction without customer
        customerId = null as unknown as string; // Supabase handles null as NULL in database
      }

      const timestamp = new Date().toISOString();

      const { error } = await supabase.from("transactions").insert([
        {
          service_id: service.id,
          customer_id: customerId,
          employee_id: user.id,
          amount: Number(amount),
          profit: profit ? Number(profit) : null,
          payment_status: paymentStatus,
          metadata: metadata,
          created_at: timestamp,
        },
      ]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] }); // In case new customer added
      setIsAddOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Transaction recorded successfully",
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

    // Update Transaction Mutation
  const updateTransactionMutation = useMutation({
    mutationFn: async () => {
      if (!editingTx) return;

      const { error } = await supabase
        .from("transactions")
        .update({
          amount: Number(amount),
          profit: profit ? Number(profit) : null,
          payment_status: paymentStatus,
          metadata: metadata,
        })
        .eq("id", editingTx.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setIsEditOpen(false);
      setEditingTx(null);
      resetForm();
      toast({
        title: "Success",
        description: "Transaction updated successfully",
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

  // Delete Transaction Mutation
  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["all-transactions"] });
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
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

  const handleDelete = (id: string) => {
    setDeleteId(id);
    setIsDeleteOpen(true);
  };
  
  const confirmDelete = () => {
    if (deleteId) {
      deleteTransactionMutation.mutate(deleteId);
      setIsDeleteOpen(false);
      setDeleteId(null);
    }
  };

  const handleEdit = (tx: any) => {
    setEditingTx(tx);
    setAmount(tx.amount.toString());
    setProfit(tx.profit?.toString() || "");
    setPaymentStatus(tx.payment_status);
    setMetadata((tx.metadata as Record<string, string>) || {});
    
    // Set specific metadata fields to state if they exist
    if (tx.metadata) {
        if (tx.metadata["Transaction Type"]) {
            setTransactionType(tx.metadata["Transaction Type"] as "Withdraw" | "Transfer" | "Deposit");
        }
        if (tx.metadata["Games Played"]) {
            setGamesPlayed(tx.metadata["Games Played"]);
        }
    }
    
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setIsNewCustomer(false);
    setSelectedCustomerId("");
    setNewCustomer({ name: "", phone: "", type: "normal" });
    setAmount("");
    setProfit("");
    setPaymentStatus("paid");
    setMetadata({});
    setTransactionType("Withdraw");
    setGamesPlayed("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Add transaction type to metadata for POS
    if (title === "POS Agent") {
        metadata["Transaction Type"] = transactionType;
    }
    // Add games played to metadata for Snooker Spot
    if (fields.includes("Games Played") && gamesPlayed) {
        metadata["Games Played"] = gamesPlayed;
    }
    if (isEditOpen) {
        updateTransactionMutation.mutate();
    } else {
        createTransactionMutation.mutate();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold">{title}</h1>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
            <Dialog open={isAddOpen} onOpenChange={(open) => {
              setIsAddOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gradient-primary border-0 text-primary-foreground gap-2">
                  <Plus className="h-4 w-4" />
                  New Record
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>New {title} Record</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  {/* Customer Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Customer</Label>
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto text-xs"
                      onClick={() => setIsNewCustomer(!isNewCustomer)}
                    >
                      {isNewCustomer ? "Select Existing" : "Create New"}
                    </Button>
                  </div>

                  {isNewCustomer ? (
                    <div className="space-y-3 p-3 border rounded-md bg-muted/50">
                      <div className="space-y-2">
                        <Label htmlFor="new-name" className="text-xs">
                          Name
                        </Label>
                        <Input
                          id="new-name"
                          value={newCustomer.name}
                          onChange={(e) =>
                            setNewCustomer({
                              ...newCustomer,
                              name: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-phone" className="text-xs">
                          Phone
                        </Label>
                        <Input
                          id="new-phone"
                          value={newCustomer.phone}
                          onChange={(e) =>
                            setNewCustomer({
                              ...newCustomer,
                              phone: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-type" className="text-xs">
                          Type
                        </Label>
                        <Select
                          value={newCustomer.type}
                          onValueChange={(val: CustomerType) =>
                            setNewCustomer({ ...newCustomer, type: val })
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="regular">Regular</SelectItem>
                            <SelectItem value="vip">VIP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <Select
                      value={selectedCustomerId}
                      onValueChange={setSelectedCustomerId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a customer (Optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Customer (Anonymous)</SelectItem>
                        {customers?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} ({c.customer_type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Transaction Type Selection for POS Agent */}
                {title === "POS Agent" && (
                  <div className="space-y-2">
                    <Label>Transaction Type</Label>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="type-withdraw"
                          value="Withdraw"
                          checked={transactionType === "Withdraw"}
                          onChange={(e) => setTransactionType(e.target.value as "Withdraw")}
                          className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                        />
                        <Label htmlFor="type-withdraw" className="font-normal cursor-pointer">
                          Withdraw
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="type-transfer"
                          value="Transfer"
                          checked={transactionType === "Transfer"}
                          onChange={(e) => setTransactionType(e.target.value as "Transfer")}
                          className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                        />
                        <Label htmlFor="type-transfer" className="font-normal cursor-pointer">
                          Transfer
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="type-deposit"
                          value="Deposit"
                          checked={transactionType === "Deposit"}
                          onChange={(e) => setTransactionType(e.target.value as "Deposit")}
                          className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                        />
                        <Label htmlFor="type-deposit" className="font-normal cursor-pointer">
                          Deposit
                        </Label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Games Played Input for Snooker Spot */}
                {fields.includes("Games Played") && (
                  <div className="space-y-2">
                    <Label htmlFor="games-played">Games Played</Label>
                    <Input
                      id="games-played"
                      type="number"
                      placeholder="e.g. 2"
                      value={gamesPlayed}
                      onChange={(e) => setGamesPlayed(e.target.value)}
                    />
                  </div>
                )}

                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₦)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>

                {/* Profit (Only if applicable) */}
                {fields.includes("Profit") && (
                  <div className="space-y-2">
                    <Label htmlFor="profit">Profit (₦)</Label>
                    <Input
                      id="profit"
                      type="number"
                      value={profit}
                      onChange={(e) => setProfit(e.target.value)}
                    />
                  </div>
                )}

                {/* Metadata Fields */}
                {metadataFields.map((field) => (
                  <div key={field} className="space-y-2">
                    <Label htmlFor={`meta-${field}`}>{field}</Label>
                    <Input
                      id={`meta-${field}`}
                      value={metadata[field] || ""}
                      onChange={(e) =>
                        setMetadata({ ...metadata, [field]: e.target.value })
                      }
                    />
                  </div>
                ))}

                {/* Payment Status */}
                <div className="space-y-2">
                  <Label htmlFor="status">Payment Status</Label>
                  <Select
                    value={paymentStatus}
                    onValueChange={(val: PaymentStatus) => setPaymentStatus(val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter>
                  <Button
                    type="submit"
                    className="gradient-primary"
                    disabled={createTransactionMutation.isPending || updateTransactionMutation.isPending}
                  >
                    {createTransactionMutation.isPending || updateTransactionMutation.isPending
                      ? "Saving..."
                      : "Save Record"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Transaction Dialog */}
        <Dialog open={isEditOpen} onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) {
            setEditingTx(null);
            resetForm();
          }
        }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit {title} Record</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {/* Transaction Type Selection for POS Agent */}
                {title === "POS Agent" && (
                  <div className="space-y-2">
                    <Label>Transaction Type</Label>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="edit-type-withdraw"
                          value="Withdraw"
                          checked={transactionType === "Withdraw"}
                          onChange={(e) => setTransactionType(e.target.value as "Withdraw")}
                          className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                        />
                        <Label htmlFor="edit-type-withdraw" className="font-normal cursor-pointer">
                          Withdraw
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="edit-type-transfer"
                          value="Transfer"
                          checked={transactionType === "Transfer"}
                          onChange={(e) => setTransactionType(e.target.value as "Transfer")}
                          className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                        />
                        <Label htmlFor="edit-type-transfer" className="font-normal cursor-pointer">
                          Transfer
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="edit-type-deposit"
                          value="Deposit"
                          checked={transactionType === "Deposit"}
                          onChange={(e) => setTransactionType(e.target.value as "Deposit")}
                          className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                        />
                        <Label htmlFor="edit-type-deposit" className="font-normal cursor-pointer">
                          Deposit
                        </Label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Games Played Input for Snooker Spot */}
                {fields.includes("Games Played") && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-games-played">Games Played</Label>
                    <Input
                      id="edit-games-played"
                      type="number"
                      placeholder="e.g. 2"
                      value={gamesPlayed}
                      onChange={(e) => setGamesPlayed(e.target.value)}
                    />
                  </div>
                )}

                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="edit-amount">Amount (₦)</Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>

                {/* Profit (Only if applicable) */}
                {fields.includes("Profit") && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-profit">Profit (₦)</Label>
                    <Input
                      id="edit-profit"
                      type="number"
                      value={profit}
                      onChange={(e) => setProfit(e.target.value)}
                    />
                  </div>
                )}

                {/* Metadata Fields */}
                {metadataFields.map((field) => (
                  <div key={field} className="space-y-2">
                    <Label htmlFor={`edit-meta-${field}`}>{field}</Label>
                    <Input
                      id={`edit-meta-${field}`}
                      value={metadata[field] || ""}
                      onChange={(e) =>
                        setMetadata({ ...metadata, [field]: e.target.value })
                      }
                    />
                  </div>
                ))}

                {/* Payment Status */}
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Payment Status</Label>
                  <Select
                    value={paymentStatus}
                    onValueChange={(val: PaymentStatus) => setPaymentStatus(val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <DialogFooter>
                  <Button
                    type="submit"
                    className="gradient-primary"
                    disabled={updateTransactionMutation.isPending}
                  >
                    {updateTransactionMutation.isPending
                      ? "Updating..."
                      : "Update Record"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Search and Filter Bar */}
          <Card className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 bg-muted/30">
            <div className="lg:col-span-2 space-y-2">
              <Label htmlFor="search" className="text-xs text-muted-foreground">Search</Label>
              <div className="relative">
                <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search customer name..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-status" className="text-xs text-muted-foreground">Status</Label>
              <Select value={statusFilter} onValueChange={(val: PaymentStatus | "all") => setStatusFilter(val)}>
                <SelectTrigger id="filter-status">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-type" className="text-xs text-muted-foreground">Customer Type</Label>
              <Select value={customerTypeFilter} onValueChange={(val: CustomerType | "all" | "unknown") => setCustomerTypeFilter(val)}>
                <SelectTrigger id="filter-type">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="unknown">Unknown (Anonymous)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-date" className="text-xs text-muted-foreground">Date Range</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  placeholder="Start"
                  className="text-xs px-2"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <Input
                  type="date"
                  placeholder="End"
                  className="text-xs px-2"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Transaction List */}
        {isLoading ? (
          <div className="text-center py-8">Loading records...</div>
        ) : !transactions || transactions.length === 0 ? (
          <Card className="p-6">
            <div className="text-center py-12">
              <Icon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="font-display font-semibold text-muted-foreground">
                No records yet
              </h3>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Create your first {title.toLowerCase()} record to get started
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-3">
            {transactions.map((tx) => (
              <Card
                key={tx.id}
                className="p-4 flex items-center justify-between hover:border-primary/20 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {tx.customers?.name || "Unknown Customer"}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {new Date(tx.created_at).toLocaleString()}
                      </span>
                      <span>•</span>
                      {tx.customers?.customer_type === 'vip' ? (
                        <span className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-yellow-200">
                          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                          VIP
                        </span>
                      ) : tx.customers?.customer_type === 'regular' ? (
                        <span className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-blue-200">
                           <Star className="h-3 w-3 fill-blue-500 text-blue-500" />
                           Regular
                        </span>
                      ) : (
                        <span className="capitalize bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px] font-medium border border-gray-200">
                           {tx.customers?.customer_type || "Guest"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Display metadata if available */}
                <div className="hidden md:flex flex-col text-xs text-muted-foreground max-w-[200px]">
                  {tx.metadata &&
                    Object.entries(tx.metadata as Record<string, any>)
                      .slice(0, 2)
                      .map(([k, v]) => (
                        <span key={k} className="truncate">
                          {k}: {v}
                        </span>
                      ))}
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold">
                    ₦{tx.amount.toLocaleString()}
                  </p>
                  <span
                    className={`text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                      tx.payment_status === "paid"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {tx.payment_status}
                  </span>
                </div>
                
                <Button variant="ghost" size="icon" className="h-8 w-8 ml-2" onClick={() => handleEdit(tx)}>
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 ml-2" onClick={() => handleDelete(tx.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </Card>
            ))}
          </div>
        )}
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the transaction record from the database.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
