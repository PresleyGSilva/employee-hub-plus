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

const DOC_CATEGORIES = [
  { key: "rg", label: "RG" },
  { key: "cpf", label: "CPF" },
  { key: "comprovante_residencia", label: "Comprovante de Residência" },
  { key: "titulo_eleitor", label: "Título de Eleitor" },
  { key: "auxilio_brasil", label: "Comprovante de Auxílio Brasil" },
  { key: "cnpj", label: "CNPJ (MEI)" },
] as const;

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

  const onUpload = async (category: string, categoryLabel: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (file.size > 10 * 1024 * 1024) { toast.error("Máximo 10MB"); return; }
    setBusy(true);
    const path = `${user.id}/${category}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("employee-documents").upload(path, file);
    if (upErr) { setBusy(false); toast.error(upErr.message); return; }
    const { error } = await supabase.from("documents").insert({
      user_id: user.id, name: `${categoryLabel} — ${file.name}`, doc_type: category, file_path: path,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success(`${categoryLabel} enviado`); load(); e.target.value = ""; }
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
    const birth = (f.get("birth_date") as string) || null;
    const { error } = await supabase.from("profiles").update({
      full_name: f.get("full_name") as string,
      pix_key: f.get("pix_key") as string,
      phone: f.get("phone") as string,
      cpf: f.get("cpf") as string,
      birth_date: birth,
    }).eq("id", user.id);
    if (error) toast.error(error.message); else { toast.success("Perfil atualizado"); load(); }
  };

  const onAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) { toast.error("Envie uma imagem"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Máximo 5MB"); return; }
    setBusy(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) { setBusy(false); toast.error(upErr.message); return; }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${pub.publicUrl}?v=${Date.now()}`;
    const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    setBusy(false);
    e.target.value = "";
    if (error) toast.error(error.message);
    else { toast.success("Foto atualizada!"); load(); }
  };

  const initials = profile?.full_name?.split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase() ?? "?";

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Meus Dados & Documentos</h1>

      <Card>
        <CardHeader><CardTitle>Foto e dados pessoais</CardTitle></CardHeader>
        <CardContent>
          {profile && (
            <div className="space-y-6">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                    {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name} />}
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-2xl">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <label htmlFor="avatar" className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow-lg hover:scale-105 transition-transform">
                    <Camera className="h-4 w-4" />
                  </label>
                  <input id="avatar" type="file" accept="image/*" className="hidden"
                    onChange={onAvatarUpload} disabled={busy} />
                </div>
                <div>
                  <p className="font-semibold text-lg">{profile.full_name}</p>
                  <p className="text-sm text-muted-foreground">{profile.position || profile.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">Clique no ícone da câmera para alterar</p>
                </div>
              </div>

              <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
                <div><Label>Nome completo</Label><Input name="full_name" defaultValue={profile.full_name} required /></div>
                <div>
                  <Label className="flex items-center gap-1.5"><Cake className="h-3.5 w-3.5" /> Data de nascimento</Label>
                  <Input name="birth_date" type="date" defaultValue={profile.birth_date ?? ""} />
                </div>
                <div><Label>CPF</Label><Input name="cpf" defaultValue={profile.cpf ?? ""} placeholder="000.000.000-00" /></div>
                <div><Label>Telefone</Label><Input name="phone" defaultValue={profile.phone ?? ""} /></div>
                <div><Label>Chave PIX</Label><Input name="pix_key" defaultValue={profile.pix_key ?? ""} placeholder="CPF, e-mail, telefone ou aleatória" /></div>
                <div><Label>E-mail</Label><Input value={profile.email} disabled /></div>
                <div className="sm:col-span-2">
                  <Button type="submit" className="gradient-primary text-primary-foreground border-0">Salvar alterações</Button>
                </div>
              </form>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FolderOpen className="h-5 w-5" /> Documentos enviados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">

            {DOC_CATEGORIES.map((cat) => {
              const items = docs.filter((d) => d.doc_type === cat.key);
              const inputId = `file-${cat.key}`;
              return (
                <div key={cat.key} className="rounded-xl border p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm">{cat.label}</p>
                    <span className="text-xs text-muted-foreground">{items.length} arquivo(s)</span>
                  </div>
                  <Label htmlFor={inputId} className="cursor-pointer block">
                    <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary transition-smooth">
                      <Upload className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs">{busy ? "Enviando..." : "Clique para enviar"}</p>
                    </div>
                  </Label>
                  <input id={inputId} type="file" className="hidden" disabled={busy}
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                    onChange={(e) => onUpload(cat.key, cat.label, e)} />

                  <div className="space-y-1.5">
                    {items.map((d) => (
                      <div key={d.id} className="flex items-center justify-between p-2 rounded-md border bg-card">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{d.name.replace(`${cat.label} — `, "")}</p>
                            <p className="text-[10px] text-muted-foreground">{new Date(d.uploaded_at).toLocaleDateString("pt-BR")}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(d)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    {items.length === 0 && <p className="text-center text-[11px] text-muted-foreground py-2">Nenhum arquivo</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
