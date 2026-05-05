import { jsPDF } from "jspdf";
import { COMPANY } from "./company";
import { fmtBRL, monthNames } from "./payroll";
import logoUrl from "@/assets/logo-tottus.png";

// Conversão de número para extenso em português (Reais)
function numeroPorExtenso(valor: number): string {
  const unidades = ["", "UM", "DOIS", "TRÊS", "QUATRO", "CINCO", "SEIS", "SETE", "OITO", "NOVE"];
  const dez = ["DEZ", "ONZE", "DOZE", "TREZE", "QUATORZE", "QUINZE", "DEZESSEIS", "DEZESSETE", "DEZOITO", "DEZENOVE"];
  const dezenas = ["", "", "VINTE", "TRINTA", "QUARENTA", "CINQUENTA", "SESSENTA", "SETENTA", "OITENTA", "NOVENTA"];
  const centenas = ["", "CENTO", "DUZENTOS", "TREZENTOS", "QUATROCENTOS", "QUINHENTOS", "SEISCENTOS", "SETECENTOS", "OITOCENTOS", "NOVECENTOS"];

  function ate999(n: number): string {
    if (n === 0) return "";
    if (n === 100) return "CEM";
    const c = Math.floor(n / 100);
    const resto = n % 100;
    const partes: string[] = [];
    if (c > 0) partes.push(centenas[c]);
    if (resto > 0) {
      if (resto < 10) partes.push(unidades[resto]);
      else if (resto < 20) partes.push(dez[resto - 10]);
      else {
        const d = Math.floor(resto / 10);
        const u = resto % 10;
        partes.push(u > 0 ? `${dezenas[d]} E ${unidades[u]}` : dezenas[d]);
      }
    }
    return partes.join(" E ");
  }

  function inteiroExtenso(n: number): string {
    if (n === 0) return "ZERO";
    const milhoes = Math.floor(n / 1_000_000);
    const milhares = Math.floor((n % 1_000_000) / 1000);
    const resto = n % 1000;
    const partes: string[] = [];
    if (milhoes > 0) partes.push(milhoes === 1 ? "UM MILHÃO" : `${ate999(milhoes)} MILHÕES`);
    if (milhares > 0) partes.push(milhares === 1 ? "MIL" : `${ate999(milhares)} MIL`);
    if (resto > 0) partes.push(ate999(resto));
    return partes.join(" E ");
  }

  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100);
  const parteReais = `${inteiroExtenso(inteiro)} ${inteiro === 1 ? "REAL" : "REAIS"}`;
  if (centavos === 0) return parteReais;
  const parteCent = `${inteiroExtenso(centavos)} ${centavos === 1 ? "CENTAVO" : "CENTAVOS"}`;
  return `${parteReais} E ${parteCent}`;
}

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch(logoUrl);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch { return null; }
}

export interface PayslipPdfData {
  payslip: any;
  employee: { full_name: string; cpf?: string | null; pix_key?: string | null; email: string };
}

export async function generatePayslipPdf({ payslip, employee }: PayslipPdfData): Promise<jsPDF> {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = 15;

  const logo = await loadLogoDataUrl();
  if (logo) {
    try { doc.addImage(logo, "PNG", pageW / 2 - 17, y, 34, 34); } catch {}
    y += 36;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("TERMO DE QUITAÇÃO TOTAL – DIREITOS TRABALHISTAS", pageW / 2, y, { align: "center" });
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const total = Number(payslip.total_net);
  const baseSalary = Number(payslip.base_salary) + Number(payslip.overtime_pay) - Number(payslip.absence_deduction) - Number(payslip.late_deduction);
  const bonus = Number(payslip.bonus);
  const refMes = `${monthNames[payslip.reference_month - 1]} de ${payslip.reference_year}`;
  const valorExt = numeroPorExtenso(total);

  const intro =
    `Através do presente Termo de Quitação Total, que entre si fazem na melhor forma de direito, ` +
    `de um lado ${COMPANY.name}, inscrita no CNPJ nº ${COMPANY.cnpj}, a seguir chamada apenas de EMPREGADOR, ` +
    `e de outro lado, ${(employee.full_name || "").toUpperCase()}, inscrito(a) no CPF nº ${employee.cpf || "—"}, ` +
    `a seguir chamado(a) apenas de EMPREGADO(A), como segue:`;

  const p1 = doc.splitTextToSize(intro, contentW);
  doc.text(p1, margin, y); y += p1.length * 5 + 4;

  const corpo =
    `O(A) EMPREGADO(A) recebe neste ato do EMPREGADOR a importância de ${fmtBRL(total)} (${valorExt}), ` +
    `em moeda corrente e legal do país, referente à quitação do salário de ${refMes}. ` +
    `O valor de quitação acima citado é discriminado da seguinte maneira:`;
  const p2 = doc.splitTextToSize(corpo, contentW);
  doc.text(p2, margin, y); y += p2.length * 5 + 6;

  doc.setFont("helvetica", "bold");
  doc.text(`SALÁRIO ${monthNames[payslip.reference_month - 1].toUpperCase()}: ${fmtBRL(baseSalary)}`, margin, y); y += 6;
  doc.text(`BÔNUS: ${fmtBRL(bonus)}`, margin, y); y += 6;
  doc.text(`TOTAL: ${fmtBRL(total)}`, margin, y); y += 8;
  doc.setFont("helvetica", "normal");

  const quit =
    `O(A) EMPREGADO(A) recebe a importância em moeda corrente do país nesta data, razão pela qual assina o presente termo, ` +
    `por conseguinte dando ao EMPREGADOR, PLENA E GERAL QUITAÇÃO DOS DIREITOS TRABALHISTAS, para nada mais reclamar em época alguma, ` +
    `seja a que título for, em relação aos direitos ou obrigações presentes ou futuras, em se tratando não somente do mencionado ` +
    `Contrato de Trabalho, mas também em relação a todo e qualquer período que antecedeu a confecção do presente termo.`;
  const p3 = doc.splitTextToSize(quit, contentW);
  doc.text(p3, margin, y); y += p3.length * 5 + 4;

  const final =
    `Assim, sendo a expressão da verdade e para que surtam os efeitos jurídicos e legais, as partes assinam o presente termo ` +
    `na presença de duas testemunhas, que cientes do conteúdo disposto, igualmente assinam o presente.`;
  const p4 = doc.splitTextToSize(final, contentW);
  doc.text(p4, margin, y); y += p4.length * 5 + 8;

  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  doc.text(`${COMPANY.city}/${COMPANY.state}, ${today}.`, margin, y); y += 20;

  // Assinaturas
  if (y > 250) y = 250;
  doc.line(margin, y, margin + 70, y);
  doc.line(pageW - margin - 70, y, pageW - margin, y);
  y += 5;
  doc.setFontSize(9);
  doc.text("EMPREGADOR", margin + 20, y);
  doc.text("EMPREGADO(A)", pageW - margin - 50, y);
  y += 4;
  doc.text(COMPANY.name, margin + 5, y);
  doc.text((employee.full_name || "").toUpperCase(), pageW - margin - 70, y);

  y += 16;
  doc.setFontSize(10);
  doc.text("Testemunhas:", margin, y); y += 10;
  doc.line(margin, y, margin + 70, y);
  doc.line(pageW - margin - 70, y, pageW - margin, y);
  y += 5;
  doc.setFontSize(9);
  doc.text("Nome:", margin, y);
  doc.text("Nome:", pageW - margin - 70, y);
  y += 5;
  doc.text("CPF:", margin, y);
  doc.text("CPF:", pageW - margin - 70, y);

  return doc;
}
