import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, FileText, Download, ArrowLeft, CheckCircle2, Search, User } from "lucide-react";
import { monthNames, fmtBRL } from "@/lib/payroll";
import { toast } from "sonner";

export default function EmployeeFolders() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("*").order("full_name");
      setProfiles(data ?? []);
    })();
  }, []);

  const openFolder = async (p: any) => {
    setSelected(p);
    const [{ data: ps }, { data: dc }] = await Promise.all([
      supabase.from("payslips").select("*").eq("user_id", p.id)
        .order("reference_year", { ascending: false }).order("reference_month", { ascending: false }),
      supabase.from("documents").select("*").eq("user_id", p.id).order("uploaded_at", { ascending: false }),
    ]);
    setPayslips(ps ?? []);
    setDocs(dc ?? []);
  };

  const downloadFromBucket = async (bucket: string, path: string, fileName: string) => {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error || !data) { toast.error("Não foi possível baixar"); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
  };

  const openInNewTab = async (bucket: string, path: string) => {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300);
    if (error || !data?.signedUrl) { toast.error("Não foi possível abrir"); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const filtered = profiles.filter(p =>
    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (selected) {
    const signed = payslips.filter(p => p.status === "signed");
    const folderName = selected.full_name?.replace(/\s+/g, "_") || "funcionario";
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FolderOpen className="h-6 w-6 text-accent" /> {selected.full_name}
            </h1>
            <p className="text-xs text-muted-foreground">/{folderName}/</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-primary" /> Holerites assinados ({signed.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {signed.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Nenhum holerite assinado ainda.</p>}
            {signed.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 text-success shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      Holerite — {monthNames[p.reference_month - 1]}/{p.reference_year}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {fmtBRL(Number(p.total_net))} • Assinado em {new Date(p.signed_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <Badge className="bg-success text-success-foreground">
                    <CheckCircle2 className="h-3 w-3 mr-1" />Assinado
                  </Badge>
                  {p.signed_document_path ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => openInNewTab("payslip-documents", p.signed_document_path)}>
                        Abrir
                      </Button>
                      <Button size="sm" onClick={() =>
                        downloadFromBucket("payslip-documents", p.signed_document_path,
                          `${folderName}_holerite_${monthNames[p.reference_month - 1]}_${p.reference_year}.pdf`)
                      }>
                        <Download className="h-4 w-4 mr-1" /> Baixar
                      </Button>
                    </>
                  ) : p.signature_path ? (
                    <Button size="sm" variant="outline" onClick={() => openInNewTab("payslip-signatures", p.signature_path)}>
                      Ver assinatura
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-primary" /> Documentos ({docs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {docs.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Nenhum documento enviado.</p>}
            {docs.map(d => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(d.uploaded_at).toLocaleString("pt-BR")}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() =>
                  downloadFromBucket("employee-documents", d.file_path, `${folderName}_${d.name}`)
                }>
                  <Download className="h-4 w-4 mr-1" /> Baixar
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <FolderOpen className="h-7 w-7 text-accent" /> Pastas dos Funcionários
      </h1>

      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar funcionário..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(p => (
          <Card key={p.id} className="cursor-pointer hover:shadow-elegant transition-smooth hover:-translate-y-0.5"
            onClick={() => openFolder(p)}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-accent to-warning flex items-center justify-center text-accent-foreground shrink-0">
                <FolderOpen className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate">{p.full_name}</p>
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  <User className="h-3 w-3" />{p.position || p.email}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground col-span-full py-8">Nenhum funcionário encontrado.</p>
        )}
      </div>
    </div>
  );
}
