import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Crown, Trophy, Medal, Sparkles, Users, TrendingUp } from "lucide-react";
import { getTeamEmblem } from "@/lib/teamEmblems";

interface Consultora {
  user_id: string; full_name: string | null; avatar_url: string | null;
  team_id: string | null; team_name: string | null; team_color: string | null;
  total: number; entries_count: number;
}
interface Equipe {
  team_id: string; team_name: string; team_color: string | null;
  total: number; members_count: number; entries_count: number;
}

const fmtBRL = (n: number) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const initials = (name?: string | null) =>
  (name || "?").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

function Podium({ items }: { items: { name: string; avatar?: string | null; total: number; subtitle?: string; color?: string | null; emblem?: string | null }[] }) {
  const order = [items[1], items[0], items[2]].filter(Boolean);
  const heights = ["h-32", "h-44", "h-24"];
  const crowns = [
    { icon: Medal, color: "text-zinc-300", bg: "from-zinc-400 to-zinc-600", label: "2º" },
    { icon: Crown, color: "text-yellow-300", bg: "from-yellow-400 via-amber-500 to-yellow-600", label: "1º" },
    { icon: Trophy, color: "text-amber-600", bg: "from-amber-700 to-amber-900", label: "3º" },
  ];
  const podiumIdx = [1, 0, 2];

  return (
    <div className="grid grid-cols-3 gap-3 md:gap-6 items-end max-w-3xl mx-auto">
      {order.map((it, i) => {
        const c = crowns[podiumIdx[i]];
        const Icon = c.icon;
        const isFirst = podiumIdx[i] === 0;
        return (
          <div key={i} className="flex flex-col items-center">
            <div className="relative mb-3">
              {isFirst && (
                <Crown
                  className="absolute -top-8 left-1/2 -translate-x-1/2 h-10 w-10 text-yellow-400 drop-shadow-[0_2px_8px_rgba(250,204,21,0.7)] animate-[spin_4s_linear_infinite]"
                  fill="currentColor"
                />
              )}
              {!isFirst && (
                <Icon className={`absolute -top-5 left-1/2 -translate-x-1/2 h-7 w-7 ${c.color} drop-shadow-md`} fill="currentColor" />
              )}
              <div className={`relative rounded-full p-1 bg-gradient-to-br ${c.bg} shadow-2xl ${isFirst ? "ring-4 ring-yellow-400/40" : ""}`}>
                <div className={`${isFirst ? "h-24 w-24 md:h-28 md:w-28" : "h-20 w-20 md:h-24 md:w-24"} rounded-full bg-card overflow-hidden flex items-center justify-center text-xl font-bold text-primary border-4 border-card`}>
                  {it.avatar ? (
                    <img src={it.avatar} alt={it.name} className="h-full w-full object-cover" />
                  ) : (
                    <span>{initials(it.name)}</span>
                  )}
                </div>
                {it.emblem && (
                  <div className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full bg-white shadow-lg border-2 border-white overflow-hidden flex items-center justify-center">
                    <img src={it.emblem} alt="emblema" className="h-full w-full object-contain" />
                  </div>
                )}
              </div>
            </div>
            <div className={`w-full rounded-t-2xl ${heights[i]} bg-gradient-to-t ${c.bg} shadow-xl flex flex-col items-center justify-start pt-3 px-2 text-center`}>
              <span className="text-2xl md:text-3xl font-black text-white drop-shadow">{c.label}</span>
              <span className="text-[11px] md:text-xs font-semibold text-white/95 truncate w-full mt-1">{it.name}</span>
              {it.subtitle && <span className="text-[10px] text-white/80 truncate w-full">{it.subtitle}</span>}
              <span className="text-xs md:text-sm font-bold text-white mt-1">{fmtBRL(it.total)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RankRow({ rank, name, avatar, subtitle, total, color, emblem }: {
  rank: number; name: string; avatar?: string | null; subtitle?: string; total: number; color?: string | null; emblem?: string | null;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-card border hover:shadow-md transition-all hover:-translate-y-0.5">
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-sm shrink-0">
        {rank}
      </div>
      <div className="relative shrink-0">
        <div className="h-11 w-11 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center font-semibold text-primary border-2" style={color ? { borderColor: color } : {}}>
          {avatar ? <img src={avatar} alt={name} className="h-full w-full object-cover" /> : initials(name)}
        </div>
        {emblem && (
          <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white border border-white shadow overflow-hidden flex items-center justify-center">
            <img src={emblem} alt="" className="h-full w-full object-contain" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{name}</p>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>
      <div className="text-right shrink-0">
        <p className="font-bold text-sm">{fmtBRL(total)}</p>
      </div>
    </div>
  );
}

export default function Ranking() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [consultoras, setConsultoras] = useState<Consultora[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [c, e] = await Promise.all([
      supabase.rpc("get_ranking_consultoras", { _month: month, _year: year }),
      supabase.rpc("get_ranking_teams", { _month: month, _year: year }),
    ]);
    setConsultoras((c.data as Consultora[]) ?? []);
    setEquipes((e.data as Equipe[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    load();
    const ch = supabase
      .channel("ranking-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "client_entries" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  const top10 = consultoras.slice(0, 10);
  const teamsTop = equipes.slice(0, 10);

  const totalGeral = useMemo(() => consultoras.reduce((s, c) => s + Number(c.total || 0), 0), [consultoras]);

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-7 w-7 text-yellow-500" />
          <h1 className="text-2xl md:text-3xl font-bold">Ranking</h1>
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
        </div>
        <div className="flex gap-2">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
            className="px-3 py-1.5 rounded-md border bg-background text-sm">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{new Date(2000, m - 1).toLocaleDateString("pt-BR", { month: "long" })}</option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-1.5 rounded-md border bg-background text-sm">
            {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-primary/10 via-purple-500/5 to-yellow-500/10 border-primary/20">
        <CardContent className="p-4 flex items-center gap-4 flex-wrap">
          <TrendingUp className="h-8 w-8 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground capitalize">{monthLabel}</p>
            <p className="text-2xl font-black">{fmtBRL(totalGeral)}</p>
            <p className="text-xs text-muted-foreground">Total geral pago no mês</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="consultoras">
        <TabsList className="grid grid-cols-2 w-full md:w-96">
          <TabsTrigger value="consultoras"><Crown className="h-4 w-4 mr-1" /> Consultoras</TabsTrigger>
          <TabsTrigger value="equipes"><Users className="h-4 w-4 mr-1" /> Equipes</TabsTrigger>
        </TabsList>

        <TabsContent value="consultoras" className="space-y-6 mt-6">
          {loading ? (
            <p className="text-center text-muted-foreground py-12">Carregando...</p>
          ) : top10.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Sem dados ainda neste mês</p>
          ) : (
            <>
              <div className="py-6">
                <Podium items={top10.slice(0, 3).map((c) => ({
                  name: c.full_name || "—",
                  avatar: c.avatar_url,
                  total: Number(c.total),
                  subtitle: c.team_name || undefined,
                  color: c.team_color,
                  emblem: getTeamEmblem(c.team_name),
                }))} />
              </div>

              {top10.length > 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Top 4 ao 10</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {top10.slice(3).map((c, i) => (
                      <RankRow key={c.user_id}
                        rank={i + 4}
                        name={c.full_name || "—"}
                        avatar={c.avatar_url}
                        subtitle={c.team_name || undefined}
                        total={Number(c.total)}
                        color={c.team_color}
                        emblem={getTeamEmblem(c.team_name)}
                      />
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="equipes" className="space-y-6 mt-6">
          {loading ? (
            <p className="text-center text-muted-foreground py-12">Carregando...</p>
          ) : teamsTop.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Sem dados ainda</p>
          ) : (
            <>
              <div className="py-6">
                <Podium items={teamsTop.slice(0, 3).map((t) => ({
                  name: t.team_name,
                  total: Number(t.total),
                  subtitle: `${t.members_count} membros`,
                  color: t.team_color,
                  emblem: getTeamEmblem(t.team_name),
                }))} />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Todas as equipes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {teamsTop.map((t, i) => {
                    const emblem = getTeamEmblem(t.team_name);
                    return (
                    <div key={t.team_id} className="flex items-center gap-3 px-3 py-3 rounded-xl bg-card border hover:shadow-md transition-all">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-sm shrink-0">{i + 1}</div>
                      <div className="h-11 w-11 rounded-xl flex items-center justify-center font-bold text-white shrink-0 shadow overflow-hidden"
                        style={{ background: emblem ? "white" : (t.team_color || "hsl(var(--primary))") }}>
                        {emblem ? <img src={emblem} alt={t.team_name} className="h-full w-full object-contain p-1" /> : initials(t.team_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{t.team_name}</p>
                        <p className="text-xs text-muted-foreground">{t.members_count} membros · {t.entries_count} vendas</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm">{fmtBRL(Number(t.total))}</p>
                      </div>
                    </div>
                    );
                  })}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
