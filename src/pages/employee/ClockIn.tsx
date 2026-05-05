import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LogIn, LogOut, Clock, Coffee, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  calcWorkedFromEntry, calcLateAndOvertime, calcDayBalance,
  fmtMinutes, fmtBalance,
} from "@/lib/payroll";
import { Badge } from "@/components/ui/badge";

type Entry = {
  id: string;
  entry_date: string;
  clock_in: string | null;
  clock_out: string | null;
  lunch_out: string | null;
  lunch_in: string | null;
  break_out: string | null;
  break_in: string | null;
  worked_minutes: number | null;
  late_minutes: number | null;
  overtime_minutes: number | null;
  balance_minutes: number | null;
  is_absent: boolean;
};

export default function ClockIn() {
  const { user } = useAuth();
  const [today, setToday] = useState<Entry | null>(null);
  const [history, setHistory] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(new Date());
  const [bank, setBank] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const load = async () => {
    if (!user) return;
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const { data: t } = await supabase
      .from("time_entries").select("*")
      .eq("user_id", user.id).eq("entry_date", todayStr).maybeSingle();
    setToday(t as Entry | null);
    const { data: h } = await supabase
      .from("time_entries").select("*")
      .eq("user_id", user.id).order("entry_date", { ascending: false }).limit(30);
    const list = (h ?? []) as Entry[];
    setHistory(list);
    setBank(list.reduce((acc, e) => acc + (e.balance_minutes ?? 0), 0));
  };

  useEffect(() => { load(); }, [user]);

  const stamp = async (field: "clock_in" | "lunch_out" | "lunch_in" | "break_out" | "break_in" | "clock_out") => {
    if (!user) return;
    setBusy(true);
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const nowIso = new Date().toISOString();

    let row = today;
    if (!row) {
      const { data, error } = await supabase.from("time_entries")
        .insert({ user_id: user.id, entry_date: todayStr, [field]: nowIso })
        .select().single();
      if (error) { setBusy(false); toast.error(error.message); return; }
      row = data as Entry;
    } else {
      const update: any = { [field]: nowIso };
      if (field === "clock_out") {
        const merged = { ...row, clock_out: nowIso };
        const worked = calcWorkedFromEntry(merged);
        const { late, overtime } = calcLateAndOvertime(worked);
        update.worked_minutes = worked;
        update.late_minutes = late;
        update.overtime_minutes = overtime;
        update.balance_minutes = calcDayBalance(worked);
      }
      const { error } = await supabase.from("time_entries").update(update).eq("id", row.id);
      if (error) { setBusy(false); toast.error(error.message); return; }
    }
    setBusy(false);
    toast.success("Registrado!");
    load();
  };

  const t = today;
  const can = {
    in: !t?.clock_in,
    lunchOut: !!t?.clock_in && !t?.lunch_out && !t?.clock_out,
    lunchIn: !!t?.lunch_out && !t?.lunch_in && !t?.clock_out,
    breakOut: !!t?.clock_in && !t?.break_out && !t?.clock_out,
    breakIn: !!t?.break_out && !t?.break_in && !t?.clock_out,
    out: !!t?.clock_in && !t?.clock_out,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold">Bater Ponto</h1>
        <Card className="px-4 py-2">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase text-muted-foreground">Banco de horas</span>
            <span className={`text-lg font-bold tabular-nums ${bank >= 0 ? "text-success" : "text-destructive"}`}>
              {fmtBalance(bank)}
            </span>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="gradient-hero text-white p-8 text-center">
          <Clock className="h-10 w-10 mx-auto mb-3 opacity-80" />
          <p className="text-sm uppercase tracking-wider opacity-80">{format(now, "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
          <p className="text-6xl md:text-7xl font-bold tabular-nums my-3" style={{ fontFamily: "Sora" }}>
            {format(now, "HH:mm:ss")}
          </p>
        </div>
        <CardContent className="p-6 space-y-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button size="lg" disabled={busy || !can.in} onClick={() => stamp("clock_in")}
              className="gradient-primary text-primary-foreground border-0 h-14">
              <LogIn className="h-5 w-5 mr-2" /> Entrada
            </Button>
            <Button size="lg" disabled={busy || !can.lunchOut} onClick={() => stamp("lunch_out")}
              variant="outline" className="h-14 border-2">
              <UtensilsCrossed className="h-5 w-5 mr-2" /> Saída almoço
            </Button>
            <Button size="lg" disabled={busy || !can.lunchIn} onClick={() => stamp("lunch_in")}
              variant="outline" className="h-14 border-2">
              <UtensilsCrossed className="h-5 w-5 mr-2" /> Volta almoço
            </Button>
            <Button size="lg" disabled={busy || !can.breakOut} onClick={() => stamp("break_out")}
              variant="outline" className="h-14 border-2">
              <Coffee className="h-5 w-5 mr-2" /> Saída café
            </Button>
            <Button size="lg" disabled={busy || !can.breakIn} onClick={() => stamp("break_in")}
              variant="outline" className="h-14 border-2">
              <Coffee className="h-5 w-5 mr-2" /> Volta café
            </Button>
            <Button size="lg" disabled={busy || !can.out} onClick={() => stamp("clock_out")}
              className="h-14 bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <LogOut className="h-5 w-5 mr-2" /> Saída
            </Button>
          </div>

          {t && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-sm pt-6 border-t">
              <Field label="Entrada" v={t.clock_in} />
              <Field label="Saída almoço" v={t.lunch_out} />
              <Field label="Volta almoço" v={t.lunch_in} />
              <Field label="Saída café" v={t.break_out} />
              <Field label="Volta café" v={t.break_in} />
              <Field label="Saída" v={t.clock_out} />
            </div>
          )}

          {t?.clock_out && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm pt-4 border-t">
              <div><p className="text-muted-foreground">Trabalhadas</p><p className="font-semibold">{fmtMinutes(t.worked_minutes ?? 0)}</p></div>
              <div><p className="text-muted-foreground">Atraso</p><p className="font-semibold text-destructive">{fmtMinutes(t.late_minutes ?? 0)}</p></div>
              <div><p className="text-muted-foreground">Extras</p><p className="font-semibold text-success">{fmtMinutes(t.overtime_minutes ?? 0)}</p></div>
              <div><p className="text-muted-foreground">Saldo do dia</p>
                <p className={`font-semibold ${(t.balance_minutes ?? 0) >= 0 ? "text-success" : "text-destructive"}`}>
                  {fmtBalance(t.balance_minutes ?? 0)}
                </p>
              </div>
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
                  <TableHead>Data</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Almoço</TableHead>
                  <TableHead>Café</TableHead>
                  <TableHead>Saída</TableHead>
                  <TableHead>Trab.</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{format(new Date(h.entry_date + "T12:00:00"), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{h.clock_in ? format(new Date(h.clock_in), "HH:mm") : "—"}</TableCell>
                    <TableCell className="text-xs">
                      {h.lunch_out ? format(new Date(h.lunch_out), "HH:mm") : "—"}
                      {" / "}
                      {h.lunch_in ? format(new Date(h.lunch_in), "HH:mm") : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {h.break_out ? format(new Date(h.break_out), "HH:mm") : "—"}
                      {" / "}
                      {h.break_in ? format(new Date(h.break_in), "HH:mm") : "—"}
                    </TableCell>
                    <TableCell>{h.clock_out ? format(new Date(h.clock_out), "HH:mm") : "—"}</TableCell>
                    <TableCell>{fmtMinutes(h.worked_minutes ?? 0)}</TableCell>
                    <TableCell className={(h.balance_minutes ?? 0) >= 0 ? "text-success" : "text-destructive"}>
                      {fmtBalance(h.balance_minutes ?? 0)}
                    </TableCell>
                    <TableCell>
                      {h.is_absent ? <Badge variant="destructive">Falta</Badge>
                        : h.clock_out ? <Badge className="bg-success text-success-foreground">Completo</Badge>
                        : <Badge variant="outline">Em andamento</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
                {history.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Sem registros ainda</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, v }: { label: string; v: string | null }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-semibold tabular-nums">{v ? format(new Date(v), "HH:mm") : "—"}</p>
    </div>
  );
}
