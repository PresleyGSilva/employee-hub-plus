import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Trophy, Users, Medal, Crown } from "lucide-react";
import { monthNames } from "@/lib/payroll";

export default function Goals() {
  const { user } = useAuth();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const [goals, setGoals] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: g }, { data: t }, { data: p }, { data: me }] = await Promise.all([
        supabase.from("goals").select("*").eq("reference_month", month).eq("reference_year", year),
        supabase.from("teams").select("*"),
        supabase.from("profiles").select("id,full_name,team_id,avatar_url").eq("active", true),
        user ? supabase.from("profiles").select("team_id").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null } as any),
      ]);
      setGoals(g ?? []);
      setTeams(t ?? []);
      setProfiles(p ?? []);
      setMyTeamId(me?.team_id ?? null);
    })();
  }, [user]);

  const myGoals = goals.filter((g) => g.scope === "individual" && g.user_id === user?.id);
  const myTeamGoals = goals.filter((g) => g.scope === "team" && g.team_id === myTeamId);
  const companyGoals = goals.filter((g) => g.scope === "company");

  // Individual ranking (all individual goals)
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

  // Team ranking based on aggregated individual goals
  const teamRanking = teams.map((t) => {
    const memberIds = profiles.filter((p) => p.team_id === t.id).map((p) => p.id);
    const tg = goals.filter((g) => g.scope === "individual" && memberIds.includes(g.user_id));
    const target = tg.reduce((s, g) => s + Number(g.target_value || 0), 0);
    const current = tg.reduce((s, g) => s + Number(g.current_value || 0), 0);
    return { ...t, current, target, pct: target > 0 ? (current / target) * 100 : 0, members: memberIds.length };
  }).sort((a, b) => b.pct - a.pct);

  const myRank = indvList.findIndex((r) => r.user_id === user?.id) + 1;
  const myEntry = indvList.find((r) => r.user_id === user?.id);
  const myTeamRank = myTeamId ? teamRanking.findIndex((t) => t.id === myTeamId) + 1 : 0;

  const medalIcon = (i: number) => i === 0 ? <Crown className="h-4 w-4 text-warning" /> : i === 1 ? <Medal className="h-4 w-4 text-muted-foreground" /> : i === 2 ? <Medal className="h-4 w-4 text-accent" /> : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Metas</h1>
        <p className="text-muted-foreground">{monthNames[now.getMonth()]}/{year}</p>
      </div>

      {/* Highlight cards */}
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
            <p className="text-xs text-muted-foreground">{teams.find((t) => t.id === myTeamId)?.name ?? "—"}</p>
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
        <TabsList>
          <TabsTrigger value="me"><Target className="h-4 w-4 mr-1" /> Minhas metas</TabsTrigger>
          <TabsTrigger value="team"><Users className="h-4 w-4 mr-1" /> Minha equipe</TabsTrigger>
          <TabsTrigger value="ranking"><Trophy className="h-4 w-4 mr-1" /> Ranking</TabsTrigger>
        </TabsList>

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
          {!myTeamId && <Card><CardContent className="py-12 text-center text-muted-foreground">Você ainda não está em uma equipe</CardContent></Card>}
          {myTeamId && (
            <>
              {/* Aggregated team progress */}
              {(() => {
                const t = teamRanking.find((x) => x.id === myTeamId);
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
                        {indvList.filter((r) => r.teamId === myTeamId).map((r, i) => (
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

        <TabsContent value="ranking" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Equipes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {teamRanking.map((t, i) => (
                <div key={t.id} className={`p-3 rounded-lg border ${t.id === myTeamId ? "border-primary/50 bg-primary/5" : ""}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold flex items-center gap-2">
                      {medalIcon(i)}<span>{i + 1}º</span>
                      <span className="h-3 w-3 rounded-full" style={{ background: t.color }} />
                      {t.name} {t.id === myTeamId && <Badge variant="outline">Sua equipe</Badge>}
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
