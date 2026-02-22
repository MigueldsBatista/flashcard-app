# API — Flashcard App

## Variáveis de ambiente

- `SUPABASE_JWT_SECRET` (obrigatória): segredo JWT do projeto Supabase usado para validar `Authorization: Bearer <token>`.
- `SUPABASE_JWT_AUDIENCE` (opcional, padrão: `authenticated`): claim `aud` esperado no token.
- `RATE_LIMIT_MAX_REQUESTS` (opcional, padrão: `60`): número máximo de requisições por IP na janela.
- `RATE_LIMIT_WINDOW_SECONDS` (opcional, padrão: `60`): tamanho da janela do rate limit em segundos.
- `ALLOWED_ORIGINS` (opcional, padrão: `http://localhost:5173`): origens CORS separadas por vírgula.

## Endpoints

- `GET /api/health`: endpoint público para health-check.
- `POST /api/generate`: endpoint protegido por JWT do Supabase e limitado por IP.
