import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { PrivateRoute } from "./components/PrivateRoute";
import { AdminRoute } from "./components/AdminRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import DebtManagement from "./pages/DebtManagement";
import SystemRepair from "./pages/SystemRepair";
import ChargingStation from "./pages/ChargingStation";
import Accessories from "./pages/Accessories";
import PosAgent from "./pages/PosAgent";
import Snooker from "./pages/Snooker";
import Repairs from "./pages/Repairs";
import DeviceSales from "./pages/DeviceSales";
import Customers from "./pages/Customers";
import Employees from "./pages/Employees";
import Reports from "./pages/Reports";
import AuditLogs from "./pages/AuditLogs";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            <Route element={<PrivateRoute />}>
              <Route path="/" element={<Index />} />
              <Route path="/debt-management" element={<DebtManagement />} />
              <Route path="/charging" element={<ChargingStation />} />
              <Route path="/accessories" element={<Accessories />} />
              <Route path="/pos" element={<PosAgent />} />
              <Route path="/snooker" element={<Snooker />} />
              <Route path="/repairs" element={<Repairs />} />
              <Route path="/sales" element={<DeviceSales />} />
              
              {/* Admin Only Routes */}
              <Route element={<AdminRoute />}>
                <Route path="/customers" element={<Customers />} />
                <Route path="/employees" element={<Employees />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/audit" element={<AuditLogs />} />
                <Route path="/system-repair" element={<SystemRepair />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
