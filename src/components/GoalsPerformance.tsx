import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";
import { monthNames } from "@/lib/payroll";

export function GoalsPerformance({ compact = false }: { compact?: boolean }) {
  const now = new Date();
  const [list, setList] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("goals")
      .select("*")
      .eq("reference_month", now.getMonth() + 1)
      .eq("reference_year", now.getFullYear())
      .order("title")
      .then(({ data }) => setList(data ?? []));
  }, []);

  if (list.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" /> Desempenho do mês</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground py-6 text-center">
          Nenhuma meta cadastrada para {monthNames[now.getMonth()]}/{now.getFullYear()}.
        </CardContent>
      </Card>
    );
  }

  const total = list.reduce((s, g) => s + Number(g.target_value || 0), 0);
  const done = list.reduce((s, g) => s + Number(g.current_value || 0), 0);
  const overall = total > 0 ? Math.min(100, (done / total) * 100) : 0;
  const completed = list.filter((g) => Number(g.current_value) >= Number(g.target_value) && Number(g.target_value) > 0).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" /> Desempenho — {monthNames[now.getMonth()]}/{now.getFullYear()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Geral</p>
            <p className="text-2xl font-bold text-primary">{overall.toFixed(0)}%</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Concluídas</p>
            <p className="text-2xl font-bold text-success">{completed}/{list.length}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Em andamento</p>
            <p className="text-2xl font-bold">{list.length - completed}</p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {list.slice(0, compact ? 3 : 10).map((g) => {
            const pct = g.target_value > 0 ? Math.min(100, (Number(g.current_value) / Number(g.target_value)) * 100) : 0;
            const completed = pct >= 100;
            const updated = g.updated_at ? new Date(g.updated_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : null;
            return (
              <div key={g.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium flex items-center gap-1">
                    {completed ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertCircle className="h-4 w-4 text-muted-foreground" />}
                    {g.title}
                  </span>
                  <span className={`font-bold ${completed ? "text-success" : "text-primary"}`}>{pct.toFixed(0)}%</span>
                </div>
                <Progress value={pct} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{Number(g.current_value).toLocaleString("pt-BR")} / {Number(g.target_value).toLocaleString("pt-BR")}</span>
                  {updated && <span>Atualizado {updated}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
