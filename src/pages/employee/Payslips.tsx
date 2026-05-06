import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { fmtBRL, fmtMinutes, monthNames } from "@/lib/payroll";
import { FileText, CheckCircle2, Info } from "lucide-react";

export default function Payslips() {
  const { user } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState<any>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("payslips").select("*").eq("user_id", user.id)
      .order("reference_year", { ascending: false }).order("reference_month", { ascending: false });
    setList(data ?? []);
  };
  useEffect(() => { load(); }, [user]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Meus Holerites</h1>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 text-sm flex gap-3">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            O holerite em PDF é entregue pelo RH/Administração para assinatura.
            Após assinar e devolver, o documento assinado ficará disponível na sua pasta.
            Aqui você pode consultar os valores de cada mês.
          </div>
        </CardContent>
      </Card>

      {list.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          Nenhum holerite emitido ainda.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {list.map((p) => (
            <Card key={p.id} className="hover:shadow-md transition-smooth">
              <CardContent className="p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-lg">{monthNames[p.reference_month - 1]} / {p.reference_year}</p>
                  <p className="text-sm text-muted-foreground">Líquido: <span className="font-semibold text-foreground">{fmtBRL(Number(p.total_net))}</span></p>
                </div>
                <div className="flex items-center gap-3">
                  {p.status === "signed"
                    ? <Badge className="bg-success text-success-foreground"><CheckCircle2 className="h-3 w-3 mr-1" />Assinado</Badge>
                    : <Badge variant="outline" className="border-warning text-warning">Pendente</Badge>}
                  <Button size="sm" variant="outline" onClick={() => setOpen(p)}>Ver detalhes</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!open} onOpenChange={() => setOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>Holerite — {monthNames[open.reference_month - 1]}/{open.reference_year}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
                  <Row label="Salário base" value={fmtBRL(Number(open.base_salary))} />
                  <Row label={`Horas extras (${fmtMinutes(open.total_overtime_minutes)})`} value={`+ ${fmtBRL(Number(open.overtime_pay))}`} pos />
                  <Row label="Bonificação" value={`+ ${fmtBRL(Number(open.bonus))}`} pos />
                  <Row label={`Faltas (${open.absent_days} dia(s))`} value={`- ${fmtBRL(Number(open.absence_deduction))}`} neg />
                  <Row label={`Atrasos (${fmtMinutes(open.total_late_minutes)})`} value={`- ${fmtBRL(Number(open.late_deduction))}`} neg />
                  <div className="pt-2 mt-2 border-t flex justify-between font-bold text-lg">
                    <span>Total líquido</span><span className="text-primary">{fmtBRL(Number(open.total_net))}</span>
                  </div>
                </div>

                {open.status === "signed" ? (
                  <div className="rounded-lg border bg-success/10 p-4 text-sm">
                    <CheckCircle2 className="h-5 w-5 inline mr-2 text-success" />
                    Assinado em {new Date(open.signed_at).toLocaleString("pt-BR")}
                  </div>
                ) : (
                  <div className="rounded-lg border bg-warning/10 p-4 text-sm">
                    Aguardando entrega do PDF pelo RH para assinatura.
                  </div>
                )}
              </div>
              <DialogFooter />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value, pos, neg }: { label: string; value: string; pos?: boolean; neg?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={pos ? "text-success font-medium" : neg ? "text-destructive font-medium" : "font-medium"}>{value}</span>
    </div>
  );
}
