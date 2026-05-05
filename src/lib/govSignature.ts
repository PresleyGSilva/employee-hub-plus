// Detecta se um PDF foi assinado digitalmente (ICP-Brasil / gov.br)
// Procura por marcadores de assinatura PKCS#7 e palavras-chave do gov.br
export type GovSignatureCheck = {
  isPdf: boolean;
  hasDigitalSignature: boolean;
  isGovBr: boolean;
  signerHints: string[];
};

export async function checkGovBrSignature(file: File): Promise<GovSignatureCheck> {
  const result: GovSignatureCheck = {
    isPdf: file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"),
    hasDigitalSignature: false,
    isGovBr: false,
    signerHints: [],
  };
  if (!result.isPdf) return result;

  const buf = new Uint8Array(await file.arrayBuffer());
  // Decodifica como latin1 para preservar bytes em busca textual
  let text = "";
  const chunk = 65536;
  for (let i = 0; i < buf.length; i += chunk) {
    text += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + chunk)) as any);
  }

  // Marcadores de assinatura digital em PDF
  const sigMarkers = [
    "/Type/Sig", "/Type /Sig",
    "/SubFilter/adbe.pkcs7", "/SubFilter /adbe.pkcs7",
    "/SubFilter/ETSI.CAdES", "/SubFilter /ETSI.CAdES",
    "adbe.pkcs7.detached", "adbe.pkcs7.sha1",
    "ETSI.CAdES.detached",
  ];
  result.hasDigitalSignature = sigMarkers.some((m) => text.includes(m));

  // Marcadores específicos do gov.br / ICP-Brasil
  const govMarkers = [
    "gov.br", "Gov.br", "GOV.BR",
    "Assinador Gov.br", "assinador.iti.br",
    "ITI", "ICP-Brasil", "AC SERPRO", "AC VALID",
    "Instituto Nacional de Tecnologia da Informação",
  ];
  for (const m of govMarkers) {
    if (text.includes(m)) {
      result.isGovBr = true;
      if (!result.signerHints.includes(m)) result.signerHints.push(m);
    }
  }
  return result;
}
