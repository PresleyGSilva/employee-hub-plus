// Regras CLT padrão usadas no MVP
export const WORK_HOURS_PER_DAY = 8;
export const TOLERANCE_MINUTES = 10;
export const OVERTIME_MULTIPLIER = 1.5;
export const WORKING_DAYS_PER_MONTH = 22;

export function calcWorkedMinutes(clockIn: Date, clockOut: Date) {
  return Math.max(0, Math.floor((clockOut.getTime() - clockIn.getTime()) / 60000));
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
