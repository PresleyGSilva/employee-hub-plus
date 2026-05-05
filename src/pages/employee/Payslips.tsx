import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { fmtBRL, fmtMinutes, monthNames } from "@/lib/payroll";
import { toast } from "sonner";
import SignatureCanvas from "react-signature-canvas";
import { FileText, PenTool, CheckCircle2 } from "lucide-react";

export default function Payslips() {
  const { user } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState<any>(null);
  const sigRef = useRef<SignatureCanvas>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("payslips").select("*").eq("user_id", user.id)
      .order("reference_year", { ascending: false }).order("reference_month", { ascending: false });
    setList(data ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const sign = async () => {
    if (!user || !open || !sigRef.current) return;
    if (sigRef.current.isEmpty()) { toast.error("Desenhe sua assinatura"); return; }
    setBusy(true);
    const dataUrl = sigRef.current.toDataURL("image/png");
    const blob = await (await fetch(dataUrl)).blob();
    const path = `${user.id}/${open.id}.png`;
    const { error: upErr } = await supabase.storage.from("payslip-signatures").upload(path, blob, { upsert: true, contentType: "image/png" });
    if (upErr) { setBusy(false); toast.error(upErr.message); return; }
    const { error } = await supabase.from("payslips").update({
      status: "signed", signature_path: path, signed_at: new Date().toISOString(),
    }).eq("id", open.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Holerite assinado e enviado ao administrador!");
      setOpen(null);
      load();
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Meus Holerites</h1>

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
                  <Button size="sm" variant="outline" onClick={() => setOpen(p)}>Visualizar</Button>
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

                {open.status === "pending" ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium flex items-center gap-2"><PenTool className="h-4 w-4" /> Assine abaixo para confirmar</p>
                    <div className="border-2 border-dashed rounded-lg bg-background">
                      <SignatureCanvas ref={sigRef} canvasProps={{ className: "w-full h-40 rounded-lg" }} />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => sigRef.current?.clear()}>Limpar</Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border bg-success/10 p-4 text-sm">
                    <CheckCircle2 className="h-5 w-5 inline mr-2 text-success" />
                    Assinado em {new Date(open.signed_at).toLocaleString("pt-BR")}
                  </div>
                )}
              </div>
              <DialogFooter>
                {open.status === "pending" && (
                  <Button onClick={sign} disabled={busy} className="gradient-primary text-primary-foreground border-0">
                    Assinar e enviar
                  </Button>
                )}
              </DialogFooter>
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
