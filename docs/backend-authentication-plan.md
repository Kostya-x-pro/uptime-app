# Backend-аутентификация, GORM и Docker

## Summary

Использовать **GORM v2** с драйвером PostgreSQL (`gorm.io/driver/postgres`) как ORM. Он подходит для небольшого сервиса без codegen, поддерживает PostgreSQL и явные транзакции, необходимые для безопасной ротации refresh-сессий. Миграции остаются версионированными SQL-файлами, а не `AutoMigrate`.

## Key Changes

- Добавить зависимости GORM, PostgreSQL-драйвер и инструмент выполнения SQL-миграций; выделить репозитории пользователей и refresh-сессий с интерфейсами на уровне сервисов.
- Выполнять регистрацию, вход и refresh через сервисный слой; для refresh использовать явную GORM-транзакцию и блокировку/условное обновление сессии, чтобы один refresh-токен мог быть использован только один раз.
- Создать миграции:
  - `users`: UUID, нормализованный уникальный `email`, обязательный `name` длиной 2–100 символов, bcrypt-хеш пароля, timestamps;
  - `refresh_sessions`: ID, `user_id`, SHA-256 хеш refresh-токена, `expires_at`, `created_at`, `revoked_at`.
- Реализовать `/api/v1/auth/register`, `/login`, `/refresh`, `/logout`:
  - регистрация принимает `{email, name, password}` и создаёт пользователя с первой сессией;
  - вход создаёт отдельную независимую сессию;
  - refresh читает refresh-токен только из cookie, отзывает старую сессию и создаёт новую в одной транзакции;
  - logout отзывает только сессию из текущей cookie.
- Возвращать `{ "accessToken": "..." }`; access token — HS256 JWT со сроком 24 часа и claims `sub`, `iat`, `exp`, `type: "access"`.
- Refresh-токен — случайная непрозрачная строка, срок 30 дней, хранится только как хеш. Cookie: `HttpOnly`, `SameSite=Lax`, `Path=/api/v1/auth`, `Secure` управляется `COOKIE_SECURE`.
- Добавить `Dockerfile` с multi-stage сборкой и `docker-compose.yml`:
  - `api` запускает миграции и сервис на `8080`;
  - `postgres` использует named volume и healthcheck;
  - API ожидает healthcheck БД, получает `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_ORIGIN`, `COOKIE_SECURE` из окружения; JWT-секрет не имеет дефолтного значения.
- Настроить CORS с credentials только для `FRONTEND_ORIGIN`; добавить описание переменных и команды `docker compose up --build` в README.

## Test Plan

- Тесты GORM-репозиториев и сервисов: уникальность email, валидация name/password, корректное хеширование.
- Успешный login и несколько параллельных сессий одного пользователя.
- Refresh выдаёт новый JWT/cookie, а предыдущий refresh-токен и повторное его использование возвращают 401; конкурентные refresh-запросы допускают успех только одного.
- Logout отзывает только текущую сессию.
- JWT claims, CORS, конфигурация, миграции и запуск `docker compose up --build`.
- Выполнить `gofmt`, `go test ./...` и `go vet ./...`.

## Assumptions

- PostgreSQL — единственная БД первой версии.
- GORM используется для запросов и транзакций; структура БД меняется только через проверяемые SQL-миграции.
- Подтверждение email, восстановление пароля, отзыв всех сессий и защищённые бизнес-маршруты не входят в эту итерацию.
