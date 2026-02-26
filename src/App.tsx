import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
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
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/charging" element={<ChargingStation />} />
          <Route path="/accessories" element={<Accessories />} />
          <Route path="/pos" element={<PosAgent />} />
          <Route path="/snooker" element={<Snooker />} />
          <Route path="/repairs" element={<Repairs />} />
          <Route path="/sales" element={<DeviceSales />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/audit" element={<AuditLogs />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
