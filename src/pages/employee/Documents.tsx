import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FolderOpen, Upload, Trash2, FileText, Camera, Cake, Search, Loader2, Eye } from "lucide-react";
import { fetchCnpj, formatCep, formatCnpj } from "@/lib/brasilApi";
import { generateNfseDataPdf } from "@/lib/nfsePdf";
import { COMPANY } from "@/lib/company";
import { fmtBRL } from "@/lib/payroll";

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
  const [cnpjValue, setCnpjValue] = useState("");
  const [cnpjBusy, setCnpjBusy] = useState(false);
  const [cnpjData, setCnpjData] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const lookupCnpj = async (raw: string, silent = false) => {
    const clean = raw.replace(/\D/g, "");
    if (clean.length !== 14) {
      if (!silent) toast.error("CNPJ deve ter 14 dígitos");
      return;
    }
    setCnpjBusy(true);
    const data = await fetchCnpj(clean);
    setCnpjBusy(false);
    if (!data) {
      if (!silent) toast.error("CNPJ não encontrado na Receita");
      return;
    }
    setCnpjData(data);
    if (!user) return;
    const opening = data.data_inicio_atividade ? data.data_inicio_atividade.slice(0, 10) : null;
    const { error } = await supabase.from("profiles").update({
      cnpj: formatCnpj(clean),
      company_name: data.razao_social || data.nome_fantasia || null,
      address: data.logradouro || null,
      address_number: data.numero || null,
      neighborhood: data.bairro || null,
      city: data.municipio || null,
      state: data.uf || null,
      zip_code: formatCep(data.cep) || null,
      opening_date: opening,
      service_code: profile?.service_code || "17.22.01",
      service_description: data.cnae_fiscal_descricao || profile?.service_description || null,
    }).eq("id", user.id);
    if (error) toast.error(error.message);
    else { toast.success("Dados do CNPJ preenchidos automaticamente!"); load(); }
  };

  useEffect(() => {
    if (profile?.cnpj && !cnpjValue) setCnpjValue(profile.cnpj);
  }, [profile]);


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
      cnpj: f.get("cnpj") as string,
      company_name: (f.get("company_name") as string) || null,
      address: (f.get("address") as string) || null,
      address_number: (f.get("address_number") as string) || null,
      neighborhood: (f.get("neighborhood") as string) || null,
      city: (f.get("city") as string) || null,
      state: (f.get("state") as string) || null,
      zip_code: (f.get("zip_code") as string) || null,
      municipal_registration: (f.get("municipal_registration") as string) || null,
      service_code: (f.get("service_code") as string) || null,
      service_description: (f.get("service_description") as string) || null,
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
                <div>
                  <Label>CNPJ (caso seja MEI)</Label>
                  <div className="flex gap-2">
                    <Input
                      name="cnpj"
                      value={cnpjValue}
                      onChange={(e) => setCnpjValue(e.target.value)}
                      onBlur={(e) => {
                        const clean = e.target.value.replace(/\D/g, "");
                        if (clean.length === 14 && clean !== (profile.cnpj || "").replace(/\D/g, "")) {
                          lookupCnpj(clean, true);
                        }
                      }}
                      placeholder="00.000.000/0000-00"
                    />
                    <Button type="button" variant="outline" size="icon" disabled={cnpjBusy}
                      onClick={() => lookupCnpj(cnpjValue)} title="Buscar dados na Receita">
                      {cnpjBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">Preenche endereço e razão social automaticamente</p>
                </div>
                <div className="sm:col-span-2"><Label>Razão social do MEI (como aparecerá na NFS-e)</Label><Input name="company_name" defaultValue={profile.company_name ?? ""} placeholder="Ex.: 63.658.468 LARISSA COSTA SANTOS" /></div>
                {profile.cnpj && (
                  <>
                    <div className="sm:col-span-2"><Label>Endereço</Label><Input name="address" defaultValue={profile.address ?? ""} /></div>
                    <div><Label>Número</Label><Input name="address_number" defaultValue={profile.address_number ?? ""} /></div>
                    <div><Label>Bairro</Label><Input name="neighborhood" defaultValue={profile.neighborhood ?? ""} /></div>
                    <div><Label>Cidade</Label><Input name="city" defaultValue={profile.city ?? ""} /></div>
                    <div><Label>UF</Label><Input name="state" defaultValue={profile.state ?? ""} maxLength={2} /></div>
                    <div><Label>CEP</Label><Input name="zip_code" defaultValue={profile.zip_code ?? ""} /></div>
                    <div><Label>Inscrição Municipal</Label><Input name="municipal_registration" defaultValue={profile.municipal_registration ?? ""} placeholder="(opcional)" /></div>
                    <div><Label>Código de serviço (NFS-e)</Label><Input name="service_code" defaultValue={profile.service_code ?? "17.22.01"} /></div>
                    <div className="sm:col-span-2"><Label>Descrição da atividade (CNAE)</Label><Input name="service_description" defaultValue={profile.service_description ?? ""} /></div>
                  </>
                )}
                <div><Label>Telefone</Label><Input name="phone" defaultValue={profile.phone ?? ""} /></div>
                <div><Label>Chave PIX</Label><Input name="pix_key" defaultValue={profile.pix_key ?? ""} placeholder="CPF, e-mail, telefone ou aleatória" /></div>
                <div><Label>E-mail</Label><Input value={profile.email} disabled /></div>
                <div className="sm:col-span-2 flex flex-wrap gap-2">
                  <Button type="submit" className="gradient-primary text-primary-foreground border-0">Salvar alterações</Button>
                  {profile.cnpj && (
                    <Button type="button" variant="outline" onClick={() => setPreviewOpen(true)}>
                      <Eye className="h-4 w-4 mr-2" /> Ver prévia da NFS-e
                    </Button>
                  )}
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

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Prévia da sua NFS-e</DialogTitle></DialogHeader>
          {profile && (
            <div className="space-y-4 text-sm">
              <p className="text-xs text-muted-foreground">
                Veja como a sua nota será preenchida no portal nfse.gov.br quando o RH gerar o holerite do mês.
              </p>
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <div>
                  <p className="font-bold text-xs text-muted-foreground mb-1">PRESTADOR (você)</p>
                  <p><strong>CNPJ:</strong> {profile.cnpj || "—"}</p>
                  <p><strong>Nome empresarial:</strong> {profile.company_name || profile.full_name}</p>
                  {profile.municipal_registration && <p><strong>Inscrição Municipal:</strong> {profile.municipal_registration}</p>}
                  {profile.address && (
                    <p><strong>Endereço:</strong> {[profile.address, profile.address_number, profile.neighborhood].filter(Boolean).join(", ")}</p>
                  )}
                  {profile.city && <p><strong>Município:</strong> {profile.city} - {profile.state}</p>}
                  {profile.zip_code && <p><strong>CEP:</strong> {profile.zip_code}</p>}
                </div>
                <div className="border-t pt-3">
                  <p className="font-bold text-xs text-muted-foreground mb-1">TOMADOR</p>
                  <p><strong>CNPJ:</strong> {COMPANY.cnpj}</p>
                  <p><strong>Razão social:</strong> {COMPANY.name}</p>
                  <p><strong>Município:</strong> {COMPANY.city} - {COMPANY.state}</p>
                </div>
                <div className="border-t pt-3">
                  <p className="font-bold text-xs text-muted-foreground mb-1">SERVIÇO</p>
                  <p><strong>Código:</strong> {profile.service_code || "17.22.01"} - {profile.service_description || "Cobrança em geral."}</p>
                  <p className="mt-2"><strong>Descrição:</strong></p>
                  <p className="italic text-muted-foreground">
                    Valor referente aos serviços prestados no mês de MM/AAAA<br/>
                    Salário {fmtBRL(Number(profile.base_salary || 0))}<br/>
                    Dados para Recebimento: Chave Pix: {profile.pix_key || "—"}
                  </p>
                </div>
                <div className="border-t pt-3">
                  <p className="font-bold text-xs text-muted-foreground mb-1">VALOR</p>
                  <p className="text-lg font-bold text-primary">{fmtBRL(Number(profile.base_salary || 0))}</p>
                </div>
              </div>
              <Button className="w-full gradient-primary text-primary-foreground border-0"
                onClick={() => {
                  const now = new Date();
                  const doc = generateNfseDataPdf({
                    employee: profile,
                    month: now.getMonth() + 1,
                    year: now.getFullYear(),
                    amount: Number(profile.base_salary || 0),
                  });
                  doc.save(`previa-NFSe-${profile.full_name?.replace(/\s+/g, "_")}.pdf`);
                }}>
                <FileText className="h-4 w-4 mr-2" /> Baixar PDF de prévia
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
