import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtBRL } from "@/lib/payroll";
import { toast } from "sonner";
import { Pencil, Shield, ShieldOff, FileText, KeyRound, Briefcase, Plus, Trash2, Users, X } from "lucide-react";

export default function Employees() {
  const [list, setList] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [vacations, setVacations] = useState<Record<string, any>>({});
  const [editing, setEditing] = useState<any>(null);
  const [editPosition, setEditPosition] = useState<string>("");
  const [editTeam, setEditTeam] = useState<string>("");
  const [editRole, setEditRole] = useState<"employee" | "supervisor" | "admin">("employee");
  const [docsOpen, setDocsOpen] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [pwdOpen, setPwdOpen] = useState<any>(null);
  const [newPwd, setNewPwd] = useState("");
  const [posOpen, setPosOpen] = useState(false);
  const [newPosName, setNewPosName] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamColor, setNewTeamColor] = useState("#3b82f6");

  const load = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*").order("full_name");
    const { data: roles } = await supabase.from("user_roles").select("*");
    const { data: pos } = await supabase.from("positions").select("*").order("name");
    const { data: tms } = await supabase.from("teams").select("*").order("name");
    const today = new Date().toISOString().slice(0, 10);
    const { data: vacs } = await supabase.from("vacations").select("user_id,vacation_start,vacation_end,status")
      .gte("vacation_end", today).order("vacation_start", { ascending: true });
    const vmap: Record<string, any> = {};
    vacs?.forEach((v) => { if (!vmap[v.user_id]) vmap[v.user_id] = v; });
    setVacations(vmap);
    const merged = (profiles ?? []).map((p) => {
      const userRoles = roles?.filter((r) => r.user_id === p.id).map((r) => r.role) ?? [];
      return {
        ...p,
        isAdmin: userRoles.includes("admin"),
        isSupervisor: userRoles.includes("supervisor"),
      };
    });
    setList(merged);
    setPositions(pos ?? []);
    setTeams(tms ?? []);
  };
  useEffect(() => { load(); }, []);

  const openEdit = (p: any) => {
    setEditing(p);
    setEditPosition(p.position ?? "");
    setEditTeam(p.team_id ?? "");
    setEditRole(p.isAdmin ? "admin" : p.isSupervisor ? "supervisor" : "employee");
  };

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.from("profiles").update({
      full_name: f.get("full_name") as string,
      pix_key: f.get("pix_key") as string,
      phone: f.get("phone") as string,
      position: editPosition || null,
      team_id: editTeam || null,
      base_salary: Number(f.get("base_salary")),
      default_bonus: Number(f.get("default_bonus")),
      default_commission: Number(f.get("default_commission")),
      overtime_hour_rate: Number(f.get("overtime_hour_rate")),
      hire_date: (f.get("hire_date") as string) || null,
      active: f.get("active") === "on",
      is_mei: f.get("is_mei") === "on",
    }).eq("id", editing.id);
    if (error) { toast.error(error.message); return; }

    // Sync roles: keep only the selected one (admin/supervisor/employee)
    await supabase.from("user_roles").delete().eq("user_id", editing.id).in("role", ["admin", "supervisor"] as any);
    if (editRole === "admin") {
      await supabase.from("user_roles").insert({ user_id: editing.id, role: "admin" as any });
    } else if (editRole === "supervisor") {
      await supabase.from("user_roles").insert({ user_id: editing.id, role: "supervisor" as any });
      if (editTeam) await supabase.from("teams").update({ supervisor_id: editing.id }).eq("id", editTeam);
    }

    // Notify supervisor when a consultora is linked/moved to her team
    const teamChanged = (editing.team_id ?? "") !== (editTeam ?? "");
    if (teamChanged && editTeam && editRole === "employee") {
      const team = teams.find((t) => t.id === editTeam);
      if (team?.supervisor_id && team.supervisor_id !== editing.id) {
        await supabase.from("notifications").insert({
          user_id: team.supervisor_id,
          title: "👥 Nova consultora na sua equipe",
          message: `${editing.full_name} foi vinculada à equipe ${team.name}. Acompanhe o progresso dela em Metas.`,
          is_broadcast: false,
        });
        // Also notify the consultora
        await supabase.from("notifications").insert({
          user_id: editing.id,
          title: "🎉 Você foi vinculada a uma equipe",
          message: `Você agora faz parte da equipe ${team.name}. Bem-vinda!`,
          is_broadcast: false,
        });
        toast.success(`Vinculada e supervisora notificada`);
      } else {
        toast.success("Atualizado");
      }
    } else {
      toast.success("Atualizado");
    }
    setEditing(null); load();
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

  const createTeamInline = async () => {
    if (!newTeamName.trim()) return toast.error("Nome da equipe obrigatório");
    const { data, error } = await supabase.from("teams").insert({
      name: newTeamName.trim(), color: newTeamColor,
      supervisor_id: editRole === "supervisor" && editing ? editing.id : null,
    }).select().single();
    if (error) return toast.error(error.message);
    toast.success(`Equipe "${data.name}" criada`);
    setNewTeamName(""); setNewTeamColor("#3b82f6");
    await load();
    setEditTeam(data.id);
  };

  const assignMemberToTeam = async (userId: string, teamId: string | null) => {
    await supabase.from("profiles").update({ team_id: teamId }).eq("id", userId);
    if (teamId && editing) {
      await supabase.from("notifications").insert([
        { user_id: editing.id, title: "👥 Nova consultora na sua equipe",
          message: `Uma consultora foi vinculada à sua equipe.`, is_broadcast: false },
      ]);
    }
    await load();
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

  const resetPassword = async () => {
    if (!pwdOpen || newPwd.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres");
      return;
    }
    const { data, error } = await supabase.functions.invoke("admin-reset-password", {
      body: { user_id: pwdOpen.id, new_password: newPwd },
    });
    if (error || data?.error) toast.error(error?.message || data?.error);
    else {
      toast.success(`Senha de ${pwdOpen.full_name} redefinida`);
      setPwdOpen(null);
      setNewPwd("");
    }
  };

  const addPosition = async () => {
    if (!newPosName.trim()) return;
    const { error } = await supabase.from("positions").insert({ name: newPosName.trim() });
    if (error) toast.error(error.message);
    else { setNewPosName(""); load(); toast.success("Cargo adicionado"); }
  };

  const deletePosition = async (id: string) => {
    const { error } = await supabase.from("positions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { load(); toast.success("Cargo removido"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold">Funcionários</h1>
        <Button variant="outline" onClick={() => setPosOpen(true)} className="w-full sm:w-auto">
          <Briefcase className="h-4 w-4 mr-2" /> Gerenciar cargos
        </Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Lista ({list.length})</CardTitle></CardHeader>
        <CardContent>
          {/* Desktop table */}
          <div className="hidden 2xl:block overflow-x-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Cargo</TableHead><TableHead>Equipe</TableHead>
                  <TableHead>Admissão</TableHead><TableHead>Próximas férias</TableHead>
                  <TableHead>Salário base</TableHead><TableHead>Bônus</TableHead><TableHead>Comissão</TableHead><TableHead>Hora extra</TableHead><TableHead>PIX</TableHead><TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((p) => {
                  const v = vacations[p.id];
                  const fmtD = (d?: string | null) => d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—";
                  return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name || "—"}</TableCell>
                    <TableCell>{p.email}</TableCell>
                    <TableCell>{p.position ?? "—"}</TableCell>
                    <TableCell className="text-sm">
                      {(() => {
                        const t = teams.find((x) => x.id === p.team_id);
                        return t ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full" style={{ background: t.color }} />
                            {t.name}
                          </span>
                        ) : "—";
                      })()}
                    </TableCell>
                    <TableCell className="text-sm">{fmtD(p.hire_date)}</TableCell>
                    <TableCell className="text-sm">
                      {v ? (
                        <span className="whitespace-nowrap">
                          {fmtD(v.vacation_start)} → {fmtD(v.vacation_end)}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>{fmtBRL(Number(p.base_salary ?? 0))}</TableCell>
                    <TableCell>{fmtBRL(Number(p.default_bonus ?? 0))}</TableCell>
                    <TableCell>{fmtBRL(Number(p.default_commission ?? 0))}</TableCell>
                    <TableCell>{fmtBRL(Number(p.overtime_hour_rate ?? 0))}</TableCell>
                    <TableCell className="font-mono text-xs">{p.pix_key ?? "—"}</TableCell>
                    <TableCell>
                      {p.isAdmin && <Badge className="mr-1 bg-accent text-accent-foreground">Admin</Badge>}
                      {p.isSupervisor && !p.isAdmin && <Badge className="mr-1 bg-primary/20 text-primary">Supervisora</Badge>}
                      {p.active ? <Badge variant="outline" className="border-success text-success">Ativo</Badge> : <Badge variant="destructive">Inativo</Badge>}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => openDocs(p)} title="Documentos"><FileText className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setPwdOpen(p)} title="Resetar senha"><KeyRound className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => toggleAdmin(p)} title={p.isAdmin ? "Remover admin" : "Tornar admin"}>
                        {p.isAdmin ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                  );
                })}
                {list.length === 0 && <TableRow><TableCell colSpan={13} className="text-center py-8 text-muted-foreground">Nenhum funcionário cadastrado.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>

          {/* Mobile/Tablet cards */}
          <div className="xl:hidden space-y-3">
            {list.map((p) => {
              const v = vacations[p.id];
              const t = teams.find((x) => x.id === p.team_id);
              const fmtD = (d?: string | null) => d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—";
              return (
                <div key={p.id} className="rounded-lg border p-3 space-y-2 bg-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{p.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {p.isAdmin && <Badge className="bg-accent text-accent-foreground">Admin</Badge>}
                      {p.isSupervisor && !p.isAdmin && <Badge className="bg-primary/20 text-primary">Supervisora</Badge>}
                      {p.active ? <Badge variant="outline" className="border-success text-success">Ativo</Badge> : <Badge variant="destructive">Inativo</Badge>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div><span className="text-muted-foreground">Cargo: </span>{p.position ?? "—"}</div>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Equipe: </span>
                      {t ? (<><span className="h-2 w-2 rounded-full" style={{ background: t.color }} />{t.name}</>) : "—"}
                    </div>
                    <div><span className="text-muted-foreground">Admissão: </span>{fmtD(p.hire_date)}</div>
                    <div><span className="text-muted-foreground">Férias: </span>{v ? `${fmtD(v.vacation_start)}→${fmtD(v.vacation_end)}` : "—"}</div>
                    <div><span className="text-muted-foreground">Salário: </span>{fmtBRL(Number(p.base_salary ?? 0))}</div>
                    <div><span className="text-muted-foreground">Bônus: </span>{fmtBRL(Number(p.default_bonus ?? 0))}</div>
                    <div><span className="text-muted-foreground">Comissão: </span>{fmtBRL(Number(p.default_commission ?? 0))}</div>
                    <div><span className="text-muted-foreground">Hora extra: </span>{fmtBRL(Number(p.overtime_hour_rate ?? 0))}</div>
                    <div className="col-span-2 truncate"><span className="text-muted-foreground">PIX: </span><span className="font-mono">{p.pix_key ?? "—"}</span></div>
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1 border-t">
                    <Button size="sm" variant="ghost" onClick={() => openDocs(p)}><FileText className="h-4 w-4 mr-1" />Docs</Button>
                    <Button size="sm" variant="ghost" onClick={() => setPwdOpen(p)}><KeyRound className="h-4 w-4 mr-1" />Senha</Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleAdmin(p)}>
                      {p.isAdmin ? <ShieldOff className="h-4 w-4 mr-1" /> : <Shield className="h-4 w-4 mr-1" />}Admin
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4 mr-1" />Editar</Button>
                  </div>
                </div>
              );
            })}
            {list.length === 0 && <div className="text-center py-8 text-muted-foreground">Nenhum funcionário cadastrado.</div>}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {editing && (
            <>
              <DialogHeader><DialogTitle>Editar funcionário</DialogTitle></DialogHeader>
              <form onSubmit={save} className="space-y-3">
                <div><Label>Nome completo</Label><Input name="full_name" defaultValue={editing.full_name} required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Cargo</Label>
                    <Select value={editPosition} onValueChange={setEditPosition}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {positions.map((p) => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Telefone</Label><Input name="phone" defaultValue={editing.phone ?? ""} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Equipe</Label>
                    <Select value={editTeam || "none"} onValueChange={(v) => setEditTeam(v === "none" ? "" : v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem equipe</SelectItem>
                        {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Função no sistema</Label>
                    <Select value={editRole} onValueChange={(v: any) => setEditRole(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Consultora</SelectItem>
                        <SelectItem value="supervisor">Supervisora</SelectItem>
                        <SelectItem value="admin">Administrador (gerente)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Inline: create new team without leaving this dialog */}
                <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
                  <Label className="text-xs flex items-center gap-1"><Plus className="h-3 w-3" /> Criar nova equipe</Label>
                  <div className="flex gap-2">
                    <Input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="Ex.: Equipe Azul" className="flex-1" />
                    <Input type="color" value={newTeamColor} onChange={(e) => setNewTeamColor(e.target.value)} className="w-14 h-10 p-1" />
                    <Button type="button" onClick={createTeamInline}>Criar</Button>
                  </div>
                  {editRole === "supervisor" && (
                    <p className="text-[11px] text-muted-foreground">A nova equipe terá <strong>{editing.full_name}</strong> como supervisora automaticamente.</p>
                  )}
                </div>

                {/* When editing a supervisor with a team, show team members */}
                {editRole === "supervisor" && editTeam && (() => {
                  const teamObj = teams.find((t) => t.id === editTeam);
                  const members = list.filter((p) => p.team_id === editTeam && p.id !== editing.id);
                  const available = list.filter((p) => !p.team_id && p.id !== editing.id && !p.isAdmin && !p.isSupervisor);
                  return (
                    <div className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Consultoras na equipe {teamObj && <span className="h-2 w-2 rounded-full inline-block ml-1" style={{ background: teamObj.color }} />}
                          <span className="ml-1">({members.length})</span>
                        </Label>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {members.map((m) => (
                          <Badge key={m.id} variant="secondary" className="cursor-pointer gap-1"
                            onClick={() => assignMemberToTeam(m.id, null)} title="Remover da equipe">
                            {m.full_name} <X className="h-3 w-3" />
                          </Badge>
                        ))}
                        {members.length === 0 && <span className="text-xs text-muted-foreground">Nenhuma consultora ainda</span>}
                      </div>
                      <div className="pt-1">
                        <Label className="text-xs">Adicionar consultora</Label>
                        <Select value="" onValueChange={(v) => assignMemberToTeam(v, editTeam)}>
                          <SelectTrigger><SelectValue placeholder="Selecionar funcionária livre" /></SelectTrigger>
                          <SelectContent>
                            {available.length === 0 && <SelectItem value="-" disabled>Sem consultoras disponíveis</SelectItem>}
                            {available.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })()}
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Chave PIX</Label><Input name="pix_key" defaultValue={editing.pix_key ?? ""} /></div>
                  <div><Label>Salário base (R$)</Label><Input name="base_salary" type="number" step="0.01" defaultValue={editing.base_salary ?? 0} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Bonificação padrão (R$)</Label><Input name="default_bonus" type="number" step="0.01" defaultValue={editing.default_bonus ?? 0} /></div>
                  <div><Label>Comissão padrão (R$)</Label><Input name="default_commission" type="number" step="0.01" defaultValue={editing.default_commission ?? 0} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Valor da hora extra (R$/hora)</Label><Input name="overtime_hour_rate" type="number" step="0.01" defaultValue={editing.overtime_hour_rate ?? 0} /></div>
                  <div><Label>Data de admissão</Label><Input name="hire_date" type="date" defaultValue={editing.hire_date ?? ""} /></div>
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="active" defaultChecked={editing.active} /> Ativo
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="is_mei" defaultChecked={editing.is_mei} /> MEI (emite NFS-e)
                  </label>
                </div>
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

      <Dialog open={!!pwdOpen} onOpenChange={() => { setPwdOpen(null); setNewPwd(""); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Redefinir senha de {pwdOpen?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Por segurança, senhas são criptografadas e não podem ser visualizadas. Defina uma nova senha provisória e informe ao funcionário.
            </p>
            <div>
              <Label>Nova senha (mín. 6 caracteres)</Label>
              <Input type="text" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="Nova senha" />
            </div>
            <Button onClick={resetPassword} className="w-full gradient-primary text-primary-foreground border-0">Redefinir senha</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={posOpen} onOpenChange={setPosOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cargos</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Novo cargo" value={newPosName} onChange={(e) => setNewPosName(e.target.value)} />
              <Button onClick={addPosition}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-2">
              {positions.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded border">
                  <span>{p.name}</span>
                  <Button size="icon" variant="ghost" onClick={() => deletePosition(p.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              {positions.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">Nenhum cargo</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
