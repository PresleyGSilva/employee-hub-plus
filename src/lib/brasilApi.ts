// Consulta CNPJ na BrasilAPI (gratuita, oficial, sem chave)
// https://brasilapi.com.br/docs#tag/CNPJ
export interface CnpjData {
  razao_social?: string;
  nome_fantasia?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  ddd_telefone_1?: string;
  data_inicio_atividade?: string;
  cnae_fiscal?: number;
  cnae_fiscal_descricao?: string;
}

export async function fetchCnpj(cnpjRaw: string): Promise<CnpjData | null> {
  const cnpj = cnpjRaw.replace(/\D/g, "");
  if (cnpj.length !== 14) return null;
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export function formatCep(cep?: string) {
  if (!cep) return "";
  const c = cep.replace(/\D/g, "");
  return c.length === 8 ? `${c.slice(0, 5)}-${c.slice(5)}` : cep;
}

export function formatCnpj(cnpj?: string) {
  if (!cnpj) return "";
  const c = cnpj.replace(/\D/g, "");
  if (c.length !== 14) return cnpj;
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;
}
