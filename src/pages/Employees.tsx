import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { UserCog, Pencil, Trash2, Shield, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { useAuth } from "@/contexts/AuthContext";

const Employees = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isClearOpen, setIsClearOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [serviceToClear, setServiceToClear] = useState<string>("all");

  // Fetch Employees (Profiles + Roles)
  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      // 1. Fetch all roles
      const { data: roles } = await supabase.from("user_roles").select("*");
      
      // 2. Fetch all profiles
      const { data: profiles } = await supabase.from("profiles").select("*");

      // 3. Merge and Filter (Exclude Admins)
      return profiles?.map(profile => {
        const roleRecord = roles?.find(r => r.user_id === profile.id);
        return {
          ...profile,
          role: roleRecord?.role || 'none'
        };
      }).filter(emp => {
        // Exclude users with 'admin' role
        if (emp.role === 'admin') return false;
        
        // Exclude current user
        if (emp.id === user?.id) return false;

        // Exclude known admin names (fallback if DB role is missing)
        const adminNames = ["John Ayomide Adewunmi", "John Dev Technologies", "Admin"];
        if (adminNames.some(name => emp.full_name?.includes(name))) return false;

        return true;
      }) || [];
    },
  });

  // Update Profile Mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: any) => {
      // 1. Update Profile Data
      const { data, error } = await supabase
        .from("profiles")
        .update({
          full_name: profileData.full_name,
          age: profileData.age ? parseInt(profileData.age) : null,
          gender: profileData.gender,
          educational_level: profileData.educational_level,
          department: profileData.department,
          phone: profileData.phone,
          address: profileData.address,
        })
        .eq("id", profileData.id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Update failed. No changes were saved. Check if you have the Admin role in the database.");
      }

      // 2. Update Role (if changed)
      // Check current role first to avoid unnecessary writes
      const { data: currentRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", profileData.id)
        .single();

      const newRole = profileData.role === 'none' ? 'employee' : profileData.role;

      if (currentRole?.role !== newRole) {
        // Upsert role (insert if missing, update if exists)
        const { error: roleError } = await supabase
          .from("user_roles")
          .upsert({ user_id: profileData.id, role: newRole });
        
        if (roleError) throw roleError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setIsEditOpen(false);
      toast({ title: "Success", description: "Profile updated successfully" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  // Clear Records Mutation
  const clearRecordsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEmployeeId) return;

      let query = supabase.from("transactions").delete().eq("employee_id", selectedEmployeeId);
      
      // If specific service selected (we need service_id from name first)
      if (serviceToClear !== "all") {
        const { data: service } = await supabase.from("services").select("id").eq("name", serviceToClear).single();
        if (service) {
          query = query.eq("service_id", service.id);
        }
      }

      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      setIsClearOpen(false);
      toast({ title: "Success", description: "Records cleared successfully" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const handleEdit = (employee: any) => {
    setEditingProfile(employee);
    setIsEditOpen(true);
  };

  const handleClear = (id: string) => {
    setSelectedEmployeeId(id);
    setServiceToClear("all");
    setIsClearOpen(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(editingProfile);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-display font-bold">Employees</h1>
          <p className="text-sm text-muted-foreground">Manage staff profiles and records</p>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Loading employees...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {employees?.map((employee) => (
              <Card key={employee.id} className="p-6 space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg font-bold flex-shrink-0">
                      {employee.full_name?.[0]?.toUpperCase() || <User />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold truncate pr-2" title={employee.full_name}>{employee.full_name}</h3>
                      <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                        {employee.role}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(employee)}>
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleClear(employee.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                  <span className="text-muted-foreground">Department:</span>
                  <span className="font-medium">{employee.department || "-"}</span>
                  
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="font-medium">{employee.phone || "-"}</span>
                  
                  <span className="text-muted-foreground">Age/Gender:</span>
                  <span className="font-medium">
                    {employee.age ? `${employee.age} / ` : ""}
                    {employee.gender || "-"}
                  </span>
                  
                  <span className="text-muted-foreground">Education:</span>
                  <span className="font-medium">{employee.educational_level || "-"}</span>
                </div>
                
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  {employee.address || "No address provided"}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Profile Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Employee Profile</DialogTitle>
            </DialogHeader>
            {editingProfile && (
              <form onSubmit={handleSaveProfile} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input 
                      value={editingProfile.full_name || ""} 
                      onChange={e => setEditingProfile({...editingProfile, full_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select 
                      value={editingProfile.role || "employee"} 
                      onValueChange={val => setEditingProfile({...editingProfile, role: val})}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Input 
                      value={editingProfile.department || ""} 
                      onChange={e => setEditingProfile({...editingProfile, department: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Age</Label>
                    <Input 
                      type="number"
                      value={editingProfile.age || ""} 
                      onChange={e => setEditingProfile({...editingProfile, age: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select 
                      value={editingProfile.gender || ""} 
                      onValueChange={val => setEditingProfile({...editingProfile, gender: val})}
                    >
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input 
                      value={editingProfile.phone || ""} 
                      onChange={e => setEditingProfile({...editingProfile, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Education</Label>
                    <Input 
                      value={editingProfile.educational_level || ""} 
                      onChange={e => setEditingProfile({...editingProfile, educational_level: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input 
                    value={editingProfile.address || ""} 
                    onChange={e => setEditingProfile({...editingProfile, address: e.target.value})}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Clear Records Dialog */}
        <Dialog open={isClearOpen} onOpenChange={setIsClearOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Clear Service Records</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                This will permanently delete transaction records for this employee.
                Select which service records to clear.
              </p>
              <div className="space-y-2">
                <Label>Service</Label>
                <Select value={serviceToClear} onValueChange={setServiceToClear}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Business Services</SelectItem>
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
                onClick={() => clearRecordsMutation.mutate()}
                disabled={clearRecordsMutation.isPending}
              >
                {clearRecordsMutation.isPending ? "Clearing..." : "Clear Records"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Employees;
