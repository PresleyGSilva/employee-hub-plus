import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Plus, Users } from "lucide-react";
import { getTeamEmblem } from "@/lib/teamEmblems";

export default function Teams() {
  const [teams, setTeams] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [members, setMembers] = useState<Record<string, any[]>>({});
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [supervisor, setSupervisor] = useState<string>("");

  const load = async () => {
    const [{ data: t }, { data: p }] = await Promise.all([
      supabase.from("teams").select("*").order("name"),
      supabase.from("profiles").select("id,full_name,team_id,avatar_url").eq("active", true).order("full_name"),
    ]);
    setTeams(t ?? []);
    setProfiles(p ?? []);
    const m: Record<string, any[]> = {};
    (p ?? []).forEach((u) => { if (u.team_id) (m[u.team_id] ??= []).push(u); });
    setMembers(m);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name.trim()) return toast.error("Nome obrigatório");
    const { data, error } = await supabase.from("teams").insert({
      name: name.trim(), color, supervisor_id: supervisor || null,
    }).select().single();
    if (error) return toast.error(error.message);
    // promote supervisor role
    if (supervisor) {
      await supabase.from("user_roles").insert({ user_id: supervisor, role: "supervisor" as any });
    }
    toast.success("Equipe criada");
    setName(""); setSupervisor(""); load();
  };

  const remove = async (id: string) => {
    await supabase.from("teams").delete().eq("id", id);
    toast.success("Equipe removida"); load();
  };

  const assignMember = async (userId: string, teamId: string | null) => {
    await supabase.from("profiles").update({ team_id: teamId }).eq("id", userId);
    load();
  };

  const setTeamSupervisor = async (teamId: string, userId: string | null) => {
    await supabase.from("teams").update({ supervisor_id: userId }).eq("id", teamId);
    if (userId) await supabase.from("user_roles").insert({ user_id: userId, role: "supervisor" as any }).then(() => {});
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Equipes</h1>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Nova equipe</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Equipe Azul" /></div>
          <div><Label>Cor</Label><Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-full" /></div>
          <div>
            <Label>Supervisora</Label>
            <Select value={supervisor} onValueChange={setSupervisor}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>{profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-4">
            <Button onClick={create} className="gradient-primary text-primary-foreground border-0">Criar equipe</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {teams.map((t) => (
          <Card key={t.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-3 text-xl">
                  {getTeamEmblem(t.name) ? (
                    <img src={getTeamEmblem(t.name)!} alt={`Emblema ${t.name}`} loading="lazy" width={64} height={64} className="h-16 w-16 object-contain drop-shadow-md" />
                  ) : (
                    <span className="h-4 w-4 rounded-full" style={{ background: t.color }} />
                  )}
                  {t.name}
                </CardTitle>
                <Button size="icon" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Supervisora</Label>
                <Select value={t.supervisor_id ?? ""} onValueChange={(v) => setTeamSupervisor(t.id, v || null)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1"><Users className="h-3 w-3" /> Membros ({members[t.id]?.length ?? 0})</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(members[t.id] ?? []).map((m) => (
                    <Badge key={m.id} variant="secondary" className="cursor-pointer" onClick={() => assignMember(m.id, null)} title="Clique para remover">
                      {m.full_name} ✕
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs">Adicionar funcionária</Label>
                <Select value="" onValueChange={(v) => assignMember(v, t.id)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar funcionária" /></SelectTrigger>
                  <SelectContent>
                    {profiles.filter((p) => !p.team_id).map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}
        {teams.length === 0 && (
          <Card className="md:col-span-2"><CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-30" /> Nenhuma equipe criada
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}
