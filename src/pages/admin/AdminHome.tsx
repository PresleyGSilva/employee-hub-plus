import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, FileText, Target } from "lucide-react";
import { GoalsPerformance } from "@/components/GoalsPerformance";
import { BirthdaysCard } from "@/components/BirthdaysCard";

export default function AdminHome() {
  const [stats, setStats] = useState({ employees: 0, todayClocked: 0, pendingPayslips: 0, goals: 0 });

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [a, b, c, d] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("active", true),
        supabase.from("time_entries").select("*", { count: "exact", head: true }).eq("entry_date", today),
        supabase.from("payslips").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("goals").select("*", { count: "exact", head: true }),
      ]);
      setStats({
        employees: a.count ?? 0, todayClocked: b.count ?? 0,
        pendingPayslips: c.count ?? 0, goals: d.count ?? 0,
      });
    })();
  }, []);

  const cards = [
    { label: "Funcionários ativos", value: stats.employees, icon: Users, color: "from-primary to-primary-glow" },
    { label: "Pontos hoje", value: stats.todayClocked, icon: Clock, color: "from-success to-primary-glow" },
    { label: "Holerites pendentes", value: stats.pendingPayslips, icon: FileText, color: "from-accent to-warning" },
    { label: "Metas ativas", value: stats.goals, icon: Target, color: "from-primary to-accent" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Painel do Administrador</h1>
        <p className="text-muted-foreground">Visão geral da sua equipe</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-5">
              <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${c.color} flex items-center justify-center text-primary-foreground mb-3 shadow-md`}>
                <c.icon className="h-5 w-5" />
              </div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</p>
              <p className="text-3xl font-bold mt-1">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <BirthdaysCard />
      <GoalsPerformance />
      <Card>
        <CardHeader><CardTitle>Bem-vindo</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Use o menu lateral para gerenciar funcionários, ver registros de ponto, gerar holerites, criar metas e enviar comunicados.</p>
          <p>💡 Dica: atualize o progresso das metas diariamente em <strong>Metas</strong> para que toda a equipe acompanhe o desempenho do mês.</p>
        </CardContent>
      </Card>
    </div>
  );
}
