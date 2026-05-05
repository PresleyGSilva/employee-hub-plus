# Tottus Cred — Desktop (Windows)

Aplicativo desktop em modo **Online**: abre sempre a versão mais recente publicada do site.
Você **nunca precisa reinstalar** para receber atualizações — basta fechar e abrir o app, ou apertar **F5** dentro dele.

## Como gerar o instalador `.exe`

Existem duas formas:

### 1) Automático via GitHub Actions (recomendado)
1. Conecte o projeto ao GitHub (botão **Connectors → GitHub** no Lovable).
2. Cada `push` na branch `main` que mexa em `desktop/` ou no workflow vai disparar o build no GitHub.
3. Vá em **GitHub → Actions → Build Desktop App (Windows)** e baixe o `.exe` pronto, ou pegue na aba **Releases**.
4. Pode também rodar manualmente em **Actions → Run workflow**.

### 2) Localmente em um Windows
```bash
cd desktop
npm install
npm run build
# instalador gerado em desktop/dist/Tottus Cred Setup x.y.z.exe
```

## Atualizações automáticas
Como o app carrega `https://cc118663-41f9-4600-bed9-1e39e7fb15c6.lovable.app`,
qualquer mudança que você publicar pelo Lovable (ou push no GitHub que sincroniza com o site) aparece na próxima abertura do app. Não há necessidade de reinstalar.

## Atalhos
- **F5** — recarregar
- **F11** — tela cheia
