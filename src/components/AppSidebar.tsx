import {
  LayoutDashboard,
  BatteryCharging,
  ShoppingBag,
  CreditCard,
  Gamepad2,
  Wrench,
  Smartphone,
  Users,
  UserCog,
  BarChart3,
  ScrollText,
  LogOut,
  Settings,
  Calculator,
  Trash2,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

const mainNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Debt Management", url: "/debt-management", icon: CreditCard },
  { title: "Debt Calculator", url: "/debt-calculator", icon: Calculator },
];

const serviceNav = [
  { title: "Charging Station", url: "/charging", icon: BatteryCharging },
  { title: "Accessories", url: "/accessories", icon: ShoppingBag },
  { title: "POS Agent", url: "/pos", icon: CreditCard },
  { title: "Snooker Spot", url: "/snooker", icon: Gamepad2 },
  { title: "Repairs", url: "/repairs", icon: Wrench },
  { title: "Device Sales", url: "/sales", icon: Smartphone },
];

const managementNav = [
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Employees", url: "/employees", icon: UserCog },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Audit Logs", url: "/audit", icon: ScrollText },
  { title: "Deletion Requests", url: "/deletion-requests", icon: Trash2 },
  { title: "Debt Requests", url: "/debt-requests", icon: CreditCard },
];

const systemNav = [
  { title: "Settings", url: "/settings", icon: Settings },
];

function NavGroup({ label, items }: { label: string; items: typeof mainNav }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider font-medium">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  end={item.url === "/"}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200"
                  activeClassName="bg-sidebar-accent text-sidebar-primary font-medium shadow-sm"
                >
                  <item.icon className="h-4.5 w-4.5 shrink-0" />
                  <span className="text-sm">{item.title}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

import Logo_Icon from "../asset/logo-icon.png"


export function AppSidebar() {
  const { signOut, role } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <Sidebar className="border-r-0 h-screen overflow-hidden">
      <SidebarHeader className="p-5 pb-2">
        <div className="flex items-center gap-3">
          <div className=" flex items-center justify-center ">
              <img src={Logo_Icon} alt=""/>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 overflow-y-auto sidebar-scroll">
        <NavGroup label="Overview" items={mainNav} />
        {role !== 'admin' && (
          <NavGroup label="Services" items={serviceNav} />
        )}
        {/* Only show Management section to admins */}
        {role === 'admin' && (
          <NavGroup label="Management" items={managementNav} />
        )}
        <NavGroup label="System" items={systemNav} />
      </SidebarContent>

      <SidebarFooter className="p-3">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all w-full text-sm"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
