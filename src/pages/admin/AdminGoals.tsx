import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Plus, Trophy, Users, User, Wand2 } from "lucide-react";
import { monthNames } from "@/lib/payroll";

export default function AdminGoals() {
  const { user, role } = useAuth();
  const now = new Date();
  const [list, setList] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [scope, setScope] = useState<"individual" | "team" | "company">("individual");
  const [targetUser, setTargetUser] = useState<string>("");
  const [targetTeam, setTargetTeam] = useState<string>("");
  const [busy, setBusy] = useState(false);

  // Distribuição da meta da empresa entre equipes
  const [distTitle, setDistTitle] = useState("");
  const [distDesc, setDistDesc] = useState("");
  const [distMonth, setDistMonth] = useState(now.getMonth() + 1);
  const [distYear, setDistYear] = useState(now.getFullYear());
  const [distTotal, setDistTotal] = useState<number>(0);
  const [distAlloc, setDistAlloc] = useState<Record<string, number>>({});
  const [distBusy, setDistBusy] = useState(false);

  const load = async () => {
    const [{ data: g }, { data: t }, { data: p }] = await Promise.all([
      supabase.from("goals").select("*").order("reference_year", { ascending: false }).order("reference_month", { ascending: false }),
      supabase.from("teams").select("*").order("name"),
      supabase.from("profiles").select("id,full_name,team_id").eq("active", true).order("full_name"),
    ]);
    setList(g ?? []);
    setTeams(t ?? []);
    setProfiles(p ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const payload: any = {
      title: f.get("title") as string,
      description: f.get("description") as string,
      reference_month: Number(f.get("month")),
      reference_year: Number(f.get("year")),
      target_value: Number(f.get("target")),
      current_value: 0,
      scope,
      created_by: user?.id,
      user_id: scope === "individual" ? targetUser || null : null,
      team_id: scope === "team" ? targetTeam || null : null,
    };
    if (scope === "individual" && !targetUser) { setBusy(false); return toast.error("Selecione a funcionária"); }
    if (scope === "team" && !targetTeam) { setBusy(false); return toast.error("Selecione a equipe"); }
    const { error } = await supabase.from("goals").insert(payload);
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Meta criada"); (e.target as HTMLFormElement).reset(); setTargetUser(""); setTargetTeam(""); load(); }
  };

  const updateCurrent = async (id: string, value: number) => {
    await supabase.from("goals").update({ current_value: value }).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("goals").delete().eq("id", id);
    toast.success("Removida"); load();
  };

  const labelFor = (g: any) => {
    if (g.scope === "company") return "🏢 Empresa";
    if (g.scope === "team") return "👥 " + (teams.find((t) => t.id === g.team_id)?.name ?? "Equipe");
    return "👤 " + (profiles.find((p) => p.id === g.user_id)?.full_name ?? "Individual");
  };

  const distSum = Object.values(distAlloc).reduce((s, v) => s + (Number(v) || 0), 0);
  const distRemaining = Number(distTotal || 0) - distSum;

  const autoDistribute = () => {
    if (!teams.length || !distTotal) return;
    const each = Math.floor((Number(distTotal) / teams.length) * 100) / 100;
    const map: Record<string, number> = {};
    teams.forEach((t, idx) => {
      map[t.id] = idx === teams.length - 1
        ? Math.round((Number(distTotal) - each * (teams.length - 1)) * 100) / 100
        : each;
    });
    setDistAlloc(map);
  };

  const submitDistribution = async () => {
    if (!distTitle.trim()) return toast.error("Informe o título");
    if (!distTotal || distTotal <= 0) return toast.error("Informe a meta total");
    if (Math.abs(distRemaining) > 0.01) return toast.error(`A soma (${distSum.toLocaleString("pt-BR")}) deve ser igual à meta total (${Number(distTotal).toLocaleString("pt-BR")})`);
    setDistBusy(true);
    // 1) Empresa
    const { error: cErr } = await supabase.from("goals").insert({
      title: distTitle, description: distDesc || null,
      reference_month: distMonth, reference_year: distYear,
      target_value: Number(distTotal), current_value: 0,
      scope: "company", created_by: user?.id,
    });
    if (cErr) { setDistBusy(false); return toast.error(cErr.message); }
    // 2) Equipes
    const rows = teams
      .filter((t) => Number(distAlloc[t.id] || 0) > 0)
      .map((t) => ({
        title: distTitle, description: distDesc || null,
        reference_month: distMonth, reference_year: distYear,
        target_value: Number(distAlloc[t.id]), current_value: 0,
        scope: "team" as const, team_id: t.id, created_by: user?.id,
      }));
    if (rows.length) {
      const { error: tErr } = await supabase.from("goals").insert(rows);
      if (tErr) { setDistBusy(false); return toast.error(tErr.message); }
    }
    setDistBusy(false);
    toast.success("Meta da empresa distribuída entre as equipes!");
    setDistTitle(""); setDistDesc(""); setDistTotal(0); setDistAlloc({});
    load();
  };

  // Aggregated team progress (sum of individual goals in same month/year)
  const teamAggregate = (teamId: string, month: number, year: number) => {
    const members = profiles.filter((p) => p.team_id === teamId).map((p) => p.id);
    const goals = list.filter((g) => g.scope === "individual" && members.includes(g.user_id) && g.reference_month === month && g.reference_year === year);
    const target = goals.reduce((s, g) => s + Number(g.target_value || 0), 0);
    const current = goals.reduce((s, g) => s + Number(g.current_value || 0), 0);
    return { target, current, pct: target > 0 ? Math.min(100, (current / target) * 100) : 0 };
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Metas</h1>

      {role === "admin" && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Nova meta</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Tipo de meta</Label>
                <Select value={scope} onValueChange={(v: any) => setScope(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual"><User className="h-3 w-3 inline mr-1" /> Individual (uma funcionária)</SelectItem>
                    <SelectItem value="team"><Users className="h-3 w-3 inline mr-1" /> Equipe (meta-alvo da equipe)</SelectItem>
                    <SelectItem value="company"><Trophy className="h-3 w-3 inline mr-1" /> Empresa toda</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {scope === "individual" && (
                <div className="sm:col-span-2"><Label>Funcionária</Label>
                  <Select value={targetUser} onValueChange={setTargetUser}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>{profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              {scope === "team" && (
                <div className="sm:col-span-2"><Label>Equipe</Label>
                  <Select value={targetTeam} onValueChange={setTargetTeam}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>{teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div className="sm:col-span-2"><Label>Título</Label><Input name="title" required maxLength={100} /></div>
              <div className="sm:col-span-2"><Label>Descrição</Label><Textarea name="description" rows={2} maxLength={300} /></div>
              <div><Label>Mês</Label>
                <Select name="month" defaultValue={String(now.getMonth() + 1)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{monthNames.map((n, i) => <SelectItem key={i} value={String(i + 1)}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Ano</Label><Input name="year" type="number" defaultValue={now.getFullYear()} required /></div>
              <div><Label>Valor alvo</Label><Input name="target" type="number" step="0.01" required /></div>
              <div className="flex items-end">
                <Button type="submit" disabled={busy} className="w-full gradient-primary text-primary-foreground border-0">Criar meta</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Team aggregate panels */}
      {teams.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Soma das metas individuais por equipe — {monthNames[now.getMonth()]}/{now.getFullYear()}</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {teams.map((t) => {
              const a = teamAggregate(t.id, now.getMonth() + 1, now.getFullYear());
              return (
                <div key={t.id} className="p-3 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ background: t.color }} />{t.name}
                    </span>
                    <span className="text-sm font-bold text-primary">{a.pct.toFixed(0)}%</span>
                  </div>
                  <Progress value={a.pct} className="h-2" />
                  <p className="text-xs text-muted-foreground">{a.current.toLocaleString("pt-BR")} / {a.target.toLocaleString("pt-BR")}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {list.map((g) => {
          const pct = g.target_value > 0 ? Math.min(100, (Number(g.current_value) / Number(g.target_value)) * 100) : 0;
          return (
            <Card key={g.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{g.title}</CardTitle>
                    <Badge variant="outline" className="text-xs">{labelFor(g)}</Badge>
                  </div>
                  {role === "admin" && (
                    <Button size="icon" variant="ghost" onClick={() => remove(g.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{monthNames[g.reference_month - 1]}/{g.reference_year}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {g.description && <p className="text-sm text-muted-foreground">{g.description}</p>}
                <Progress value={pct} className="h-3" />
                <div className="flex items-center gap-2">
                  <Input type="number" defaultValue={g.current_value} className="h-8"
                    onBlur={(e) => updateCurrent(g.id, Number(e.target.value))} />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">/ {Number(g.target_value).toLocaleString("pt-BR")}</span>
                </div>
                <p className="text-right text-sm font-bold text-primary">{pct.toFixed(0)}%</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
