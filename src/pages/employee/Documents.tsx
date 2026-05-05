import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { FolderOpen, Upload, Trash2, FileText, Camera, Cake } from "lucide-react";

export default function Documents() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const [{ data: d }, { data: p }] = await Promise.all([
      supabase.from("documents").select("*").eq("user_id", user.id).order("uploaded_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    ]);
    setDocs(d ?? []); setProfile(p);
  };
  useEffect(() => { load(); }, [user]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (file.size > 10 * 1024 * 1024) { toast.error("Máximo 10MB"); return; }
    setBusy(true);
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("employee-documents").upload(path, file);
    if (upErr) { setBusy(false); toast.error(upErr.message); return; }
    const { error } = await supabase.from("documents").insert({
      user_id: user.id, name: file.name, doc_type: file.type, file_path: path,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Documento enviado"); load(); e.target.value = ""; }
  };

  const remove = async (doc: any) => {
    await supabase.storage.from("employee-documents").remove([doc.file_path]);
    await supabase.from("documents").delete().eq("id", doc.id);
    toast.success("Removido"); load();
  };

  const saveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.from("profiles").update({
      full_name: f.get("full_name") as string,
      pix_key: f.get("pix_key") as string,
      phone: f.get("phone") as string,
      cpf: f.get("cpf") as string,
    }).eq("id", user.id);
    if (error) toast.error(error.message); else { toast.success("Perfil atualizado"); load(); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Meus Dados & Documentos</h1>

      <Card>
        <CardHeader><CardTitle>Dados pessoais</CardTitle></CardHeader>
        <CardContent>
          {profile && (
            <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
              <div><Label>Nome completo</Label><Input name="full_name" defaultValue={profile.full_name} required /></div>
              <div><Label>CPF</Label><Input name="cpf" defaultValue={profile.cpf ?? ""} placeholder="000.000.000-00" /></div>
              <div><Label>Telefone</Label><Input name="phone" defaultValue={profile.phone ?? ""} /></div>
              <div><Label>Chave PIX</Label><Input name="pix_key" defaultValue={profile.pix_key ?? ""} placeholder="CPF, e-mail, telefone ou aleatória" /></div>
              <div><Label>E-mail</Label><Input value={profile.email} disabled /></div>
              <div className="sm:col-span-2">
                <Button type="submit" className="gradient-primary text-primary-foreground border-0">Salvar alterações</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FolderOpen className="h-5 w-5" /> Documentos enviados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="file" className="cursor-pointer">
              <div className="border-2 border-dashed rounded-xl p-6 text-center hover:border-primary transition-smooth">
                <Upload className="h-7 w-7 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">{busy ? "Enviando..." : "Clique para enviar (PDF, imagens, até 10MB)"}</p>
              </div>
            </Label>
            <input id="file" type="file" className="hidden" onChange={onUpload} disabled={busy}
              accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx" />
          </div>

          <div className="space-y-2">
            {docs.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(d.uploaded_at).toLocaleString("pt-BR")}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(d)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            {docs.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">Nenhum documento enviado.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
