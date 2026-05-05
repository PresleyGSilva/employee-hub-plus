import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { fmtBRL, fmtMinutes, monthNames } from "@/lib/payroll";
import { toast } from "sonner";
import { FileText, CheckCircle2, Download, Upload, ShieldCheck } from "lucide-react";
import { generatePayslipPdf } from "@/lib/payslipPdf";
import { checkGovBrSignature } from "@/lib/govSignature";

export default function Payslips() {
  const { user } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [open, setOpen] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const [{ data }, { data: p }] = await Promise.all([
      supabase.from("payslips").select("*").eq("user_id", user.id)
        .order("reference_year", { ascending: false }).order("reference_month", { ascending: false }),
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    ]);
    setList(data ?? []);
    setProfile(p);
  };
  useEffect(() => { load(); }, [user]);

  const downloadPdf = async (p: any) => {
    if (!profile) return;
    const doc = await generatePayslipPdf({ payslip: p, employee: profile });
    doc.save(`holerite-${monthNames[p.reference_month - 1]}-${p.reference_year}.pdf`);
    toast.success("PDF gerado! Assine e faça o upload de volta.");
  };

  const uploadSigned = async (e: React.ChangeEvent<HTMLInputElement>, p: any) => {
    if (!user || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (file.size > 10 * 1024 * 1024) { toast.error("Máximo 10MB"); return; }

    setBusy(true);
    const check = await checkGovBrSignature(file);
    if (!check.isPdf) {
      setBusy(false); e.target.value = "";
      toast.error("Envie o arquivo PDF assinado pelo gov.br");
      return;
    }
    if (!check.hasDigitalSignature) {
      setBusy(false); e.target.value = "";
      toast.error("Este PDF não contém assinatura digital. Assine em assinador.iti.br (gov.br) e envie novamente.");
      return;
    }
    if (!check.isGovBr) {
      setBusy(false); e.target.value = "";
      toast.error("Assinatura digital encontrada, mas não foi reconhecida como gov.br / ICP-Brasil. Use o assinador gov.br.");
      return;
    }

    const path = `${user.id}/${p.id}-assinado.pdf`;
    const { error: upErr } = await supabase.storage.from("payslip-documents").upload(path, file, { upsert: true, contentType: "application/pdf" });
    if (upErr) { setBusy(false); toast.error(upErr.message); return; }
    const { error } = await supabase.from("payslips").update({
      status: "signed", signed_document_path: path, signed_at: new Date().toISOString(),
    }).eq("id", p.id);
    setBusy(false);
    e.target.value = "";
    if (error) toast.error(error.message);
    else { toast.success("Holerite assinado pelo gov.br enviado!"); setOpen(null); load(); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Meus Holerites</h1>

      {profile && (!profile.cpf || !profile.pix_key) && (
        <Card className="border-warning">
          <CardContent className="p-4 text-sm">
            ⚠️ Complete seu cadastro em <b>Documentos</b> (CPF e Chave PIX) para gerar o Termo de Quitação corretamente.
          </CardContent>
        </Card>
      )}

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
                  <Button size="sm" variant="outline" onClick={() => setOpen(p)}>Ver / Assinar</Button>
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
                  <div className="space-y-4">
                    <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
                      <p className="text-sm font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Opção 1 — Termo de Quitação (PDF)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Baixe o PDF, assine (digital ou impresso) e faça upload de volta para enviar ao administrador.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => downloadPdf(open)}>
                          <Download className="h-4 w-4 mr-2" /> Baixar Termo
                        </Button>
                        <label>
                          <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden"
                            onChange={(e) => uploadSigned(e, open)} disabled={busy} />
                          <Button size="sm" asChild disabled={busy} className="gradient-primary text-primary-foreground border-0">
                            <span className="cursor-pointer"><Upload className="h-4 w-4 mr-2" /> Enviar assinado</span>
                          </Button>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium flex items-center gap-2"><PenTool className="h-4 w-4" /> Opção 2 — Assinar aqui</p>
                      <div className="border-2 border-dashed rounded-lg bg-background">
                        <SignatureCanvas ref={sigRef} canvasProps={{ className: "w-full h-32 rounded-lg" }} />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => sigRef.current?.clear()}>Limpar</Button>
                        <Button size="sm" onClick={signWithDraw} disabled={busy} className="gradient-primary text-primary-foreground border-0">
                          Assinar agora
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border bg-success/10 p-4 text-sm space-y-2">
                    <div><CheckCircle2 className="h-5 w-5 inline mr-2 text-success" />
                    Assinado em {new Date(open.signed_at).toLocaleString("pt-BR")}</div>
                    <Button size="sm" variant="outline" onClick={() => downloadPdf(open)}>
                      <Download className="h-4 w-4 mr-2" /> Baixar Termo
                    </Button>
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
