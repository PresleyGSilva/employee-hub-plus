import { jsPDF } from "jspdf";
import { COMPANY } from "./company";
import { fmtBRL, monthNames } from "./payroll";

const NFSE_PORTAL = "https://www.nfse.gov.br/EmissorNacional";
const SERVICE_CODE = "17.22.01 - Cobrança em geral.";

export function generateNfseDataPdf(opts: {
  employee: any;
  month: number;
  year: number;
  amount: number;
}) {
  const { employee, month, year, amount } = opts;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  let y = 15;

  doc.setFont("helvetica", "bold").setFontSize(16);
  doc.text("Dados para emissão da NFS-e", W / 2, y, { align: "center" });
  y += 6;
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text(`Competência: ${monthNames[month - 1]}/${year}`, W / 2, y, { align: "center" });
  y += 8;

  doc.setDrawColor(200);
  doc.line(15, y, W - 15, y);
  y += 6;

  const section = (title: string) => {
    doc.setFont("helvetica", "bold").setFontSize(11);
    doc.text(title, 15, y);
    y += 5;
    doc.setFont("helvetica", "normal").setFontSize(10);
  };
  const row = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, 15, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value || "—", W - 70);
    doc.text(lines, 65, y);
    y += 5 * Math.max(1, lines.length);
  };

  section("PRESTADOR DO SERVIÇO (você)");
  row("CNPJ:", employee.cnpj || "—");
  row("Nome empresarial:", employee.company_name || employee.full_name || "—");
  row("Chave PIX:", employee.pix_key || "—");
  y += 3;

  section("TOMADOR DO SERVIÇO");
  row("CNPJ:", COMPANY.cnpj);
  row("Razão social:", COMPANY.name);
  row("Município:", `${COMPANY.city} - ${COMPANY.state}`);
  y += 3;

  section("SERVIÇO");
  row("Código:", SERVICE_CODE);
  row("Local da prestação:", `${COMPANY.city} - ${COMPANY.state}`);
  y += 2;
  doc.setFont("helvetica", "bold");
  doc.text("Descrição do serviço:", 15, y); y += 5;
  doc.setFont("helvetica", "normal");
  const descricao = [
    `Valor referente aos serviços prestados no mês de ${String(month).padStart(2, "0")}/${year}`,
    `Salário ${fmtBRL(amount)}`,
    `Dados para Recebimento: Chave Pix: ${employee.pix_key || "—"}`,
  ];
  descricao.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, W - 30);
    doc.text(wrapped, 15, y);
    y += 5 * wrapped.length;
  });
  y += 4;

  section("VALOR");
  doc.setFontSize(14).setFont("helvetica", "bold");
  doc.text(`Valor do serviço: ${fmtBRL(amount)}`, 15, y);
  y += 10;

  doc.setDrawColor(200);
  doc.line(15, y, W - 15, y);
  y += 6;

  doc.setFont("helvetica", "bold").setFontSize(11);
  doc.text("Como emitir no portal nacional:", 15, y); y += 6;
  doc.setFont("helvetica", "normal").setFontSize(10);
  const steps = [
    `1. Acesse: ${NFSE_PORTAL}`,
    "2. Faça login com sua conta gov.br (CPF e senha do MEI).",
    "3. Clique em 'Emitir NFS-e' e preencha com os dados acima.",
    "4. Em 'Tomador', informe o CNPJ da TOTTUS para preenchimento automático.",
    "5. Em 'Serviço', use o código 17.22.01 e cole a descrição acima.",
    `6. Em 'Valor do serviço', informe ${fmtBRL(amount)}.`,
    "7. Confira e clique em 'Emitir'. Baixe o PDF e envie ao RH.",
  ];
  steps.forEach((s) => {
    const w = doc.splitTextToSize(s, W - 30);
    doc.text(w, 15, y);
    y += 5 * w.length;
  });

  return doc;
}
