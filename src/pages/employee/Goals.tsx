import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target } from "lucide-react";
import { monthNames } from "@/lib/payroll";

export default function Goals() {
  const [list, setList] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("goals").select("*").order("reference_year", { ascending: false }).order("reference_month", { ascending: false })
      .then(({ data }) => setList(data ?? []));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Metas da Equipe</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {list.map((g) => {
          const pct = g.target_value > 0 ? Math.min(100, (Number(g.current_value) / Number(g.target_value)) * 100) : 0;
          return (
            <Card key={g.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{g.title}</CardTitle>
                  <span className="text-xs text-muted-foreground">{monthNames[g.reference_month - 1]}/{g.reference_year}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {g.description && <p className="text-sm text-muted-foreground">{g.description}</p>}
                <Progress value={pct} className="h-3" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{Number(g.current_value).toLocaleString("pt-BR")} / {Number(g.target_value).toLocaleString("pt-BR")}</span>
                  <span className="font-bold text-primary">{pct.toFixed(0)}%</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {list.length === 0 && (
          <Card className="md:col-span-2"><CardContent className="py-12 text-center text-muted-foreground">
            <Target className="h-10 w-10 mx-auto mb-2 opacity-30" /> Nenhuma meta definida
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}
