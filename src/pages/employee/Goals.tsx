import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, Trophy, Users, Medal, Crown, Wand2, Plus, TrendingUp, Save, ShoppingBag, CheckCircle2, XCircle, Clock } from "lucide-react";
import { monthNames } from "@/lib/payroll";
import { toast } from "sonner";

export default function Goals() {
  const { user, role } = useAuth();
  const now = new Date();
  const [refMonth, setRefMonth] = useState(now.getMonth() + 1);
  const [refYear, setRefYear] = useState(now.getFullYear());
  const [goals, setGoals] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);

  // Supervisor distribution form
  const [distTitle, setDistTitle] = useState("");
  const [distDesc, setDistDesc] = useState("");
  const [distTotal, setDistTotal] = useState<number>(0);
  const [distAlloc, setDistAlloc] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [{ data: g }, { data: t }, { data: p }, { data: me }] = await Promise.all([
      supabase.from("goals").select("*").eq("reference_month", refMonth).eq("reference_year", refYear),
      supabase.from("teams").select("*"),
      supabase.from("profiles").select("id,full_name,team_id,avatar_url").eq("active", true),
      user ? supabase.from("profiles").select("team_id").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null } as any),
    ]);
    setGoals(g ?? []);
    setTeams(t ?? []);
    setProfiles(p ?? []);
    setMyTeamId(me?.team_id ?? null);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user, refMonth, refYear]);

  const supervisedTeam = teams.find((t) => t.supervisor_id === user?.id);
  const activeTeamId = supervisedTeam?.id ?? myTeamId;
  const myGoals = goals.filter((g) => g.scope === "individual" && g.user_id === user?.id);
  const myTeamGoals = goals.filter((g) => g.scope === "team" && g.team_id === activeTeamId);
  const companyGoals = goals.filter((g) => g.scope === "company");

  const individualRanking = goals
    .filter((g) => g.scope === "individual")
    .reduce<Record<string, { user_id: string; current: number; target: number }>>((acc, g) => {
      acc[g.user_id] ??= { user_id: g.user_id, current: 0, target: 0 };
      acc[g.user_id].current += Number(g.current_value || 0);
      acc[g.user_id].target += Number(g.target_value || 0);
      return acc;
    }, {});
  const indvList = Object.values(individualRanking)
    .map((r) => ({ ...r, pct: r.target > 0 ? (r.current / r.target) * 100 : 0, name: profiles.find((p) => p.id === r.user_id)?.full_name ?? "—", teamId: profiles.find((p) => p.id === r.user_id)?.team_id }))
    .sort((a, b) => b.pct - a.pct);

  const teamRanking = teams.map((t) => {
    const memberIds = profiles.filter((p) => p.team_id === t.id).map((p) => p.id);
    const tg = goals.filter((g) => g.scope === "individual" && memberIds.includes(g.user_id));
    const target = tg.reduce((s, g) => s + Number(g.target_value || 0), 0);
    const current = tg.reduce((s, g) => s + Number(g.current_value || 0), 0);
    return { ...t, current, target, pct: target > 0 ? (current / target) * 100 : 0, members: memberIds.length };
  }).sort((a, b) => b.pct - a.pct);

  const myRank = indvList.findIndex((r) => r.user_id === user?.id) + 1;
  const myEntry = indvList.find((r) => r.user_id === user?.id);
  const myTeamRank = activeTeamId ? teamRanking.findIndex((t) => t.id === activeTeamId) + 1 : 0;

  const medalIcon = (i: number) => i === 0 ? <Crown className="h-4 w-4 text-warning" /> : i === 1 ? <Medal className="h-4 w-4 text-muted-foreground" /> : i === 2 ? <Medal className="h-4 w-4 text-accent" /> : null;

  // Supervisor: members of my team
  const myTeam = teams.find((t) => t.id === activeTeamId);
  const isSupervisor = role === "supervisor";
  const isEmployee = role === "employee";
  const teamMembers = profiles.filter((p) => p.team_id === activeTeamId);

  const distSum = Object.values(distAlloc).reduce((s, v) => s + (Number(v) || 0), 0);
  const distRemaining = Number(distTotal || 0) - distSum;

  const autoDistribute = () => {
    if (!teamMembers.length || !distTotal) return;
    const each = Math.floor((Number(distTotal) / teamMembers.length) * 100) / 100;
    const map: Record<string, number> = {};
    teamMembers.forEach((m, idx) => {
      map[m.id] = idx === teamMembers.length - 1
        ? Math.round((Number(distTotal) - each * (teamMembers.length - 1)) * 100) / 100
        : each;
    });
    setDistAlloc(map);
  };

  const submitDistribution = async () => {
    if (!activeTeamId) return toast.error("Vincule uma equipe para esta supervisora antes de distribuir metas");
    if (!distTitle.trim()) return toast.error("Informe o título");
    if (!distTotal || distTotal <= 0) return toast.error("Informe a meta total");
    if (Math.abs(distRemaining) > 0.01) return toast.error(`A soma da distribuição (${distSum.toLocaleString("pt-BR")}) deve ser igual à meta total (${Number(distTotal).toLocaleString("pt-BR")})`);
    setBusy(true);

    // 1) Team goal
    const { error: teamErr } = await supabase.from("goals").insert({
      title: distTitle,
      description: distDesc || null,
      reference_month: refMonth,
      reference_year: refYear,
      target_value: Number(distTotal),
      current_value: 0,
      scope: "team",
      team_id: activeTeamId,
      created_by: user?.id,
    });
    if (teamErr) { setBusy(false); return toast.error(teamErr.message); }

    // 2) Individual goals
    const rows = teamMembers
      .filter((m) => Number(distAlloc[m.id] || 0) > 0)
      .map((m) => ({
        title: distTitle,
        description: distDesc || null,
        reference_month: refMonth,
        reference_year: refYear,
        target_value: Number(distAlloc[m.id]),
        current_value: 0,
        scope: "individual" as const,
        user_id: m.id,
        created_by: user?.id,
      }));
    if (rows.length) {
      const { error: indErr } = await supabase.from("goals").insert(rows);
      if (indErr) { setBusy(false); return toast.error(indErr.message); }
    }

    setBusy(false);
    toast.success("Meta da equipe distribuída!");
    setDistTitle(""); setDistDesc(""); setDistTotal(0); setDistAlloc({});
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Metas</h1>
          <p className="text-muted-foreground">{monthNames[refMonth - 1]}/{refYear}</p>
        </div>
        <div className="flex gap-2">
          <Select value={String(refMonth)} onValueChange={(v) => setRefMonth(Number(v))}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{monthNames.map((n, i) => <SelectItem key={i} value={String(i + 1)}>{n}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="number" value={refYear} onChange={(e) => setRefYear(Number(e.target.value))} className="w-24" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-primary/30">
          <CardContent className="p-5">
            <p className="text-xs uppercase text-muted-foreground tracking-wider">Sua posição</p>
            <p className="text-3xl font-bold text-primary mt-1">{myRank > 0 ? `${myRank}º` : "—"}</p>
            <p className="text-xs text-muted-foreground">de {indvList.length} participantes</p>
            {myEntry && <Progress value={Math.min(100, myEntry.pct)} className="h-2 mt-2" />}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase text-muted-foreground tracking-wider">Sua equipe</p>
            <p className="text-2xl font-bold mt-1">{myTeamRank > 0 ? `${myTeamRank}º lugar` : "Sem equipe"}</p>
            <p className="text-xs text-muted-foreground">{myTeam?.name ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase text-muted-foreground tracking-wider">Meta pessoal</p>
            <p className="text-3xl font-bold text-success mt-1">{myEntry ? `${Math.min(100, myEntry.pct).toFixed(0)}%` : "0%"}</p>
            <p className="text-xs text-muted-foreground">{myEntry?.current.toLocaleString("pt-BR") ?? 0} / {myEntry?.target.toLocaleString("pt-BR") ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="me">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="me"><Target className="h-4 w-4 mr-1" /> Minhas metas</TabsTrigger>
          <TabsTrigger value="sales"><ShoppingBag className="h-4 w-4 mr-1" /> Minhas vendas</TabsTrigger>
          <TabsTrigger value="team"><Users className="h-4 w-4 mr-1" /> Minha equipe</TabsTrigger>
          <TabsTrigger value="top"><Trophy className="h-4 w-4 mr-1" /> Top 10</TabsTrigger>
          {isSupervisor && <TabsTrigger value="distribute"><Wand2 className="h-4 w-4 mr-1" /> Distribuir meta</TabsTrigger>}
          {isSupervisor && <TabsTrigger value="verify"><CheckCircle2 className="h-4 w-4 mr-1" /> Verificar vendas</TabsTrigger>}
          {!isEmployee && <TabsTrigger value="ranking"><Trophy className="h-4 w-4 mr-1" /> Ranking</TabsTrigger>}
        </TabsList>

        <TabsContent value="sales" className="mt-4">
          <MySalesPanel userId={user?.id ?? ""} myGoals={myGoals} />
        </TabsContent>

        <TabsContent value="top" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-warning" /> Top 10 consultoras</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {indvList.slice(0, 10).map((r, i) => (
                <div key={r.user_id} className={`flex items-center justify-between p-2 rounded-lg ${r.user_id === user?.id ? "bg-primary/10 border border-primary/30" : ""}`}>
                  <span className="flex items-center gap-2 text-sm">
                    {medalIcon(i)}<span className="font-semibold">{i + 1}º</span>
                    <span>{r.name}{r.user_id === user?.id && " (você)"}</span>
                  </span>
                  <Badge variant={r.pct >= 100 ? "default" : "secondary"}>{Math.min(100, r.pct).toFixed(0)}%</Badge>
                </div>
              ))}
              {indvList.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Sem metas ainda</p>}
              {myRank > 10 && myEntry && (
                <div className="mt-3 pt-3 border-t flex items-center justify-between p-2 rounded-lg bg-primary/10">
                  <span className="text-sm font-semibold">Sua posição: {myRank}º</span>
                  <Badge>{Math.min(100, myEntry.pct).toFixed(0)}%</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="me" className="space-y-4 mt-4">
          {myGoals.length === 0 && <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma meta individual definida</CardContent></Card>}
          {myGoals.map((g) => {
            const pct = g.target_value > 0 ? Math.min(100, (Number(g.current_value) / Number(g.target_value)) * 100) : 0;
            return (
              <Card key={g.id}>
                <CardHeader><CardTitle className="text-lg">{g.title}</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {g.description && <p className="text-sm text-muted-foreground">{g.description}</p>}
                  <Progress value={pct} className="h-3" />
                  <div className="flex justify-between text-sm">
                    <span>{Number(g.current_value).toLocaleString("pt-BR")} / {Number(g.target_value).toLocaleString("pt-BR")}</span>
                    <span className="font-bold text-primary">{pct.toFixed(0)}%</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="team" className="space-y-4 mt-4">
          {!activeTeamId && <Card><CardContent className="py-12 text-center text-muted-foreground">Você ainda não está em uma equipe</CardContent></Card>}
          {activeTeamId && (
            <>
              {(() => {
                const t = teamRanking.find((x) => x.id === activeTeamId);
                if (!t) return null;
                return (
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: t.color }} />{t.name}</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <Progress value={Math.min(100, t.pct)} className="h-3" />
                      <div className="flex justify-between text-sm">
                        <span>{t.current.toLocaleString("pt-BR")} / {t.target.toLocaleString("pt-BR")} (soma)</span>
                        <span className="font-bold text-primary">{t.pct.toFixed(0)}%</span>
                      </div>
                      <div className="space-y-2 pt-2 border-t">
                        <p className="text-xs uppercase text-muted-foreground tracking-wider">Ranking interno</p>
                        {indvList.filter((r) => r.teamId === activeTeamId).map((r, i) => (
                          <div key={r.user_id} className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                              {medalIcon(i)}<span className="font-medium">{i + 1}º {r.name}{r.user_id === user?.id && " (você)"}</span>
                            </span>
                            <Badge variant={r.pct >= 100 ? "default" : "secondary"}>{Math.min(100, r.pct).toFixed(0)}%</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
              {myTeamGoals.map((g) => {
                const pct = g.target_value > 0 ? Math.min(100, (Number(g.current_value) / Number(g.target_value)) * 100) : 0;
                return (
                  <Card key={g.id}>
                    <CardHeader><CardTitle className="text-lg">🎯 {g.title}</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      <Progress value={pct} className="h-3" />
                      <p className="text-right text-sm font-bold text-primary">{pct.toFixed(0)}%</p>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </TabsContent>

        {isSupervisor && (
          <TabsContent value="distribute" className="space-y-4 mt-4">
            {(companyGoals.length > 0 || myTeamGoals.length > 0) && (
              <Card className="border-primary/30">
                <CardHeader><CardTitle className="text-base">📥 Metas recebidas para distribuir</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {companyGoals.map((g) => (
                    <div key={g.id} className="flex items-center justify-between p-2 rounded border">
                      <div>
                        <p className="text-sm font-semibold">🏢 {g.title} <span className="text-xs text-muted-foreground">(empresa)</span></p>
                        <p className="text-xs text-muted-foreground">Meta total: {Number(g.target_value).toLocaleString("pt-BR")}</p>
                      </div>
                    </div>
                  ))}
                  {myTeamGoals.map((g) => (
                    <div key={g.id} className="flex items-center justify-between p-2 rounded border">
                      <div>
                        <p className="text-sm font-semibold">👥 {g.title} <span className="text-xs text-muted-foreground">(sua equipe)</span></p>
                        <p className="text-xs text-muted-foreground">Sua parte: {Number(g.target_value).toLocaleString("pt-BR")}</p>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => { setDistTitle(g.title); setDistDesc(g.description || ""); setDistTotal(Number(g.target_value)); }}>
                        Usar esta meta
                      </Button>
                    </div>
                  ))}
                  {companyGoals.length === 0 && myTeamGoals.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-3">Nenhuma meta recebida ainda. Aguarde o administrador distribuir.</p>
                  )}
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5" /> Distribuir meta para a equipe {myTeam?.name}</CardTitle>
                <p className="text-sm text-muted-foreground">Defina a meta total da equipe e quanto cada membro precisa entregar. A soma das partes deve ser igual ao total.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2"><Label>Título</Label><Input value={distTitle} onChange={(e) => setDistTitle(e.target.value)} placeholder="Ex.: Meta de vendas" /></div>
                  <div className="sm:col-span-2"><Label>Descrição (opcional)</Label><Textarea rows={2} value={distDesc} onChange={(e) => setDistDesc(e.target.value)} /></div>
                  <div><Label>Meta total da equipe</Label><Input type="number" step="0.01" value={distTotal || ""} onChange={(e) => setDistTotal(Number(e.target.value))} /></div>
                  <div className="flex items-end"><Button type="button" variant="secondary" onClick={autoDistribute} className="w-full"><Wand2 className="h-4 w-4 mr-1" /> Distribuir igualmente</Button></div>
                </div>

                <div className="space-y-2 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Distribuição por membro ({teamMembers.length})</p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Soma: </span>
                      <span className="font-bold">{distSum.toLocaleString("pt-BR")}</span>
                      <span className={`ml-2 font-bold ${Math.abs(distRemaining) < 0.01 ? "text-success" : "text-destructive"}`}>
                        ({distRemaining >= 0 ? "+" : ""}{distRemaining.toLocaleString("pt-BR")})
                      </span>
                    </p>
                  </div>
                  {teamMembers.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Nenhum membro na equipe ainda.</p>}
                  {teamMembers.map((m) => {
                    const v = Number(distAlloc[m.id] || 0);
                    const pct = distTotal > 0 ? (v / Number(distTotal)) * 100 : 0;
                    return (
                      <div key={m.id} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg border">
                        <div className="col-span-12 sm:col-span-5 font-medium text-sm">{m.full_name}</div>
                        <div className="col-span-7 sm:col-span-4">
                          <Input type="number" step="0.01" value={distAlloc[m.id] ?? ""} placeholder="0,00"
                            onChange={(e) => setDistAlloc((s) => ({ ...s, [m.id]: Number(e.target.value) }))} />
                        </div>
                        <div className="col-span-5 sm:col-span-3 text-right text-sm font-semibold text-primary">{pct.toFixed(1)}%</div>
                      </div>
                    );
                  })}
                </div>

                <Button onClick={submitDistribution} disabled={busy || !teamMembers.length} className="w-full gradient-primary text-primary-foreground border-0">
                  <Plus className="h-4 w-4 mr-1" /> Criar meta da equipe e distribuir
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isSupervisor && (
          <TabsContent value="verify" className="space-y-4 mt-4">
            <SupervisorVerifyPanel teamMemberIds={teamMembers.map((m) => m.id)} members={teamMembers} onChanged={load} />
          </TabsContent>
        )}

        <TabsContent value="ranking" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Equipes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {teamRanking.map((t, i) => (
                  <div key={t.id} className={`p-3 rounded-lg border ${t.id === activeTeamId ? "border-primary/50 bg-primary/5" : ""}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold flex items-center gap-2">
                      {medalIcon(i)}<span>{i + 1}º</span>
                      <span className="h-3 w-3 rounded-full" style={{ background: t.color }} />
                      {t.name} {t.id === activeTeamId && <Badge variant="outline">Sua equipe</Badge>}
                    </span>
                    <span className="font-bold text-primary">{t.pct.toFixed(0)}%</span>
                  </div>
                  <Progress value={Math.min(100, t.pct)} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">{t.members} membros · {t.current.toLocaleString("pt-BR")} / {t.target.toLocaleString("pt-BR")}</p>
                </div>
              ))}
              {teamRanking.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhuma equipe</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-warning" /> Top consultoras</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {indvList.slice(0, 20).map((r, i) => (
                <div key={r.user_id} className={`flex items-center justify-between p-2 rounded-lg ${r.user_id === user?.id ? "bg-primary/10" : ""}`}>
                  <span className="flex items-center gap-2 text-sm">
                    {medalIcon(i)}<span className="font-semibold">{i + 1}º</span>
                    <span>{r.name}{r.user_id === user?.id && " (você)"}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground hidden sm:inline">{r.current.toLocaleString("pt-BR")} / {r.target.toLocaleString("pt-BR")}</span>
                    <Badge variant={r.pct >= 100 ? "default" : "secondary"}>{Math.min(100, r.pct).toFixed(0)}%</Badge>
                  </div>
                </div>
              ))}
              {indvList.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Sem metas ainda</p>}
            </CardContent>
          </Card>

          {companyGoals.length > 0 && (
            <Card>
              <CardHeader><CardTitle>🏢 Metas da empresa</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {companyGoals.map((g) => {
                  const pct = g.target_value > 0 ? Math.min(100, (Number(g.current_value) / Number(g.target_value)) * 100) : 0;
                  return (
                    <div key={g.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{g.title}</span>
                        <span className="font-bold text-primary">{pct.toFixed(0)}%</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UpdateSalesPanel({ teamGoals, members, individualGoals, onSaved }: { teamGoals: any[]; members: any[]; individualGoals: any[]; onSaved: () => void }) {
  const [values, setValues] = useState<Record<string, number>>({});
  const [teamValues, setTeamValues] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const init: Record<string, number> = {};
    individualGoals.forEach((g) => { init[g.id] = Number(g.current_value || 0); });
    setValues(init);
    const tinit: Record<string, number> = {};
    teamGoals.forEach((g) => { tinit[g.id] = Number(g.current_value || 0); });
    setTeamValues(tinit);
  }, [individualGoals, teamGoals]);

  const save = async () => {
    setBusy(true);
    const updates: PromiseLike<any>[] = [];
    for (const g of individualGoals) {
      const v = Number(values[g.id] ?? 0);
      if (v !== Number(g.current_value || 0)) {
        updates.push(supabase.from("goals").update({ current_value: v }).eq("id", g.id).then((r) => r));
      }
    }
    for (const g of teamGoals) {
      const v = Number(teamValues[g.id] ?? 0);
      if (v !== Number(g.current_value || 0)) {
        updates.push(supabase.from("goals").update({ current_value: v }).eq("id", g.id).then((r) => r));
      }
    }
    const res = await Promise.all(updates);
    const err = res.find((r: any) => r?.error)?.error;
    setBusy(false);
    if (err) return toast.error(err.message);
    toast.success("Vendas atualizadas!");
    onSaved();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Atualizar vendas (semanal)</CardTitle>
        <p className="text-sm text-muted-foreground">Toda sexta-feira, registre o quanto a equipe e cada consultora venderam no mês.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {teamGoals.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Meta da equipe</p>
            {teamGoals.map((g) => {
              const v = Number(teamValues[g.id] ?? 0);
              const pct = g.target_value > 0 ? (v / Number(g.target_value)) * 100 : 0;
              return (
                <div key={g.id} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg border">
                  <div className="col-span-12 sm:col-span-5 text-sm font-medium">🎯 {g.title}<div className="text-xs text-muted-foreground">Meta: {Number(g.target_value).toLocaleString("pt-BR")}</div></div>
                  <div className="col-span-7 sm:col-span-4">
                    <Input type="number" step="0.01" value={teamValues[g.id] ?? ""} onChange={(e) => setTeamValues((s) => ({ ...s, [g.id]: Number(e.target.value) }))} />
                  </div>
                  <div className="col-span-5 sm:col-span-3 text-right text-sm font-bold text-primary">{Math.min(100, pct).toFixed(0)}%</div>
                </div>
              );
            })}
          </div>
        )}

        <div className="space-y-2 pt-3 border-t">
          <p className="text-sm font-semibold">Vendas por consultora</p>
          {individualGoals.length === 0 && <p className="text-sm text-muted-foreground py-3 text-center">Nenhuma meta individual ainda. Distribua a meta primeiro.</p>}
          {individualGoals.map((g) => {
            const member = members.find((m) => m.id === g.user_id);
            const v = Number(values[g.id] ?? 0);
            const pct = g.target_value > 0 ? (v / Number(g.target_value)) * 100 : 0;
            return (
              <div key={g.id} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg border">
                <div className="col-span-12 sm:col-span-5 text-sm font-medium">{member?.full_name ?? "—"}<div className="text-xs text-muted-foreground">Meta: {Number(g.target_value).toLocaleString("pt-BR")}</div></div>
                <div className="col-span-7 sm:col-span-4">
                  <Input type="number" step="0.01" value={values[g.id] ?? ""} onChange={(e) => setValues((s) => ({ ...s, [g.id]: Number(e.target.value) }))} />
                </div>
                <div className="col-span-5 sm:col-span-3 text-right text-sm font-bold text-primary">{Math.min(100, pct).toFixed(0)}%</div>
              </div>
            );
          })}
        </div>

        <Button onClick={save} disabled={busy} className="w-full gradient-primary text-primary-foreground border-0">
          <Save className="h-4 w-4 mr-1" /> Salvar vendas
        </Button>
      </CardContent>
    </Card>
  );
}
