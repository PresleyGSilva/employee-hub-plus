import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Cake, PartyPopper, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const fullMonthsPt = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

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
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);
  const [selectedPerson, setSelectedPerson] = useState<Birthday | null>(null);

  useEffect(() => {
    // fire-and-forget: create today's broadcast birthday notifications
    supabase.rpc("notify_today_birthdays").then(() => {}, () => {});
    // fetch ALL active employees with birth_date (full year view)
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url, birth_date")
      .eq("active", true)
      .not("birth_date", "is", null)
      .then(({ data }) => {
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

  const monthBirthdays = useMemo(() => {
    return list
      .filter((b) => {
        const d = new Date(b.birth_date + "T00:00:00");
        return d.getMonth() === monthIndex;
      })
      .sort((a, b) => {
        const da = new Date(a.birth_date + "T00:00:00").getDate();
        const db = new Date(b.birth_date + "T00:00:00").getDate();
        return da - db;
      });
  }, [list, monthIndex]);

  const selectedBirthdays = useMemo(() => {
    if (!selectedDay || selectedDay.getMonth() !== monthIndex) return [];
    return byDay.get(selectedDay.getDate()) ?? [];
  }, [byDay, monthIndex, selectedDay]);

  const todayBdays = list.filter((b) => {
    const d = new Date(b.birth_date + "T00:00:00");
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
  });

  return (
    <Card className="overflow-hidden border-0 shadow-elegant relative">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/15 via-transparent to-primary/15 pointer-events-none" />
      <CardHeader className="relative pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-accent to-warning flex items-center justify-center text-accent-foreground shadow-md">
            <CalendarDays className="h-4 w-4" />
          </div>
          Calendário de aniversários
          <span className="text-xs font-normal text-muted-foreground ml-auto">{byDay.size > 0 ? `${Array.from(byDay.values()).flat().length} em ${monthsPt[monthIndex]}` : `${list.length} no ano`}</span>
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
              selected={selectedDay}
              onSelect={setSelectedDay}
              onMonthChange={(nextMonth) => {
                setMonth(nextMonth);
                setSelectedDay(undefined);
              }}
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
              {selectedBirthdays.length > 0
                ? `Aniversariantes do dia ${selectedDay?.getDate()}`
                : `Aniversariantes de ${monthsPt[monthIndex]}`}
            </p>
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {(selectedBirthdays.length > 0 ? selectedBirthdays : monthBirthdays).length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhum aniversário cadastrado neste mês
                </p>
              )}
              {(selectedBirthdays.length > 0 ? selectedBirthdays : monthBirthdays).map((b) => {
                const d = new Date(b.birth_date + "T00:00:00");
                const initials = b.full_name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
                const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
                return (
                  <button
                    type="button"
                    key={b.id}
                    onClick={() => setSelectedPerson(b)}
                    className={cn(
                      "w-full text-left flex items-center gap-3 p-2.5 rounded-lg transition-smooth cursor-pointer",
                      isToday
                        ? "bg-gradient-to-r from-accent/20 to-warning/20 border border-accent/40 hover:from-accent/30 hover:to-warning/30"
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
                        {d.getDate().toString().padStart(2, "0")} de {monthsPt[d.getMonth()]}
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
                      {isToday ? "Hoje 🎂" : `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
