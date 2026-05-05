import { jsPDF } from "jspdf";
import { COMPANY } from "./company";
import { fmtBRL, monthNames } from "./payroll";
import logoUrl from "@/assets/logo-tottus.png";
import empregadorSigUrl from "@/assets/empregador-assinatura.png";

function numeroPorExtenso(valor: number): string {
  const u = ["", "UM", "DOIS", "TRÊS", "QUATRO", "CINCO", "SEIS", "SETE", "OITO", "NOVE"];
  const dz = ["DEZ", "ONZE", "DOZE", "TREZE", "QUATORZE", "QUINZE", "DEZESSEIS", "DEZESSETE", "DEZOITO", "DEZENOVE"];
  const dezenas = ["", "", "VINTE", "TRINTA", "QUARENTA", "CINQUENTA", "SESSENTA", "SETENTA", "OITENTA", "NOVENTA"];
  const c = ["", "CENTO", "DUZENTOS", "TREZENTOS", "QUATROCENTOS", "QUINHENTOS", "SEISCENTOS", "SETECENTOS", "OITOCENTOS", "NOVECENTOS"];
  function ate999(n: number): string {
    if (n === 0) return "";
    if (n === 100) return "CEM";
    const ce = Math.floor(n / 100), r = n % 100, p: string[] = [];
    if (ce > 0) p.push(c[ce]);
    if (r > 0) {
      if (r < 10) p.push(u[r]);
      else if (r < 20) p.push(dz[r - 10]);
      else { const d = Math.floor(r / 10), un = r % 10; p.push(un > 0 ? `${dezenas[d]} E ${u[un]}` : dezenas[d]); }
    }
    return p.join(" E ");
  }
  function ie(n: number): string {
    if (n === 0) return "ZERO";
    const mi = Math.floor(n / 1_000_000), mil = Math.floor((n % 1_000_000) / 1000), r = n % 1000, p: string[] = [];
    if (mi > 0) p.push(mi === 1 ? "UM MILHÃO" : `${ate999(mi)} MILHÕES`);
    if (mil > 0) p.push(mil === 1 ? "MIL" : `${ate999(mil)} MIL`);
    if (r > 0) p.push(ate999(r));
    return p.join(" E ");
  }
  const i = Math.floor(valor), ct = Math.round((valor - i) * 100);
  const pr = `${ie(i)} ${i === 1 ? "REAL" : "REAIS"}`;
  if (ct === 0) return pr;
  return `${pr} E ${ie(ct)} ${ct === 1 ? "CENTAVO" : "CENTAVOS"}`;
}

async function loadDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch { return null; }
}
async function loadLogoDataUrl() { return loadDataUrl(logoUrl); }

export interface PayslipPdfData {
  payslip: any;
  employee: { full_name: string; cpf?: string | null; pix_key?: string | null; email: string };
}

