import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LogIn, LogOut, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { calcWorkedMinutes, calcLateAndOvertime, fmtMinutes } from "@/lib/payroll";
import { Badge } from "@/components/ui/badge";

export default function ClockIn() {
  const { user } = useAuth();
  const [today, setToday] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const load = async () => {
    if (!user) return;
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const { data: t } = await supabase.from("time_entries").select("*").eq("user_id", user.id).eq("entry_date", todayStr).maybeSingle();
    setToday(t);
    const { data: h } = await supabase.from("time_entries").select("*").eq("user_id", user.id).order("entry_date", { ascending: false }).limit(15);
    setHistory(h ?? []);
  };

  useEffect(() => { load(); }, [user]);

  const clockIn = async () => {
    if (!user) return;
    setBusy(true);
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const { error } = await supabase.from("time_entries").insert({
      user_id: user.id, entry_date: todayStr, clock_in: new Date().toISOString(),
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Entrada registrada!"); load(); }
  };

  const clockOut = async () => {
    if (!user || !today) return;
    setBusy(true);
    const out = new Date();
    const worked = calcWorkedMinutes(new Date(today.clock_in), out);
    const { late, overtime } = calcLateAndOvertime(worked);
    const { error } = await supabase.from("time_entries").update({
      clock_out: out.toISOString(),
      worked_minutes: worked, late_minutes: late, overtime_minutes: overtime,
    }).eq("id", today.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Saída registrada!"); load(); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Bater Ponto</h1>

      <Card className="overflow-hidden">
        <div className="gradient-hero text-white p-8 text-center">
          <Clock className="h-10 w-10 mx-auto mb-3 opacity-80" />
          <p className="text-sm uppercase tracking-wider opacity-80">{format(now, "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
          <p className="text-6xl md:text-7xl font-bold tabular-nums my-3" style={{ fontFamily: "Sora" }}>
            {format(now, "HH:mm:ss")}
          </p>
        </div>
        <CardContent className="p-6">
          <div className="grid sm:grid-cols-2 gap-3">
            <Button size="lg" disabled={busy || !!today?.clock_in} onClick={clockIn}
              className="gradient-primary text-primary-foreground border-0 h-14">
              <LogIn className="h-5 w-5 mr-2" /> Registrar Entrada
            </Button>
            <Button size="lg" disabled={busy || !today?.clock_in || !!today?.clock_out} onClick={clockOut}
              variant="outline" className="h-14 border-2">
              <LogOut className="h-5 w-5 mr-2" /> Registrar Saída
            </Button>
          </div>
          {today && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm pt-6 border-t">
              <div><p className="text-muted-foreground">Entrada</p><p className="font-semibold">{today.clock_in ? format(new Date(today.clock_in), "HH:mm") : "—"}</p></div>
              <div><p className="text-muted-foreground">Saída</p><p className="font-semibold">{today.clock_out ? format(new Date(today.clock_out), "HH:mm") : "—"}</p></div>
              <div><p className="text-muted-foreground">Trabalhadas</p><p className="font-semibold">{fmtMinutes(today.worked_minutes ?? 0)}</p></div>
              <div><p className="text-muted-foreground">Extras</p><p className="font-semibold text-success">{fmtMinutes(today.overtime_minutes ?? 0)}</p></div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Histórico recente</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead><TableHead>Entrada</TableHead><TableHead>Saída</TableHead>
                  <TableHead>Trabalhadas</TableHead><TableHead>Atraso</TableHead><TableHead>Extras</TableHead><TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{format(new Date(h.entry_date + "T12:00:00"), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{h.clock_in ? format(new Date(h.clock_in), "HH:mm") : "—"}</TableCell>
                    <TableCell>{h.clock_out ? format(new Date(h.clock_out), "HH:mm") : "—"}</TableCell>
                    <TableCell>{fmtMinutes(h.worked_minutes ?? 0)}</TableCell>
                    <TableCell className={h.late_minutes ? "text-destructive" : ""}>{fmtMinutes(h.late_minutes ?? 0)}</TableCell>
                    <TableCell className="text-success">{fmtMinutes(h.overtime_minutes ?? 0)}</TableCell>
                    <TableCell>
                      {h.is_absent ? <Badge variant="destructive">Falta</Badge>
                        : h.clock_out ? <Badge className="bg-success text-success-foreground">Completo</Badge>
                        : <Badge variant="outline">Em andamento</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
                {history.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Sem registros ainda</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
