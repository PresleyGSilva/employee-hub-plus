import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, FileText, Bell, Target, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { fmtMinutes } from "@/lib/payroll";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { GoalsPerformance } from "@/components/GoalsPerformance";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { TrendingUp } from "lucide-react";

export default function EmployeeHome() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [todayEntry, setTodayEntry] = useState<any>(null);
  const [unread, setUnread] = useState(0);
  const [pendingPayslips, setPendingPayslips] = useState(0);
  const [activeGoals, setActiveGoals] = useState(0);
  const [earnings, setEarnings] = useState<{ label: string; valor: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const [{ data: p }, { data: t }, { count: n }, { count: pay }, { count: g }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("time_entries").select("*").eq("user_id", user.id).eq("entry_date", today).maybeSingle(),
        supabase.from("notifications").select("*", { count: "exact", head: true }).or(`user_id.eq.${user.id},is_broadcast.eq.true`).eq("is_read", false),
        supabase.from("payslips").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "pending"),
        supabase.from("goals").select("*", { count: "exact", head: true }),
      ]);
      setProfile(p); setTodayEntry(t);
      setUnread(n ?? 0); setPendingPayslips(pay ?? 0); setActiveGoals(g ?? 0);

      const { data: ps } = await supabase
        .from("payslips")
        .select("reference_year,reference_month,total_net")
        .eq("user_id", user.id)
        .order("reference_year", { ascending: true })
        .order("reference_month", { ascending: true });
      const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
      setEarnings((ps ?? []).slice(-12).map(r => ({
        label: `${months[(r.reference_month ?? 1) - 1]}/${String(r.reference_year).slice(-2)}`,
        valor: Number(r.total_net ?? 0),
      })));
    })();
  }, [user]);

  const stats = [
    { label: "Hoje", value: todayEntry?.clock_in ? "Ponto registrado" : "Sem registro", icon: Clock, link: "/app/ponto", color: "from-primary to-primary-glow" },
    { label: "Holerites pendentes", value: pendingPayslips.toString(), icon: FileText, link: "/app/holerites", color: "from-accent to-warning" },
    { label: "Notificações", value: unread.toString(), icon: Bell, link: "/app/notificacoes", color: "from-success to-primary-glow" },
    { label: "Metas ativas", value: activeGoals.toString(), icon: Target, link: "/app/metas", color: "from-primary to-accent" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Olá, {profile?.full_name?.split(" ")[0] || "colaborador"} 👋</h1>
        <p className="text-muted-foreground capitalize">{format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.link}>
            <Card className="hover:shadow-elegant transition-smooth hover:-translate-y-0.5 cursor-pointer h-full">
              <CardContent className="p-5">
                <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center text-primary-foreground mb-3`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
                <p className="text-xl font-bold mt-1">{s.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Resumo de hoje</CardTitle></CardHeader>
        <CardContent>
          {todayEntry ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><p className="text-muted-foreground">Entrada</p><p className="font-semibold">{todayEntry.clock_in ? format(new Date(todayEntry.clock_in), "HH:mm") : "—"}</p></div>
              <div><p className="text-muted-foreground">Saída</p><p className="font-semibold">{todayEntry.clock_out ? format(new Date(todayEntry.clock_out), "HH:mm") : "—"}</p></div>
              <div><p className="text-muted-foreground">Trabalhadas</p><p className="font-semibold">{fmtMinutes(todayEntry.worked_minutes ?? 0)}</p></div>
              <div><p className="text-muted-foreground">Extras</p><p className="font-semibold text-success">{fmtMinutes(todayEntry.overtime_minutes ?? 0)}</p></div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-3">Você ainda não bateu o ponto hoje.</p>
              <Link to="/app/ponto"><Button className="gradient-primary text-primary-foreground border-0">Bater ponto agora <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-0 shadow-elegant relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
        <CardHeader className="relative flex flex-row items-start justify-between gap-4 pb-2">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Meus ganhos</p>
            <CardTitle className="text-2xl font-bold mt-1">
              {(earnings.reduce((s, e) => s + e.valor, 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Últimos {earnings.length} {earnings.length === 1 ? "mês" : "meses"}</p>
          </div>
          {earnings.length >= 2 && (() => {
            const last = earnings[earnings.length - 1].valor;
            const prev = earnings[earnings.length - 2].valor || 1;
            const diff = ((last - prev) / prev) * 100;
            const up = diff >= 0;
            return (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${up ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                <TrendingUp className={`h-3.5 w-3.5 ${up ? "" : "rotate-180"}`} />
                {up ? "+" : ""}{diff.toFixed(1)}%
              </div>
            );
          })()}
        </CardHeader>
        <CardContent className="relative">
          {earnings.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Nenhum holerite registrado ainda.</p>
          ) : (
            <div className="h-72 w-full -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={earnings} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
                  <XAxis
                    dataKey="label"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={70}
                    tickFormatter={(v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0, notation: "compact" })}
                  />
                  <Tooltip
                    cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1, strokeDasharray: "4 4" }}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      boxShadow: "var(--shadow-lg)",
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "hsl(var(--muted-foreground))", fontWeight: 500, marginBottom: 4 }}
                    formatter={(v: number) => [v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), "Ganho"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="valor"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    fill="url(#earnGrad)"
                    dot={{ fill: "hsl(var(--background))", stroke: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <GoalsPerformance compact />
    </div>
  );
}