export async function generatePayslipPdf({ payslip, employee }: PayslipPdfData): Promise<jsPDF> {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = 15;

  const ensureSpace = (h: number) => {
    if (y + h > pageH - 20) { doc.addPage(); y = 20; }
  };

  const writeJustified = (text: string, lineH = 5, gapAfter = 5) => {
    const lines = doc.splitTextToSize(text, contentW);
    ensureSpace(lines.length * lineH + gapAfter);
    doc.text(lines, margin, y, { align: "justify", maxWidth: contentW });
    y += lines.length * lineH + gapAfter;
  };

  const logo = await loadLogoDataUrl();
  if (logo) {
    try { doc.addImage(logo, "PNG", pageW / 2 - 17, y, 34, 34); } catch {}
    y += 36;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("TERMO DE QUITAÇÃO TOTAL – DIREITOS TRABALHISTAS", pageW / 2, y, { align: "center" });
  y += 3;
  doc.setLineWidth(0.4);
  doc.line(margin, y + 1, pageW - margin, y + 1);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const total = Number(payslip.total_net);
  const baseSalary =
    Number(payslip.base_salary) +
    Number(payslip.overtime_pay) -
    Number(payslip.absence_deduction) -
    Number(payslip.late_deduction);
  const bonus = Number(payslip.bonus);
  const refMes = `${monthNames[payslip.reference_month - 1]} de ${payslip.reference_year}`;
  const valorExt = numeroPorExtenso(total);

  writeJustified(
    `Através do presente Termo de Quitação Total, que entre si fazem na melhor forma de direito, ` +
    `de um lado ${COMPANY.name}, inscrita no CNPJ nº ${COMPANY.cnpj}, a seguir chamada apenas de EMPREGADOR, ` +
    `e de outro lado, ${(employee.full_name || "").toUpperCase()}, inscrito(a) no CPF nº ${employee.cpf || "—"}, ` +
    `a seguir chamado(a) apenas de EMPREGADO(A), como segue:`
  );

  writeJustified(
    `O(A) EMPREGADO(A) recebe neste ato do EMPREGADOR a importância de ${fmtBRL(total)} (${valorExt}), ` +
    `em moeda corrente e legal do país, referente à quitação do salário de ${refMes}. ` +
    `O valor de quitação acima citado é discriminado da seguinte maneira:`,
    5, 6
  );

  // Caixa de discriminação
  const boxH = 26;
  ensureSpace(boxH + 6);
  doc.setDrawColor(180);
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y, contentW, boxH, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.text(`SALÁRIO ${monthNames[payslip.reference_month - 1].toUpperCase()}:`, margin + 4, y + 7);
  doc.text(fmtBRL(baseSalary), pageW - margin - 4, y + 7, { align: "right" });
  doc.text(`BÔNUS:`, margin + 4, y + 14);
  doc.text(fmtBRL(bonus), pageW - margin - 4, y + 14, { align: "right" });
  doc.setLineWidth(0.2);
  doc.line(margin + 4, y + 17, pageW - margin - 4, y + 17);
  doc.setFontSize(11);
  doc.text(`TOTAL:`, margin + 4, y + 23);
  doc.text(fmtBRL(total), pageW - margin - 4, y + 23, { align: "right" });
  doc.setFontSize(10);
  y += boxH + 6;
  doc.setFont("helvetica", "normal");

  writeJustified(
    `O(A) EMPREGADO(A) recebe a importância em moeda corrente do país nesta data, razão pela qual assina o presente termo, ` +
    `por conseguinte dando ao EMPREGADOR, PLENA E GERAL QUITAÇÃO DOS DIREITOS TRABALHISTAS, para nada mais reclamar em época alguma, ` +
    `seja a que título for, em relação aos direitos ou obrigações presentes ou futuras, em se tratando não somente do mencionado ` +
    `Contrato de Trabalho, mas também em relação a todo e qualquer período que antecedeu a confecção do presente termo.`
  );

  writeJustified(
    `Assim, sendo a expressão da verdade e para que surtam os efeitos jurídicos e legais, as partes assinam o presente termo ` +
    `na presença de duas testemunhas, que cientes do conteúdo disposto, igualmente assinam o presente.`,
    5, 10
  );

  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  ensureSpace(22);
  doc.text(`${COMPANY.city}/${COMPANY.state}, ${today}.`, margin, y);
  y += 22;

  // Assinaturas
  const sigW = 75;
  ensureSpace(50);
  // Assinatura digital do empregador acima da linha
  const empSig = await loadDataUrl(empregadorSigUrl);
  if (empSig) {
    try {
      const imgW = 70, imgH = 18;
      doc.addImage(empSig, "PNG", margin + (sigW - imgW) / 2, y - imgH, imgW, imgH);
    } catch {}
  }
  doc.line(margin, y, margin + sigW, y);
  doc.line(pageW - margin - sigW, y, pageW - margin, y);
  y += 5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("EMPREGADOR", margin + sigW / 2, y, { align: "center" });
  doc.text("EMPREGADO(A)", pageW - margin - sigW / 2, y, { align: "center" });
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY.name, margin + sigW / 2, y, { align: "center" });
  doc.text((employee.full_name || "").toUpperCase(), pageW - margin - sigW / 2, y, { align: "center" });
  y += 14;

  ensureSpace(30);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Testemunhas:", margin, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.line(margin, y, margin + sigW, y);
  doc.line(pageW - margin - sigW, y, pageW - margin, y);
  y += 5;
  doc.setFontSize(9);
  doc.text("Nome:", margin, y);
  doc.text("Nome:", pageW - margin - sigW, y);
  y += 5;
  doc.text("CPF:", margin, y);
  doc.text("CPF:", pageW - margin - sigW, y);

  return doc;
}
