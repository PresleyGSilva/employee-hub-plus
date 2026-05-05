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

export default function EmployeeHome() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [todayEntry, setTodayEntry] = useState<any>(null);
  const [unread, setUnread] = useState(0);
  const [pendingPayslips, setPendingPayslips] = useState(0);
  const [activeGoals, setActiveGoals] = useState(0);

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

      <GoalsPerformance compact />
    </div>
  );
}
