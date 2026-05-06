import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtBRL, fmtMinutes, monthNames, OVERTIME_MULTIPLIER, WORK_HOURS_PER_DAY, WORKING_DAYS_PER_MONTH } from "@/lib/payroll";
import { toast } from "sonner";
import { Sparkles, CheckCircle2, Download, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { generatePayslipPdf } from "@/lib/payslipPdf";

export default function AdminPayslips() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [list, setList] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<any>(null);
  const [sigUrl, setSigUrl] = useState<string | null>(null);
  const [bonusFor, setBonusFor] = useState<Record<string, number>>({});

  const load = async () => {
    const { data: ps } = await supabase.from("payslips").select("*")
      .eq("reference_month", month).eq("reference_year", year);
    const { data: p } = await supabase.from("profiles").select("id, full_name, email, base_salary, active");
    const map: Record<string, any> = {};
    p?.forEach((x) => (map[x.id] = x));
    setProfiles(map); setList(ps ?? []);
  };
  useEffect(() => { load(); }, [month, year]);

  const generateAll = async () => {
    setBusy(true);
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDateD = new Date(year, month, 0);
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(endDateD.getDate()).padStart(2, "0")}`;

    const activeProfiles = Object.values(profiles).filter((p: any) => p.active);

    for (const p of activeProfiles) {
      const { data: entries } = await supabase.from("time_entries").select("*")
        .eq("user_id", p.id).gte("entry_date", startDate).lte("entry_date", endDate);

      const presentDays = entries?.filter((e: any) => e.clock_in && !e.is_absent).length ?? 0;
      const absentDays = Math.max(0, WORKING_DAYS_PER_MONTH - presentDays);
      const totalLate = entries?.reduce((s: number, e: any) => s + (e.late_minutes ?? 0), 0) ?? 0;
      const totalOver = entries?.reduce((s: number, e: any) => s + (e.overtime_minutes ?? 0), 0) ?? 0;

      const baseSalary = Number(p.base_salary ?? 0);
      const dailyRate = baseSalary / WORKING_DAYS_PER_MONTH;
      const hourRate = baseSalary / (WORKING_DAYS_PER_MONTH * WORK_HOURS_PER_DAY);
      const minuteRate = hourRate / 60;

      const absenceDeduction = absentDays * dailyRate;
      const lateDeduction = totalLate * minuteRate;
      const overtimePay = totalOver * minuteRate * OVERTIME_MULTIPLIER;
      const bonus = bonusFor[p.id] ?? 0;
      const totalNet = baseSalary - absenceDeduction - lateDeduction + overtimePay + bonus;

      await supabase.from("payslips").upsert({
        user_id: p.id, reference_month: month, reference_year: year,
        base_salary: baseSalary, absence_deduction: absenceDeduction, late_deduction: lateDeduction,
        overtime_pay: overtimePay, bonus, total_net: totalNet,
        absent_days: absentDays, total_late_minutes: totalLate, total_overtime_minutes: totalOver,
        status: "pending",
      }, { onConflict: "user_id,reference_month,reference_year" });
    }
    setBusy(false);
    toast.success(`Holerites gerados para ${month}/${year}`);
    load();
  };

  const openView = async (p: any) => {
    setView(p); setSigUrl(null);
    if (p.signed_document_path) {
      const { data } = await supabase.storage.from("payslip-documents").createSignedUrl(p.signed_document_path, 300);
      setSigUrl(data?.signedUrl ?? null);
    } else if (p.signature_path) {
      const { data } = await supabase.storage.from("payslip-signatures").createSignedUrl(p.signature_path, 120);
      setSigUrl(data?.signedUrl ?? null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Holerites</h1>

      <Card>
        <CardHeader><CardTitle>Geração</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <div><Label>Mês</Label>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{monthNames.map((n, i) => <SelectItem key={i} value={String(i + 1)}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Ano</Label><Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /></div>
            <div className="flex items-end">
              <Button onClick={generateAll} disabled={busy} className="w-full gradient-primary text-primary-foreground border-0">
                <Sparkles className="h-4 w-4 mr-2" /> Gerar holerites do mês
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Calculado a partir dos pontos do mês: faltas e atrasos descontam, horas extras pagam {((OVERTIME_MULTIPLIER - 1) * 100).toFixed(0)}% a mais. Padrão: {WORKING_DAYS_PER_MONTH} dias úteis, {WORK_HOURS_PER_DAY}h/dia.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{monthNames[month - 1]}/{year} ({list.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Funcionário</TableHead><TableHead>Faltas</TableHead><TableHead>Atrasos</TableHead>
                <TableHead>Extras</TableHead><TableHead>Bônus</TableHead><TableHead>Líquido</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {list.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{profiles[p.user_id]?.full_name ?? "—"}</TableCell>
                    <TableCell>{p.absent_days}d</TableCell>
                    <TableCell>{fmtMinutes(p.total_late_minutes)}</TableCell>
                    <TableCell>{fmtMinutes(p.total_overtime_minutes)}</TableCell>
                    <TableCell>
                      <Input type="number" step="0.01" defaultValue={p.bonus} className="w-24 h-8"
                        onBlur={async (e) => {
                          const v = Number(e.target.value);
                          const newNet = Number(p.base_salary) - Number(p.absence_deduction) - Number(p.late_deduction) + Number(p.overtime_pay) + v;
                          await supabase.from("payslips").update({ bonus: v, total_net: newNet }).eq("id", p.id);
                          toast.success("Bônus salvo"); load();
                        }} />
                    </TableCell>
                    <TableCell className="font-bold">{fmtBRL(Number(p.total_net))}</TableCell>
                    <TableCell>{p.status === "signed"
                      ? <Badge className="bg-success text-success-foreground"><CheckCircle2 className="h-3 w-3 mr-1" />Assinado</Badge>
                      : <Badge variant="outline" className="border-warning text-warning">Pendente</Badge>}</TableCell>
                    <TableCell><Button size="sm" variant="outline" onClick={() => openView(p)}>Ver</Button></TableCell>
                  </TableRow>
                ))}
                {list.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum holerite gerado para este período</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!view} onOpenChange={() => setView(null)}>
        <DialogContent>
          {view && (
            <>
              <DialogHeader><DialogTitle>Holerite — {profiles[view.user_id]?.full_name}</DialogTitle></DialogHeader>
              <div className="space-y-3 text-sm">
                <Row label="Salário base" value={fmtBRL(Number(view.base_salary))} />
                <Row label="Faltas" value={`- ${fmtBRL(Number(view.absence_deduction))}`} />
                <Row label="Atrasos" value={`- ${fmtBRL(Number(view.late_deduction))}`} />
                <Row label="Horas extras" value={`+ ${fmtBRL(Number(view.overtime_pay))}`} />
                <Row label="Bônus" value={`+ ${fmtBRL(Number(view.bonus))}`} />
                <div className="pt-2 border-t flex justify-between font-bold text-lg">
                  <span>Líquido</span><span className="text-primary">{fmtBRL(Number(view.total_net))}</span>
                </div>
                {sigUrl && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-muted-foreground mb-2">
                      {view.signed_document_path ? "Documento assinado" : "Assinatura do funcionário"} ({new Date(view.signed_at).toLocaleString("pt-BR")}):
                    </p>
                    {view.signed_document_path ? (
                      <a href={sigUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">
                        Abrir PDF assinado em nova aba
                      </a>
                    ) : (
                      <img src={sigUrl} alt="assinatura" className="border rounded bg-white" />
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>;
}
