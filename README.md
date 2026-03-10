# HiveClip

Plataforma para provisionar VMs Windows na nuvem e acessar via browser.

---

## O que voce precisa ter instalado

1. **Node.js v22+** — [nodejs.org](https://nodejs.org/)
2. **pnpm** — gerenciador de pacotes do projeto
3. **Python 3.8+** — usado para provisionar as VMs
4. **pywinrm** — lib Python para comunicar com Windows via WinRM
5. **Uma API Key da Vultr** — [my.vultr.com/settings/#settingsapi](https://my.vultr.com/settings/#settingsapi)

### Instalando pnpm

```bash
npm install -g pnpm
```

### Instalando pywinrm

```bash
pip install pywinrm
```

---

## Passo a passo

### 1. Clone o repositorio

```bash
git clone <repo-url>
cd hiveclip
```

### 2. Instale as dependencias

```bash
pnpm install
```

### 3. Configure a API Key da Vultr

Crie um arquivo `.env` na raiz do projeto:

```env
VULTR_API_KEY=cole-sua-api-key-aqui
```

> Sem essa variavel, o servidor roda normalmente mas nao vai conseguir criar VMs.

### 4. Inicie o backend

```bash
pnpm dev
```

Isso vai subir:
- Servidor Express na porta **3100**
- PostgreSQL embarcado na porta **5488** (automatico, sem precisar instalar nada)

> O banco de dados e criado automaticamente na primeira execucao. Os dados ficam salvos na pasta `.pgdata/`.

### 5. Inicie o frontend (em outro terminal)

```bash
pnpm --filter @hiveclip/ui dev
```

Isso vai subir o Vite na porta **5173**. Ele ja faz proxy automatico das chamadas `/api/*` para o backend.

### 6. Acesse no browser

Abra **http://localhost:5173**

- Crie uma conta em **Register**
- Faca login
- Crie um **Board**
- Clique em **Provisionar VM** para criar uma maquina Windows na Vultr
- Quando o provisionamento terminar, acesse o **Desktop** (VNC) ou o **Launcher** pelo menu do board

---

## Outros comandos uteis

```bash
# Build de producao
pnpm build

# Rodar o build
node server/dist/index.js

# Verificar tipos TypeScript
pnpm typecheck

# Testes unitarios
pnpm test

# Testes E2E (Playwright)
pnpm test:e2e
```

---

## Variaveis de ambiente

| Variavel | Obrigatoria | Default | Descricao |
|----------|-------------|---------|-----------|
| `VULTR_API_KEY` | Sim (para VMs) | — | API Key da Vultr |
| `JWT_SECRET` | Nao | `hiveclip-dev-secret` | Chave para assinar tokens JWT |
| `PORT` | Nao | `3100` | Porta do servidor backend |

---

## Portas usadas

| Porta | O que roda |
|-------|------------|
| `3100` | Backend (API + proxies VNC/Launcher) |
| `5173` | Frontend Vite (so em desenvolvimento) |
| `5488` | PostgreSQL embarcado (local, automatico) |

---

## Problemas comuns

**O servidor nao inicia / erro de porta**
- Verifique se as portas 3100 e 5488 estao livres
- Se o Postgres embarcado travou, delete a pasta `.pgdata/` e reinicie

**Erro ao provisionar VM**
- Verifique se a `VULTR_API_KEY` esta correta no `.env`
- Verifique se o Python e o pywinrm estao instalados: `python3 -c "import winrm; print('ok')"`

**Frontend nao conecta no backend**
- O backend precisa estar rodando antes (`pnpm dev`)
- O Vite faz proxy automatico, entao acesse pela porta 5173, nao pela 3100
