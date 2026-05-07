import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { fmtMinutes } from "@/lib/payroll";
import { format } from "date-fns";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

export default function AdminTimeEntries() {
  const { user, isAdmin, role } = useAuth();
  const isSupervisor = role === "supervisor" && !isAdmin;
  const [rows, setRows] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    const { data: t } = await supabase.from("time_entries").select("*").eq("entry_date", date).order("clock_in", { ascending: true });
    const { data: p } = await supabase.from("profiles").select("id, full_name, email");
    const map: Record<string, any> = {};
    p?.forEach((x) => (map[x.id] = x));
    setProfiles(map); setRows(t ?? []);
  };
  useEffect(() => { load(); }, [date]);

  const approve = async (r: any) => {
    if (!user) return;
    setBusyId(r.id);
    const { error } = await supabase.from("time_entries").update({
      supervisor_approved: true,
      supervisor_approved_by: user.id,
      supervisor_approved_at: new Date().toISOString(),
    }).eq("id", r.id);
    setBusyId(null);
    if (error) { toast.error("Erro ao aprovar: " + error.message); return; }
    toast.success("Ponto aprovado. Administradores notificados.");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold">{isSupervisor ? "Pontos da Equipe" : "Registros de Ponto"}</h1>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
      </div>
      <Card>
        <CardHeader><CardTitle>{format(new Date(date + "T12:00"), "dd/MM/yyyy")}</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Funcionário</TableHead><TableHead>Entrada</TableHead><TableHead>Saída</TableHead>
                <TableHead>Trabalhadas</TableHead><TableHead>Atraso</TableHead><TableHead>Extras</TableHead>
                <TableHead>Status</TableHead><TableHead>Aprovação</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{profiles[r.user_id]?.full_name ?? profiles[r.user_id]?.email ?? "—"}</TableCell>
                    <TableCell>{r.clock_in ? format(new Date(r.clock_in), "HH:mm") : "—"}</TableCell>
                    <TableCell>{r.clock_out ? format(new Date(r.clock_out), "HH:mm") : "—"}</TableCell>
                    <TableCell>{fmtMinutes(r.worked_minutes ?? 0)}</TableCell>
                    <TableCell className={r.late_minutes ? "text-destructive" : ""}>{fmtMinutes(r.late_minutes ?? 0)}</TableCell>
                    <TableCell className="text-success">{fmtMinutes(r.overtime_minutes ?? 0)}</TableCell>
                    <TableCell>
                      {r.is_absent ? <Badge variant="destructive">Falta</Badge>
                        : r.clock_out ? <Badge className="bg-success text-success-foreground">Completo</Badge>
                        : <Badge variant="outline">Em andamento</Badge>}
                    </TableCell>
                    <TableCell>
                      {r.supervisor_approved ? (
                        <Badge className="bg-success text-success-foreground gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Aprovado
                        </Badge>
                      ) : (isSupervisor || isAdmin) && r.clock_out ? (
                        <Button size="sm" variant="outline" disabled={busyId === r.id} onClick={() => approve(r)}>
                          Aprovar
                        </Button>
                      ) : (
                        <Badge variant="outline">Pendente</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum registro nesta data</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
