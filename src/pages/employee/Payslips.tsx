import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { fmtBRL, fmtMinutes, monthNames } from "@/lib/payroll";
import { FileText, CheckCircle2, Info, XCircle, Eraser } from "lucide-react";
import { toast } from "sonner";

export default function Payslips() {
  const { user } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasDrawn = useRef(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("payslips").select("*").eq("user_id", user.id)
      .order("reference_year", { ascending: false }).order("reference_month", { ascending: false });
    setList(data ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const openModal = (p: any) => {
    setOpen(p);
    setReason(p.rejection_reason ?? "");
    hasDrawn.current = false;
    setTimeout(() => clearCanvas(), 50);
  };

  const setupCanvas = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";
  };

  const clearCanvas = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    setupCanvas(c);
    hasDrawn.current = false;
  };

  const pos = (e: React.MouseEvent | React.TouchEvent) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    const sx = c.width / r.width;
    const sy = c.height / r.height;
    const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
    const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
    return { x: (cx - r.left) * sx, y: (cy - r.top) * sy };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    drawing.current = true; hasDrawn.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
  };
  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke();
  };
  const end = () => { drawing.current = false; };

  const submit = async (agree: boolean) => {
    if (!open || !user) return;
    if (!agree && !reason.trim()) { toast.error("Informe o motivo"); return; }
    if (agree && !hasDrawn.current) { toast.error("Assine no campo"); return; }
    setSaving(true);
    try {
      let signature_path: string | undefined;
      if (agree && canvasRef.current) {
        const blob: Blob = await new Promise((res) =>
          canvasRef.current!.toBlob((b) => res(b!), "image/png")
        );
        const path = `${user.id}/${open.id}-${Date.now()}.png`;
        const { error: upErr } = await supabase.storage.from("payslip-signatures")
          .upload(path, blob, { upsert: true, contentType: "image/png" });
        if (upErr) throw upErr;
        signature_path = path;
      }
      const update: any = {
        status: agree ? "signed" : "rejected",
        responded_at: new Date().toISOString(),
        rejection_reason: agree ? null : reason.trim(),
      };
      if (signature_path) { update.signature_path = signature_path; update.signed_at = new Date().toISOString(); }
      const { error } = await supabase.from("payslips").update(update).eq("id", open.id);
      if (error) throw error;
      // Notifica admins
      const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      await supabase.rpc("notify_admins_payslip_response", {
        _payslip_id: open.id,
        _employee_name: prof?.full_name ?? user.email ?? "Funcionário",
        _agreed: agree,
        _reason: agree ? null : reason.trim(),
      });
      toast.success(agree ? "Holerite assinado e enviado" : "Resposta registrada");
      setOpen(null); load();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao enviar");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Meus Holerites</h1>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 text-sm flex gap-3">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            Confira os valores de cada holerite. Você pode <strong>concordar</strong> e assinar com o mouse,
            ou <strong>não concordar</strong> e informar o motivo. Sua resposta será enviada ao RH.
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
                  {p.status === "signed" && <Badge className="bg-success text-success-foreground"><CheckCircle2 className="h-3 w-3 mr-1" />Assinado</Badge>}
                  {p.status === "rejected" && <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Não concordou</Badge>}
                  {p.status === "pending" && <Badge variant="outline" className="border-warning text-warning">Pendente</Badge>}
                  <Button size="sm" variant="outline" onClick={() => openModal(p)}>Ver detalhes</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
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
                    Você concordou e assinou em {new Date(open.signed_at ?? open.responded_at).toLocaleString("pt-BR")}
                  </div>
                ) : open.status === "rejected" ? (
                  <div className="rounded-lg border bg-destructive/10 p-4 text-sm space-y-1">
                    <div><XCircle className="h-5 w-5 inline mr-2 text-destructive" />
                      Você não concordou em {new Date(open.responded_at).toLocaleString("pt-BR")}</div>
                    {open.rejection_reason && <div className="text-muted-foreground"><strong>Motivo:</strong> {open.rejection_reason}</div>}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {open.admin_response && (
                      <div className="rounded-lg border bg-primary/10 p-3 text-sm">
                        <p className="font-semibold">Resposta do RH:</p>
                        <p className="mt-1">{open.admin_response}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          O RH revisou seu holerite. Confira novamente os valores e responda abaixo.
                          Se ainda discordar, você pode falar com o RH pelo <a href="/app/chat" className="underline text-primary">chat</a>.
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium">Motivo (caso não concorde)</label>
                      <Textarea value={reason} onChange={(e) => setReason(e.target.value)}
                        placeholder="Descreva o motivo do desacordo..." maxLength={500} className="mt-1" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-medium">Assinatura (desenhe com o mouse)</label>
                        <Button type="button" variant="ghost" size="sm" onClick={clearCanvas}>
                          <Eraser className="h-3 w-3 mr-1" /> Limpar
                        </Button>
                      </div>
                      <canvas
                        ref={canvasRef}
                        width={600}
                        height={180}
                        className="w-full h-44 border-2 border-dashed border-border rounded bg-white touch-none cursor-crosshair"
                        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
                        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
                      />
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                {open.status === "pending" ? (
                  <div className="flex gap-2 w-full">
                    <Button variant="destructive" disabled={saving} onClick={() => submit(false)} className="flex-1">
                      <XCircle className="h-4 w-4 mr-1" /> Não concordo
                    </Button>
                    <Button disabled={saving} onClick={() => submit(true)}
                      className="flex-1 gradient-primary text-primary-foreground border-0">
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Concordo e assino
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => setOpen(null)}>Fechar</Button>
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
