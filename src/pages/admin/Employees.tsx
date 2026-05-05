import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fmtBRL } from "@/lib/payroll";
import { toast } from "sonner";
import { Pencil, Shield, ShieldOff, FileText } from "lucide-react";

export default function Employees() {
  const [list, setList] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [docsOpen, setDocsOpen] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);

  const load = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*").order("full_name");
    const { data: roles } = await supabase.from("user_roles").select("*");
    const merged = (profiles ?? []).map((p) => ({
      ...p, isAdmin: roles?.some((r) => r.user_id === p.id && r.role === "admin"),
    }));
    setList(merged);
  };
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.from("profiles").update({
      full_name: f.get("full_name") as string,
      pix_key: f.get("pix_key") as string,
      phone: f.get("phone") as string,
      position: f.get("position") as string,
      base_salary: Number(f.get("base_salary")),
      active: f.get("active") === "on",
    }).eq("id", editing.id);
    if (error) toast.error(error.message);
    else { toast.success("Atualizado"); setEditing(null); load(); }
  };

  const toggleAdmin = async (p: any) => {
    if (p.isAdmin) {
      await supabase.from("user_roles").delete().eq("user_id", p.id).eq("role", "admin");
      toast.success("Removido como admin");
    } else {
      await supabase.from("user_roles").insert({ user_id: p.id, role: "admin" });
      toast.success("Promovido a admin");
    }
    load();
  };

  const openDocs = async (p: any) => {
    setDocsOpen(p);
    const { data } = await supabase.from("documents").select("*").eq("user_id", p.id).order("uploaded_at", { ascending: false });
    setDocs(data ?? []);
  };

  const downloadDoc = async (d: any) => {
    const { data } = await supabase.storage.from("employee-documents").createSignedUrl(d.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Funcionários</h1>
      <Card>
        <CardHeader><CardTitle>Lista ({list.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Cargo</TableHead>
                  <TableHead>Salário base</TableHead><TableHead>PIX</TableHead><TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name || "—"}</TableCell>
                    <TableCell>{p.email}</TableCell>
                    <TableCell>{p.position ?? "—"}</TableCell>
                    <TableCell>{fmtBRL(Number(p.base_salary ?? 0))}</TableCell>
                    <TableCell className="font-mono text-xs">{p.pix_key ?? "—"}</TableCell>
                    <TableCell>
                      {p.isAdmin && <Badge className="mr-1 bg-accent text-accent-foreground">Admin</Badge>}
                      {p.active ? <Badge variant="outline" className="border-success text-success">Ativo</Badge> : <Badge variant="destructive">Inativo</Badge>}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => openDocs(p)} title="Documentos"><FileText className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => toggleAdmin(p)} title={p.isAdmin ? "Remover admin" : "Tornar admin"}>
                        {p.isAdmin ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {list.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum funcionário cadastrado. Eles aparecem aqui ao se cadastrarem na tela de login.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent>
          {editing && (
            <>
              <DialogHeader><DialogTitle>Editar funcionário</DialogTitle></DialogHeader>
              <form onSubmit={save} className="space-y-3">
                <div><Label>Nome completo</Label><Input name="full_name" defaultValue={editing.full_name} required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Cargo</Label><Input name="position" defaultValue={editing.position ?? ""} /></div>
                  <div><Label>Telefone</Label><Input name="phone" defaultValue={editing.phone ?? ""} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Chave PIX</Label><Input name="pix_key" defaultValue={editing.pix_key ?? ""} /></div>
                  <div><Label>Salário base (R$)</Label><Input name="base_salary" type="number" step="0.01" defaultValue={editing.base_salary ?? 0} /></div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="active" defaultChecked={editing.active} /> Ativo
                </label>
                <Button type="submit" className="w-full gradient-primary text-primary-foreground border-0">Salvar</Button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!docsOpen} onOpenChange={() => setDocsOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Documentos de {docsOpen?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {docs.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="min-w-0">
                  <p className="font-medium truncate">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{new Date(d.uploaded_at).toLocaleString("pt-BR")}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => downloadDoc(d)}>Baixar</Button>
              </div>
            ))}
            {docs.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sem documentos</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
