import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtBRL } from "@/lib/payroll";
import { Palmtree } from "lucide-react";

const statusLabels: Record<string, string> = {
  scheduled: "Programada",
  in_progress: "Em gozo",
  completed: "Concluída",
  cancelled: "Cancelada",
};

export default function Vacations() {
  const [list, setList] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("vacations").select("*").order("vacation_start", { ascending: false })
      .then(({ data }) => setList(data ?? []));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Palmtree className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">Minhas Férias</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Histórico ({list.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Período Aquisitivo</TableHead>
                <TableHead>Gozo</TableHead>
                <TableHead>Dias</TableHead>
                <TableHead>Líquido</TableHead>
                <TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {list.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="text-xs">{fmtDate(v.acquisition_start)} → {fmtDate(v.acquisition_end)}</TableCell>
                    <TableCell className="text-xs">{fmtDate(v.vacation_start)} → {fmtDate(v.vacation_end)}</TableCell>
                    <TableCell>{v.vacation_days}{v.sold_days > 0 ? ` + ${v.sold_days} vend.` : ""}</TableCell>
                    <TableCell className="font-bold">{fmtBRL(Number(v.total_net))}</TableCell>
                    <TableCell><Badge variant="outline">{statusLabels[v.status]}</Badge></TableCell>
                  </TableRow>
                ))}
                {list.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Você ainda não possui férias programadas</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}
