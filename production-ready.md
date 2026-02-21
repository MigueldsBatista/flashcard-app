# 🚀 Production Readiness — Ultra Focus

Itens necessários para tornar o app apto para produção real.

---

## 1. Autenticação & Segurança

| Item | Status | Prioridade |
|------|--------|------------|
| Login com Google (OAuth) | ❌ Ausente | 🔴 Alta |
| Forgot Password / Reset | ❌ Ausente | 🔴 Alta |
| Rate limiting por IP no backend | ❌ Ausente | 🔴 Alta |
| Autenticação no endpoint `/api/generate` | ❌ Ausente — qualquer um pode chamar | 🔴 Alta |
| Secrets expostos no `.env` (commitados no repo) | ⚠️ `.env` com chaves reais no repo | 🔴 Alta |
| CORS hardcoded para `localhost` apenas | ⚠️ Não funciona em produção | 🔴 Alta |
| Row-Level Security (RLS) no Supabase | ❓ Auditar | 🟡 Média |

---

## 2. Funcionalidades Faltantes (User Stories)

| User Story | Status |
|------------|--------|
| US-001: Push Notifications | ❌ Firebase messaging está comentado |
| US-002: Embaralhamento de Cards por Assunto | ❌ Não implementado |
| US-004: Bulk Create (texto estruturado) | ❌ Não implementado |
| US-005: Importação via Regex | ❌ Não implementado |
| US-006: LangChain Abstraction | ⚠️ Parcial |
| US-007: Exceções Customizadas | ⚠️ Parcial |

---

## 3. Infraestrutura & DevOps

| Item | Status | Prioridade |
|------|--------|------------|
| CI/CD pipeline (GitHub Actions) | ❌ Ausente | 🟡 Média |
| Variáveis de ambiente para produção no Vercel | ❓ Configurar | 🔴 Alta |
| Health check endpoint (`GET /api/health`) | ❌ Ausente | 🟢 Baixa |
| Logging estruturado (JSON) para produção | ❌ Básico | 🟢 Baixa |
| Error tracking (Sentry ou similar) | ❌ Ausente | 🟡 Média |

---

## 4. Frontend — Qualidade & UX

| Item | Status | Prioridade |
|------|--------|------------|
| Global error boundary (Vue `errorHandler`) | ❌ Ausente | 🟡 Média |
| Loading states / skeleton screens | ⚠️ Parcial | 🟢 Baixa |
| Form validation (email, senha mínima, etc.) | ⚠️ Parcial — HTML `required` apenas | 🟡 Média |
| Offline data sync (Service Worker + IndexedDB) | ❌ Ausente | 🟡 Média |
| SEO meta tags (`<title>`, `<meta description>`) | ❌ Ausente | 🟢 Baixa |
| 404 / Not Found page | ❌ Ausente | 🟢 Baixa |
| Confirmação antes de ações destrutivas | ❓ Verificar | 🟢 Baixa |

---

## 5. Backend — Robustez

| Item | Status | Prioridade |
|------|--------|------------|
| Input validation (tamanho máximo de texto/imagem) | ⚠️ Parcial | 🟡 Média |
| Request size limit | ❌ Sem limitação explícita | 🟡 Média |
| Timeout para chamadas ao LLM | ⚠️ Retry existe, mas sem timeout | 🟡 Média |
| HTTPS enforcement | ✅ Vercel automático | ✅ OK |
| Security headers (Helmet-like) | ❌ Ausente | 🟢 Baixa |

---

## 6. Testes

| Item | Status | Prioridade |
|------|--------|------------|
| Unit tests frontend (3 specs) | ⚠️ Cobertura baixa | 🟡 Média |
| Unit tests backend (2 specs) | ⚠️ Cobertura baixa | 🟡 Média |
| E2E tests (Playwright/Cypress) | ❌ Ausente | 🟡 Média |
| Test coverage report | ❌ Ausente | 🟢 Baixa |

---

## Top 10 — Ordem de Prioridade

1. 🔴 **Rotacionar e esconder secrets** — remover `.env` do repo, usar env vars do Vercel
2. 🔴 **CORS dinâmico** — ler origens permitidas de env var
3. 🔴 **Rate limiting por IP** no endpoint `/api/generate` (ex: `slowapi`)
4. 🔴 **Autenticar endpoint** — validar JWT do Supabase no backend
5. 🔴 **Login com Google** — adicionar OAuth via Supabase
6. 🔴 **Forgot Password** — adicionar fluxo de reset de senha
7. 🟡 **Push Notifications** — completar integração Firebase
8. 🟡 **Global error boundary** + Error tracking (Sentry)
9. 🟡 **Bulk Create** — implementar US-004/US-005
10. 🟡 **CI/CD** — GitHub Actions para lint + test + deploy

> **⚠️ Os itens 1–4 são bloqueadores de segurança** — sem eles, o app está vulnerável a abuso e vazamento de dados. Devem ser resolvidos antes de qualquer deploy público.
