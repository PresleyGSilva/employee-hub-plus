import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, Calculator, Check, X, Palmtree, Clock, CheckCircle2 } from "lucide-react";
import { fmtBRL } from "@/lib/payroll";
import { calcVacation } from "@/lib/vacation";
import { useAuth } from "@/contexts/AuthContext";

const statusLabels: Record<string, string> = {
  requested: "Aguardando",
  scheduled: "Aprovada",
  in_progress: "Em gozo",
  completed: "Concluída",
  cancelled: "Cancelada",
  rejected: "Recusada",
};
const statusCls: Record<string, string> = {
  requested:   "bg-warning/15 text-warning border-warning/40",
  scheduled:   "bg-success/15 text-success border-success/40",
  in_progress: "bg-primary/15 text-primary border-primary/40",
  completed:   "bg-muted text-muted-foreground",
  cancelled:   "bg-muted text-muted-foreground",
  rejected:    "bg-destructive/15 text-destructive border-destructive/40",
};

export default function AdminVacations() {
  const { user } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(initialForm());

  function initialForm() {
    const today = new Date();
    const acqStart = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    return {
      user_id: "",
      acquisition_start: acqStart.toISOString().slice(0, 10),
      acquisition_end: today.toISOString().slice(0, 10),
      vacation_start: today.toISOString().slice(0, 10),
      vacation_days: 30,
      sold_days: 0,
      base_salary: 0,
      notes: "",
      status: "scheduled",
    };
  }

  const load = async () => {
    const [{ data: v }, { data: p }] = await Promise.all([
      supabase.from("vacations").select("*").order("vacation_start", { ascending: false }),
      supabase.from("profiles").select("id, full_name, base_salary, active").eq("active", true).order("full_name"),
    ]);
    setList(v ?? []);
    setProfiles(p ?? []);
  };
  useEffect(() => { load(); }, []);

  const onUserChange = (id: string) => {
    const p = profiles.find((x) => x.id === id);
    setForm((f: any) => ({ ...f, user_id: id, base_salary: Number(p?.base_salary ?? 0) }));
  };

  const calc = calcVacation({
    baseSalary: Number(form.base_salary || 0),
    vacationDays: Number(form.vacation_days || 0),
    soldDays: Number(form.sold_days || 0),
  });

  const save = async () => {
    if (!form.user_id) return toast.error("Selecione o funcionário");
    const totalDays = Number(form.vacation_days);
    const start = new Date(form.vacation_start);
    const end = new Date(start);
    end.setDate(end.getDate() + totalDays - 1);

    const payload = {
      user_id: form.user_id,
      acquisition_start: form.acquisition_start,
      acquisition_end: form.acquisition_end,
      vacation_start: form.vacation_start,
      vacation_end: end.toISOString().slice(0, 10),
      vacation_days: Number(form.vacation_days),
      sold_days: Number(form.sold_days),
      base_salary: Number(form.base_salary),
      vacation_pay: calc.vacationPay,
      one_third_bonus: calc.oneThirdBonus,
      sold_days_pay: calc.soldDaysPay,
      total_gross: calc.totalGross,
      inss_deduction: calc.inss,
      irrf_deduction: calc.irrf,
      total_net: calc.totalNet,
      status: form.status,
      notes: form.notes || null,
      created_by: user?.id,
    };
    const { error } = await supabase.from("vacations").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Férias registradas");
    setOpen(false); setForm(initialForm()); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este registro de férias?")) return;
    await supabase.from("vacations").delete().eq("id", id);
    toast.success("Excluído"); load();
  };

  const approve = async (id: string) => {
    const { error } = await supabase.from("vacations").update({ status: "scheduled" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Férias aprovadas"); load();
  };
  const reject = async (id: string) => {
    if (!confirm("Recusar esta solicitação?")) return;
    const { error } = await supabase.from("vacations").update({ status: "rejected" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Solicitação recusada"); load();
  };

  const profileName = (id: string) => profiles.find((p) => p.id === id)?.full_name ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Férias</h1>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Nova férias</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Registros ({list.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Funcionário</TableHead>
                <TableHead>Período Aquisitivo</TableHead>
                <TableHead>Gozo</TableHead>
                <TableHead>Dias</TableHead>
                <TableHead>Líquido</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {list.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{profileName(v.user_id)}</TableCell>
                    <TableCell className="text-xs">{fmtDate(v.acquisition_start)} → {fmtDate(v.acquisition_end)}</TableCell>
                    <TableCell className="text-xs">{fmtDate(v.vacation_start)} → {fmtDate(v.vacation_end)}</TableCell>
                    <TableCell>{v.vacation_days}{v.sold_days > 0 ? ` + ${v.sold_days} vend.` : ""}</TableCell>
                    <TableCell className="font-bold">{fmtBRL(Number(v.total_net))}</TableCell>
                    <TableCell><Badge variant="outline">{statusLabels[v.status]}</Badge></TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => remove(v.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {list.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma férias registrada</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova solicitação de férias</DialogTitle></DialogHeader>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label>Funcionário</Label>
              <Select value={form.user_id} onValueChange={onUserChange}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Aquisitivo início</Label><Input type="date" value={form.acquisition_start} onChange={(e) => setForm({ ...form, acquisition_start: e.target.value })} /></div>
            <div><Label>Aquisitivo fim</Label><Input type="date" value={form.acquisition_end} onChange={(e) => setForm({ ...form, acquisition_end: e.target.value })} /></div>
            <div><Label>Início do gozo</Label><Input type="date" value={form.vacation_start} onChange={(e) => setForm({ ...form, vacation_start: e.target.value })} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Dias de gozo</Label><Input type="number" min={0} max={30} value={form.vacation_days} onChange={(e) => setForm({ ...form, vacation_days: e.target.value })} /></div>
            <div><Label>Dias vendidos (abono)</Label><Input type="number" min={0} max={10} value={form.sold_days} onChange={(e) => setForm({ ...form, sold_days: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Salário base</Label><Input type="number" step="0.01" value={form.base_salary} onChange={(e) => setForm({ ...form, base_salary: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>

          <Card className="bg-muted/40">
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Calculator className="h-4 w-4" /> Cálculo CLT</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <Row label={`Férias (${form.vacation_days} dias)`} value={fmtBRL(calc.vacationPay)} />
              <Row label="1/3 constitucional" value={`+ ${fmtBRL(calc.oneThirdBonus)}`} />
              {Number(form.sold_days) > 0 && <Row label={`Abono pecuniário (${form.sold_days} dias + 1/3)`} value={`+ ${fmtBRL(calc.soldDaysPay)}`} />}
              <div className="border-t pt-1"><Row label="Bruto" value={fmtBRL(calc.totalGross)} /></div>
              <Row label="INSS" value={`- ${fmtBRL(calc.inss)}`} />
              <Row label="IRRF" value={`- ${fmtBRL(calc.irrf)}`} />
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>Líquido</span><span className="text-primary">{fmtBRL(calc.totalNet)}</span>
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>;
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}
