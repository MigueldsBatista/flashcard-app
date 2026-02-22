# 🚀 Production Readiness — Ultra Focus

Checklist para tornar o app apto para produção pública.

> Última auditoria rápida: **2026-02-21**

---

## 1. Autenticação & Segurança

| Item | Status Atual | Prioridade |
|------|--------------|------------|
| Login com Google (OAuth) | ✅ Implementado no frontend (`signInWithOAuth`) | 🟢 Baixa |
| Forgot Password / Reset | ❌ Ausente | 🔴 Alta |
| Rate limiting por IP no backend | ❌ Ausente | 🔴 Alta |
| Autenticação no endpoint `/api/generate` | ❌ Ausente — endpoint público | 🔴 Alta |
| Secrets no repositório | ⚠️ `.env` não encontrado no workspace; **confirmar rotação** e limpeza no remoto | 🔴 Alta |
| CORS dinâmico por variável de ambiente | ❌ Ausente — `allow_origins` hardcoded com localhost/LAN | 🔴 Alta |
| Row-Level Security (RLS) no Supabase | ❓ Auditar políticas por tabela | 🟡 Média |

---

## 2. Funcionalidades Faltantes (User Stories)

| User Story | Status |
|------------|--------|
| US-001: Push Notifications | ❌ Firebase Messaging comentado/incompleto |
| US-002: Embaralhamento de Cards por Assunto | ❌ Não implementado |
| US-004: Bulk Create (texto estruturado) | ❌ Não implementado |
| US-005: Importação via Regex | ❌ Não implementado |
| US-006: LangChain Abstraction | ⚠️ Parcial |
| US-007: Exceções customizadas | ⚠️ Parcial |

---

## 3. Infraestrutura & DevOps

| Item | Status Atual | Prioridade |
|------|--------------|------------|
| CI/CD pipeline (GitHub Actions) | ❌ Ausente (`.github/workflows` não encontrado) | 🟡 Média |
| Variáveis de ambiente em produção (Vercel) | ❓ Configurar e validar | 🔴 Alta |
| Health check endpoint (`GET /api/health`) | ❌ Ausente | 🟢 Baixa |
| Logging estruturado (JSON) | ❌ Básico | 🟢 Baixa |
| Error tracking (Sentry ou similar) | ❌ Ausente | 🟡 Média |

---

## 4. Frontend — Qualidade & UX

| Item | Status Atual | Prioridade |
|------|--------------|------------|
| Global error boundary (Vue `app.config.errorHandler`) | ❌ Ausente | 🟡 Média |
| Loading states / skeleton screens | ⚠️ Parcial | 🟢 Baixa |
| Form validation (email, senha mínima etc.) | ⚠️ Parcial | 🟡 Média |
| Offline sync (Service Worker + IndexedDB) | ❌ Ausente | 🟡 Média |
| SEO meta tags (`title`, `description`) | ❌ Ausente | 🟢 Baixa |
| 404 / Not Found route | ❌ Ausente | 🟢 Baixa |
| Confirmação para ações destrutivas | ❓ Verificar por fluxo | 🟢 Baixa |

---

## 5. Backend — Robustez

| Item | Status Atual | Prioridade |
|------|--------------|------------|
| Input validation (tamanho máximo de texto/imagem) | ⚠️ Parcial | 🟡 Média |
| Request size limit | ❌ Sem limitação explícita | 🟡 Média |
| Timeout para chamadas ao LLM | ⚠️ Retry existe, timeout explícito não identificado | 🟡 Média |
| HTTPS enforcement | ✅ Vercel automático | ✅ OK |
| Security headers (Helmet-like) | ❌ Ausente | 🟢 Baixa |

---

## 6. Testes

| Item | Status Atual | Prioridade |
|------|--------------|------------|
| Unit tests frontend | ⚠️ 3 specs (`src/__tests__`) | 🟡 Média |
| Unit tests backend | ⚠️ 2 specs (`api/tests`) | 🟡 Média |
| E2E tests (Playwright/Cypress) | ❌ Ausente | 🟡 Média |
| Coverage report | ❌ Ausente | 🟢 Baixa |

---

## Top 10 — Ordem de Prioridade (Atualizada)

1. 🔴 **Fechar risco de secrets** — rotacionar chaves e confirmar limpeza do histórico remoto
2. 🔴 **Autenticar `/api/generate`** — validar JWT do Supabase no backend
3. 🔴 **Rate limiting por IP** no `/api/generate` (ex.: `slowapi`)
4. 🔴 **CORS dinâmico** por env var (`ALLOWED_ORIGINS`)
5. 🔴 **Forgot Password / Reset** no fluxo de autenticação
6. 🟡 **Push Notifications (US-001)** — concluir integração Firebase
7. 🟡 **Global error boundary + Sentry**
8. 🟡 **Bulk Create / Regex import (US-004/US-005)**
9. 🟡 **CI/CD (lint + testes + deploy)**
10. 🟡 **E2E + coverage mínimo por módulo crítico**

> **⚠️ Bloqueadores para deploy público:** itens 1–4.
