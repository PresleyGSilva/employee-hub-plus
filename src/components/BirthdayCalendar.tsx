import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Cake, PartyPopper, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

interface Birthday {
  id: string;
  full_name: string;
  avatar_url: string | null;
  birth_date: string;
}

const monthsPt = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function BirthdayCalendar() {
  const [list, setList] = useState<Birthday[]>([]);
  const [month, setMonth] = useState<Date>(new Date());

  useEffect(() => {
    // fire-and-forget: create today's broadcast birthday notifications
    (supabase.rpc("notify_today_birthdays" as any) as any).then(() => {}, () => {});
    supabase.rpc("get_birthdays_this_month").then(({ data }) => {
      setList((data as Birthday[]) ?? []);
    });
  }, []);

  const today = new Date();
  const year = month.getFullYear();
  const monthIndex = month.getMonth();

  // map: day -> birthdays
  const byDay = useMemo(() => {
    const m = new Map<number, Birthday[]>();
    for (const b of list) {
      const d = new Date(b.birth_date + "T00:00:00");
      if (d.getMonth() !== monthIndex) continue;
      const day = d.getDate();
      if (!m.has(day)) m.set(day, []);
      m.get(day)!.push(b);
    }
    return m;
  }, [list, monthIndex]);

  const birthdayDates = useMemo(
    () => Array.from(byDay.keys()).map((d) => new Date(year, monthIndex, d)),
    [byDay, year, monthIndex]
  );

  const todayBdays = list.filter((b) => {
    const d = new Date(b.birth_date + "T00:00:00");
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
  });

  // upcoming next 30 days (across months)
  const upcoming = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const items = list
      .map((b) => {
        const d = new Date(b.birth_date + "T00:00:00");
        const next = new Date(now.getFullYear(), d.getMonth(), d.getDate());
        if (next < now) next.setFullYear(next.getFullYear() + 1);
        const days = Math.round((next.getTime() - now.getTime()) / 86400000);
        return { ...b, days, when: next };
      })
      .filter((x) => x.days <= 30)
      .sort((a, b) => a.days - b.days);
    return items;
  }, [list]);

  return (
    <Card className="overflow-hidden border-0 shadow-elegant relative">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/15 via-transparent to-primary/15 pointer-events-none" />
      <CardHeader className="relative pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-accent to-warning flex items-center justify-center text-accent-foreground shadow-md">
            <CalendarDays className="h-4 w-4" />
          </div>
          Calendário de aniversários
          <span className="text-xs font-normal text-muted-foreground ml-auto">{list.length} no mês</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="relative">
        {todayBdays.length > 0 && (
          <div className="rounded-xl bg-gradient-to-r from-accent/25 via-warning/15 to-accent/25 border border-accent/40 p-3 mb-4 animate-pulse">
            <p className="text-sm font-semibold flex items-center gap-2">
              <PartyPopper className="h-4 w-4 text-accent" />
              🎉 Hoje é aniversário de {todayBdays.map((b) => b.full_name.split(" ")[0]).join(", ")}! Mande os parabéns!
            </p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-card/50 p-2 flex justify-center">
            <Calendar
              mode="single"
              month={month}
              onMonthChange={setMonth}
              modifiers={{ birthday: birthdayDates }}
              modifiersClassNames={{
                birthday:
                  "relative font-bold text-accent-foreground bg-gradient-to-br from-accent/40 to-warning/40 rounded-md ring-1 ring-accent/50",
              }}
              className={cn("p-2 pointer-events-auto")}
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Próximos aniversários
            </p>
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {upcoming.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhum aniversário nos próximos 30 dias
                </p>
              )}
              {upcoming.map((b) => {
                const initials = b.full_name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
                const isToday = b.days === 0;
                const label =
                  isToday ? "Hoje 🎂" :
                  b.days === 1 ? "Amanhã" :
                  `em ${b.days} dias`;
                return (
                  <div
                    key={b.id}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-lg transition-smooth",
                      isToday
                        ? "bg-gradient-to-r from-accent/20 to-warning/20 border border-accent/40"
                        : "hover:bg-muted/50 border border-transparent"
                    )}
                  >
                    <Avatar className="h-9 w-9">
                      {b.avatar_url && <AvatarImage src={b.avatar_url} alt={b.full_name} />}
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{b.full_name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Cake className="h-3 w-3" />
                        {b.when.getDate().toString().padStart(2, "0")} de {monthsPt[b.when.getMonth()]}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap",
                        isToday
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
