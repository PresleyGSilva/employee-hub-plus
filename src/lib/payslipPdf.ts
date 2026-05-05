import { jsPDF } from "jspdf";
import { COMPANY } from "./company";
import { fmtBRL, monthNames } from "./payroll";

function numToExtenso(n: number): string {
  // Simplified: just returns formatted text
  return `${n.toFixed(2).replace(".", ",")} reais`;
}

export interface PayslipPdfData {
  payslip: any;
  employee: { full_name: string; cpf?: string | null; pix_key?: string | null; email: string };
}

export function generatePayslipPdf({ payslip, employee }: PayslipPdfData): jsPDF {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  let y = 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("TERMO DE QUITAÇÃO DE VERBAS SALARIAIS", pageW / 2, y, { align: "center" });
  y += 12;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("EMPREGADOR:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY.name, 55, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("CNPJ:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY.cnpj, 35, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text("EMPREGADO(A):", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(employee.full_name, 60, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("CPF:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(employee.cpf || "—", 35, y);
  y += 12;

  // 1. Pagamento
  doc.setFont("helvetica", "bold");
  doc.text("1. PAGAMENTO", 20, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.text("O(a) EMPREGADO(A) declara ter recebido do EMPREGADOR o valor de:", 20, y);
  y += 8;

  const total = Number(payslip.total_net);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`${fmtBRL(total)} (${numToExtenso(total)})`, 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Referente às verbas abaixo:", 20, y);
  y += 7;

  const refMes = `${monthNames[payslip.reference_month - 1]}/${payslip.reference_year}`;
  const lines = [
    `• Salário do mês ${refMes}: ${fmtBRL(Number(payslip.base_salary))}`,
    `• Horas extras: ${fmtBRL(Number(payslip.overtime_pay))}`,
    `• Descontos (faltas/atrasos): ${fmtBRL(Number(payslip.absence_deduction) + Number(payslip.late_deduction))}`,
    `• Bonificações: ${fmtBRL(Number(payslip.bonus))}`,
  ];
  lines.forEach((l) => { doc.text(l, 25, y); y += 6; });
  y += 2;
  doc.setFont("helvetica", "bold");
  doc.text(`TOTAL LÍQUIDO: ${fmtBRL(total)}`, 20, y);
  y += 12;

  // 2. Quitação
  doc.text("2. QUITAÇÃO", 20, y); y += 7;
  doc.setFont("helvetica", "normal");
  const q = doc.splitTextToSize(
    "O(a) EMPREGADO(A) dá quitação exclusivamente aos valores acima discriminados, declarando que os recebeu integralmente.",
    pageW - 40
  );
  doc.text(q, 20, y); y += q.length * 5 + 6;

  // 3. Forma
  doc.setFont("helvetica", "bold");
  doc.text("3. FORMA DE PAGAMENTO", 20, y); y += 7;
  doc.setFont("helvetica", "normal");
  doc.text(`Pagamento realizado via PIX`, 20, y); y += 6;
  doc.text(`Chave PIX: ${employee.pix_key || "—"}`, 20, y); y += 10;

  // 4. Assinatura
  doc.setFont("helvetica", "bold");
  doc.text("4. ASSINATURA", 20, y); y += 7;
  doc.setFont("helvetica", "normal");
  doc.text("Este documento deve ser assinado pelo(a) empregado(a) e devolvido ao sistema.", 20, y); y += 10;

  const today = new Date().toLocaleDateString("pt-BR");
  doc.text(`${COMPANY.city}/${COMPANY.state}, ${today}`, 20, y); y += 20;

  doc.line(20, y, 90, y);
  doc.line(pageW - 90, y, pageW - 20, y);
  y += 5;
  doc.setFontSize(8);
  doc.text("EMPREGADOR", 35, y);
  doc.text("EMPREGADO(A)", pageW - 75, y);
  y += 4;
  doc.text(COMPANY.name, 25, y);
  doc.text(employee.full_name, pageW - 88, y);

  return doc;
}
