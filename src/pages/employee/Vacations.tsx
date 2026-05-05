import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtBRL } from "@/lib/payroll";
import { calcVacation } from "@/lib/vacation";
import { Palmtree, Plus, Calculator, CheckCircle2, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";

const statusMeta: Record<string, { label: string; cls: string; icon: any }> = {
  requested:   { label: "Aguardando aprovação", cls: "bg-warning/15 text-warning border-warning/40", icon: Clock },
  scheduled:   { label: "Aprovada",             cls: "bg-success/15 text-success border-success/40", icon: CheckCircle2 },
  in_progress: { label: "Em gozo",              cls: "bg-primary/15 text-primary border-primary/40", icon: Palmtree },
  completed:   { label: "Concluída",            cls: "bg-muted text-muted-foreground",               icon: CheckCircle2 },
  cancelled:   { label: "Cancelada",            cls: "bg-muted text-muted-foreground",               icon: XCircle },
  rejected:    { label: "Recusada",             cls: "bg-destructive/15 text-destructive border-destructive/40", icon: XCircle },
};

export default function Vacations() {
  const { user } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    vacation_start: today,
    vacation_days: 30,
    sold_days: 0,
    notes: "",
  });

  const load = async () => {
    if (!user) return;
    const [{ data: v }, { data: p }] = await Promise.all([
      supabase.from("vacations").select("*").eq("user_id", user.id).order("vacation_start", { ascending: false }),
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    ]);
    setList(v ?? []);
    setProfile(p);
  };
  useEffect(() => { load(); }, [user]);

  const calc = calcVacation({
    baseSalary: Number(profile?.base_salary ?? 0),
    vacationDays: Number(form.vacation_days || 0),
    soldDays: Number(form.sold_days || 0),
  });

  const submit = async () => {
    if (!user) return;
    const totalDays = Number(form.vacation_days);
    if (totalDays < 1 || totalDays > 30) return toast.error("Dias de gozo entre 1 e 30");
    const start = new Date(form.vacation_start);
    const end = new Date(start);
    end.setDate(end.getDate() + totalDays - 1);
    const acqEnd = new Date(start); acqEnd.setDate(acqEnd.getDate() - 1);
    const acqStart = new Date(acqEnd); acqStart.setFullYear(acqStart.getFullYear() - 1);

    const payload = {
      user_id: user.id,
      acquisition_start: acqStart.toISOString().slice(0, 10),
      acquisition_end: acqEnd.toISOString().slice(0, 10),
      vacation_start: form.vacation_start,
      vacation_end: end.toISOString().slice(0, 10),
      vacation_days: totalDays,
      sold_days: Number(form.sold_days),
      base_salary: Number(profile?.base_salary ?? 0),
      vacation_pay: calc.vacationPay,
      one_third_bonus: calc.oneThirdBonus,
      sold_days_pay: calc.soldDaysPay,
      total_gross: calc.totalGross,
      inss_deduction: calc.inss,
      irrf_deduction: calc.irrf,
      total_net: calc.totalNet,
      status: "requested" as const,
      notes: form.notes || null,
    };
    const { error } = await supabase.from("vacations").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Solicitação enviada! Aguarde a aprovação do RH.");
    setOpen(false);
    setForm({ vacation_start: today, vacation_days: 30, sold_days: 0, notes: "" });
    load();
  };

  const pending = list.filter(v => v.status === "requested").length;
  const approved = list.filter(v => ["scheduled", "in_progress"].includes(v.status)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-elegant">
            <Palmtree className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Minhas Férias</h1>
            <p className="text-sm text-muted-foreground">Solicite e acompanhe seu período de descanso</p>
          </div>
        </div>
        <Button onClick={() => setOpen(true)} className="gradient-primary text-primary-foreground border-0">
          <Plus className="h-4 w-4 mr-2" /> Solicitar férias
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Solicitações" value={list.length} icon={Palmtree} tone="primary" />
        <StatCard label="Pendentes"    value={pending}     icon={Clock}     tone="warning" />
        <StatCard label="Aprovadas"    value={approved}    icon={CheckCircle2} tone="success" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Histórico</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Período de gozo</TableHead>
                <TableHead>Dias</TableHead>
                <TableHead>Líquido estimado</TableHead>
                <TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {list.map((v) => {
                  const meta = statusMeta[v.status] ?? statusMeta.scheduled;
                  const Icon = meta.icon;
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="text-sm">{fmtDate(v.vacation_start)} → {fmtDate(v.vacation_end)}</TableCell>
                      <TableCell>{v.vacation_days}{v.sold_days > 0 ? ` + ${v.sold_days} vend.` : ""}</TableCell>
                      <TableCell className="font-bold">{fmtBRL(Number(v.total_net))}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={meta.cls}>
                          <Icon className="h-3 w-3 mr-1" />{meta.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {list.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                    Você ainda não possui solicitações de férias.
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Solicitar férias</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Início do gozo</Label>
              <Input type="date" value={form.vacation_start}
                onChange={(e) => setForm({ ...form, vacation_start: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Dias de gozo</Label>
                <Input type="number" min={1} max={30} value={form.vacation_days}
                  onChange={(e) => setForm({ ...form, vacation_days: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Dias vendidos (abono)</Label>
                <Input type="number" min={0} max={10} value={form.sold_days}
                  onChange={(e) => setForm({ ...form, sold_days: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>Observações (opcional)</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Ex: viagem em família, motivo, etc." />
            </div>

            <Card className="bg-muted/40 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary" /> Estimativa CLT
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <Row label={`Férias (${form.vacation_days} dias)`} value={fmtBRL(calc.vacationPay)} />
                <Row label="1/3 constitucional" value={`+ ${fmtBRL(calc.oneThirdBonus)}`} />
                {Number(form.sold_days) > 0 && <Row label={`Abono (${form.sold_days} dias + 1/3)`} value={`+ ${fmtBRL(calc.soldDaysPay)}`} />}
                <Row label="INSS" value={`- ${fmtBRL(calc.inss)}`} />
                <Row label="IRRF" value={`- ${fmtBRL(calc.irrf)}`} />
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Líquido estimado</span><span className="text-primary">{fmtBRL(calc.totalNet)}</span>
                </div>
                <p className="text-xs text-muted-foreground pt-2">
                  Baseado no salário de {fmtBRL(Number(profile?.base_salary ?? 0))}. Valor final será confirmado pelo RH.
                </p>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} className="gradient-primary text-primary-foreground border-0">
              Enviar solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone: "primary" | "warning" | "success" }) {
  const toneCls = {
    primary: "from-primary/15 to-primary/5 text-primary",
    warning: "from-warning/15 to-warning/5 text-warning",
    success: "from-success/15 to-success/5 text-success",
  }[tone];
  return (
    <Card className="overflow-hidden">
      <CardContent className={`p-4 flex items-center gap-3 bg-gradient-to-br ${toneCls}`}>
        <div className="h-10 w-10 rounded-xl bg-background/80 flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>;
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}
