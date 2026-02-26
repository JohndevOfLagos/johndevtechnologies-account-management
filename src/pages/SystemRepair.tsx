import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { ShieldCheck, Database, AlertTriangle } from "lucide-react";

const SystemRepair = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const fixAdminRole = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Check if role exists
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (existingRole) {
        toast({ title: "Info", description: "You already have the Admin role in the database." });
      } else {
        // 2. Insert role
        const { error } = await supabase
          .from("user_roles")
          .insert([{ user_id: user.id, role: "admin" }]);

        if (error) throw error;
        toast({ title: "Success", description: "Admin role assigned successfully!" });
      }
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: "Failed to assign role. You might need to run the SQL script manually if RLS blocks this." 
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">System Repair</h1>
        <p className="text-muted-foreground">Fix permission issues and database visibility.</p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">1. Fix Admin Permissions</h3>
            <p className="text-sm text-muted-foreground">
              If you (the Admin) cannot see Employee records, click this button to force-assign the Admin role to yourself.
            </p>
          </div>
        </div>
        <Button onClick={fixAdminRole} disabled={loading} className="w-full sm:w-auto">
          {loading ? "Fixing..." : "Assign Admin Role to Me"}
        </Button>
          <div className="bg-slate-950 text-slate-50 p-4 rounded-md overflow-x-auto text-sm font-mono relative mt-2">
            <pre>{`-- IF THE BUTTON FAILS, RUN THIS SQL TOO:
INSERT INTO public.user_roles (user_id, role)
VALUES ('${user?.id}', 'admin');`}</pre>
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4 border-yellow-200 bg-yellow-50">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">2. Fix Shared Visibility (Critical)</h3>
            <p className="text-sm text-muted-foreground">
              To allow Employees to see Admin records (and vice versa), you <strong>MUST</strong> run this SQL in your Supabase Dashboard.
              <br />
              The app cannot do this automatically for security reasons.
            </p>
          </div>
        </div>
        
        <div className="bg-slate-950 text-slate-50 p-4 rounded-md overflow-x-auto text-sm font-mono relative">
          <pre>{`-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Allow everyone to see ALL transactions
DROP POLICY IF EXISTS "Employees can read own transactions" ON public.transactions;
CREATE POLICY "Authenticated can read all transactions" ON public.transactions
  FOR SELECT TO authenticated USING (true);

-- 2. Allow everyone to update ANY transaction
DROP POLICY IF EXISTS "Employees can update own within 24h" ON public.transactions;
CREATE POLICY "Authenticated can update any transaction" ON public.transactions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);`}</pre>
        </div>
        
        <div className="flex items-center gap-2 text-yellow-800 text-sm font-medium">
          <AlertTriangle className="h-4 w-4" />
          <span>Copy the code above and run it in Supabase Dashboard &gt; SQL Editor</span>
        </div>
      </Card>
    </div>
  );
};

export default SystemRepair;
