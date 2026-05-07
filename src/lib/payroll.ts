// Regras CLT padrão usadas no MVP
export const WORK_HOURS_PER_DAY = 8;
export const TOLERANCE_MINUTES = 10;
export const OVERTIME_MULTIPLIER = 1.5;
export const WORKING_DAYS_PER_MONTH = 22;

export function calcWorkedMinutes(clockIn: Date, clockOut: Date) {
  return Math.max(0, Math.floor((clockOut.getTime() - clockIn.getTime()) / 60000));
}

/** Calcula minutos efetivamente trabalhados descontando almoço, café e lanche. */
export function calcWorkedFromEntry(e: {
  clock_in?: string | null; clock_out?: string | null;
  lunch_out?: string | null; lunch_in?: string | null;
  break_out?: string | null; break_in?: string | null;
  snack_out?: string | null; snack_in?: string | null;
}) {
  if (!e.clock_in || !e.clock_out) return 0;
  let total = calcWorkedMinutes(new Date(e.clock_in), new Date(e.clock_out));
  if (e.lunch_out && e.lunch_in)
    total -= calcWorkedMinutes(new Date(e.lunch_out), new Date(e.lunch_in));
  if (e.break_out && e.break_in)
    total -= calcWorkedMinutes(new Date(e.break_out), new Date(e.break_in));
  if (e.snack_out && e.snack_in)
    total -= calcWorkedMinutes(new Date(e.snack_out), new Date(e.snack_in));
  return Math.max(0, total);
}

export function calcLateAndOvertime(workedMin: number) {
  const expected = WORK_HOURS_PER_DAY * 60;
  let late = 0;
  let overtime = 0;
  if (workedMin < expected) {
    const diff = expected - workedMin;
    if (diff > TOLERANCE_MINUTES) late = diff;
  } else {
    overtime = workedMin - expected;
  }
  return { late, overtime };
}

/** Saldo do dia para banco de horas (positivo = crédito, negativo = débito). */
export function calcDayBalance(workedMin: number) {
  return workedMin - WORK_HOURS_PER_DAY * 60;
}

export function fmtBalance(min: number) {
  const sign = min >= 0 ? "+" : "-";
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}h ${m.toString().padStart(2, "0")}m`;
}

export function fmtMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const monthNames = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];
