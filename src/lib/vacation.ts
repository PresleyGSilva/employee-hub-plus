// Cálculo de férias CLT
// INSS 2024 (faixas progressivas) e IRRF tabela mensal simplificada
export function calcINSS(base: number) {
  const faixas = [
    { ate: 1412.0, aliq: 0.075 },
    { ate: 2666.68, aliq: 0.09 },
    { ate: 4000.03, aliq: 0.12 },
    { ate: 7786.02, aliq: 0.14 },
  ];
  let restante = base;
  let anterior = 0;
  let total = 0;
  for (const f of faixas) {
    if (base <= anterior) break;
    const tributavel = Math.min(base, f.ate) - anterior;
    if (tributavel > 0) total += tributavel * f.aliq;
    anterior = f.ate;
    restante = base - f.ate;
    if (base <= f.ate) return total;
  }
  // teto
  return total;
}

export function calcIRRF(base: number) {
  // Tabela mensal 2024
  if (base <= 2259.2) return 0;
  if (base <= 2826.65) return base * 0.075 - 169.44;
  if (base <= 3751.05) return base * 0.15 - 381.44;
  if (base <= 4664.68) return base * 0.225 - 662.77;
  return base * 0.275 - 896.0;
}

export interface VacationCalcInput {
  baseSalary: number;
  vacationDays: number; // dias de gozo
  soldDays: number; // dias vendidos (abono pecuniário)
}

export interface VacationCalcResult {
  vacationPay: number;
  oneThirdBonus: number;
  soldDaysPay: number;
  soldDaysOneThird: number;
  totalGross: number;
  inss: number;
  irrf: number;
  totalNet: number;
}

export function calcVacation({ baseSalary, vacationDays, soldDays }: VacationCalcInput): VacationCalcResult {
  const dailyRate = baseSalary / 30;
  const vacationPay = dailyRate * vacationDays;
  const oneThirdBonus = vacationPay / 3;
  const soldDaysPay = dailyRate * soldDays;
  const soldDaysOneThird = soldDaysPay / 3;

  // INSS e IRRF incidem sobre férias + 1/3 (gozo). Abono pecuniário é isento.
  const baseInss = vacationPay + oneThirdBonus;
  const inss = calcINSS(baseInss);
  const irrf = calcIRRF(baseInss - inss);

  const totalGross = vacationPay + oneThirdBonus + soldDaysPay + soldDaysOneThird;
  const totalNet = totalGross - inss - irrf;

  return {
    vacationPay: round(vacationPay),
    oneThirdBonus: round(oneThirdBonus),
    soldDaysPay: round(soldDaysPay + soldDaysOneThird),
    soldDaysOneThird: round(soldDaysOneThird),
    totalGross: round(totalGross),
    inss: round(inss),
    irrf: round(Math.max(0, irrf)),
    totalNet: round(totalNet),
  };
}

function round(v: number) {
  return Math.round(v * 100) / 100;
}
