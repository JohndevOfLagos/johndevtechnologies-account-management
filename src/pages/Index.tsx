import { useEffect, useState } from "react";
import { Banknote, TrendingUp, CreditCard, Users, ArrowUpRight } from "lucide-react";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, addDays, isSameDay, startOfMonth, subMonths, endOfMonth } from "date-fns";

const Index = () => {
  const queryClient = useQueryClient();

  // Fetch all transactions (for demo purposes, might need pagination/filtering in production)
  const { data: transactions } = useQuery({
    queryKey: ["all-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          services (name),
          customers (name)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["all-transactions"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Derived Statistics
  const today = new Date();
  const todaysTransactions = transactions?.filter((t) =>
    isSameDay(new Date(t.created_at), today)
  );
  
  const todaysRevenue = todaysTransactions
    ?.filter((t) => t.payment_status === "paid")
    .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  
  const currentMonthTransactions = transactions?.filter((t) => 
    new Date(t.created_at) >= startOfMonth(today)
  );
  const monthlyRevenue = currentMonthTransactions
    ?.filter((t) => t.payment_status === "paid")
    .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  
  const posProfitToday = todaysTransactions
    ?.filter((t) => t.services?.name === "POS Agent")
    .reduce((sum, t) => sum + (Number(t.profit) || 0), 0) || 0;
    
  const posTxCount = todaysTransactions?.filter((t) => t.services?.name === "POS Agent").length || 0;

  const outstandingBalance = transactions
    ?.filter((t) => t.payment_status === "unpaid")
    .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    
  const unpaidCount = transactions?.filter((t) => t.payment_status === "unpaid").length || 0;

  // Chart Data: Weekly Revenue
  const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const revenueData = Array.from({ length: 7 }).map((_, i) => {
    const date = addDays(startOfCurrentWeek, i);
    const dayRevenue = transactions
      ?.filter((t) => isSameDay(new Date(t.created_at), date) && t.payment_status === "paid")
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    return {
      name: format(date, "EEE"),
      revenue: dayRevenue,
    };
  });

  // Chart Data: Service Breakdown
  const serviceStats = transactions?.reduce((acc, t) => {
    if (t.payment_status !== "paid") return acc; // Only count paid
    const serviceName = t.services?.name || "Unknown";
    acc[serviceName] = (acc[serviceName] || 0) + Number(t.amount);
    return acc;
  }, {} as Record<string, number>);

  const serviceColors: Record<string, string> = {
    "Charging Station": "hsl(262, 83%, 58%)",
    "Accessories": "hsl(280, 70%, 55%)",
    "POS Agent": "hsl(200, 80%, 55%)",
    "Snooker Spot": "hsl(150, 60%, 50%)",
    "Repairs": "hsl(40, 90%, 55%)",
    "Device Sales": "hsl(340, 75%, 55%)",
  };

  const serviceData = Object.entries(serviceStats || {}).map(([name, value]) => ({
    name,
    value,
    fill: serviceColors[name] || "hsl(0, 0%, 50%)",
  }));

  // Real-time Monthly Revenue by Service (Last 6 Months)
  const monthlyData = Array.from({ length: 6 }).map((_, i) => {
    const date = subMonths(new Date(), 5 - i); // Start from 5 months ago
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const monthName = format(date, "MMM");

    const monthTx = transactions?.filter(t => {
      const tDate = new Date(t.created_at);
      return tDate >= monthStart && tDate <= monthEnd && t.payment_status === "paid";
    }) || [];

    const charging = monthTx.filter(t => t.services?.name === "Charging Station").reduce((sum, t) => sum + Number(t.amount), 0);
    const accessories = monthTx.filter(t => t.services?.name === "Accessories").reduce((sum, t) => sum + Number(t.amount), 0);
    const pos = monthTx.filter(t => t.services?.name === "POS Agent").reduce((sum, t) => sum + Number(t.amount), 0);
    const snooker = monthTx.filter(t => t.services?.name === "Snooker Spot").reduce((sum, t) => sum + Number(t.amount), 0);
    const repairs = monthTx.filter(t => t.services?.name === "Repairs").reduce((sum, t) => sum + Number(t.amount), 0);
    const sales = monthTx.filter(t => t.services?.name === "Device Sales").reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      month: monthName,
      charging,
      accessories,
      pos,
      snooker,
      repairs,
      sales
    };
  });

  const recentTransactions = transactions?.slice(0, 5).map(t => ({
    id: t.id,
    customer: t.customers?.name || "Unknown",
    service: t.services?.name || "Unknown",
    amount: `₦${Number(t.amount).toLocaleString()}`,
    status: t.payment_status
  })) || [];

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
            value={`₦${todaysRevenue.toLocaleString()}`}
            change="Realtime updates"
            changeType="positive"
            icon={Banknote}
            gradient
          />
          <StatCard
            title="Monthly Revenue"
            value={`₦${monthlyRevenue.toLocaleString()}`}
            change="Current month"
            changeType="positive"
            icon={TrendingUp}
          />
          <StatCard
            title="POS Profit Today"
            value={`₦${posProfitToday.toLocaleString()}`}
            change={`${posTxCount} transactions`}
            icon={CreditCard}
          />
          <StatCard
            title="Outstanding Balance"
            value={`₦${outstandingBalance.toLocaleString()}`}
            change={`${unpaidCount} unpaid records`}
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
