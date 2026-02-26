import { DollarSign, TrendingUp, CreditCard, Users, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const revenueData = [
  { name: "Mon", revenue: 4200 },
  { name: "Tue", revenue: 3800 },
  { name: "Wed", revenue: 5100 },
  { name: "Thu", revenue: 4600 },
  { name: "Fri", revenue: 6200 },
  { name: "Sat", revenue: 7100 },
  { name: "Sun", revenue: 3400 },
];

const serviceData = [
  { name: "Charging", value: 3200, fill: "hsl(262, 83%, 58%)" },
  { name: "Accessories", value: 2100, fill: "hsl(280, 70%, 55%)" },
  { name: "POS Agent", value: 4500, fill: "hsl(200, 80%, 55%)" },
  { name: "Snooker", value: 1800, fill: "hsl(150, 60%, 50%)" },
  { name: "Repairs", value: 2800, fill: "hsl(40, 90%, 55%)" },
  { name: "Sales", value: 5200, fill: "hsl(340, 75%, 55%)" },
];

const monthlyData = [
  { month: "Jan", charging: 12000, accessories: 8000, pos: 15000, snooker: 6000, repairs: 9000, sales: 18000 },
  { month: "Feb", charging: 13500, accessories: 7500, pos: 16000, snooker: 5500, repairs: 10000, sales: 17000 },
  { month: "Mar", charging: 14000, accessories: 9000, pos: 14500, snooker: 7000, repairs: 11000, sales: 20000 },
  { month: "Apr", charging: 12500, accessories: 8500, pos: 17000, snooker: 6500, repairs: 9500, sales: 19000 },
];

const recentTransactions = [
  { id: "TXN-001", customer: "Adebayo M.", service: "POS Agent", amount: "₦45,000", status: "paid" },
  { id: "TXN-002", customer: "Chioma K.", service: "Charging", amount: "₦2,500", status: "unpaid" },
  { id: "TXN-003", customer: "Emeka O.", service: "Repair", amount: "₦15,000", status: "paid" },
  { id: "TXN-004", customer: "Fatima S.", service: "Accessories", amount: "₦8,200", status: "paid" },
  { id: "TXN-005", customer: "Ibrahim D.", service: "Snooker", amount: "₦3,000", status: "paid" },
];

const Index = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-display font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back to JohnDevTechnologies</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Today's Revenue"
            value="₦34,600"
            change="+12% from yesterday"
            changeType="positive"
            icon={DollarSign}
            gradient
          />
          <StatCard
            title="Monthly Revenue"
            value="₦892,400"
            change="+8% from last month"
            changeType="positive"
            icon={TrendingUp}
          />
          <StatCard
            title="POS Profit Today"
            value="₦12,350"
            change="32 transactions"
            icon={CreditCard}
          />
          <StatCard
            title="Outstanding Balance"
            value="₦156,800"
            change="24 VIP + 18 Regular"
            changeType="negative"
            icon={Users}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 p-5">
            <h3 className="text-sm font-display font-semibold mb-4">Weekly Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(260, 15%, 90%)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(260, 10%, 45%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(260, 10%, 45%)" />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid hsl(260, 15%, 90%)",
                    boxShadow: "0 4px 12px hsl(260 20% 10% / 0.08)",
                  }}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(262, 83%, 58%)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-display font-semibold mb-4">Revenue by Service</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={serviceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {serviceData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {serviceData.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="h-2 w-2 rounded-full" style={{ background: s.fill }} />
                  {s.name}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Monthly Breakdown + Recent */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 p-5">
            <h3 className="text-sm font-display font-semibold mb-4">Monthly Revenue by Service</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(260, 15%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(260, 10%, 45%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(260, 10%, 45%)" />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(260, 15%, 90%)" }} />
                <Bar dataKey="charging" fill="hsl(262, 83%, 58%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pos" fill="hsl(200, 80%, 55%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sales" fill="hsl(280, 70%, 55%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="repairs" fill="hsl(40, 90%, 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-display font-semibold">Recent Transactions</h3>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{tx.customer}</p>
                    <p className="text-xs text-muted-foreground">{tx.service}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{tx.amount}</p>
                    <span className={`text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                      tx.status === "paid"
                        ? "bg-chart-4/10 text-chart-4"
                        : "bg-destructive/10 text-destructive"
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
