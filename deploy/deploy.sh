#!/bin/bash
# deploy.sh — запускать на сервере при каждом деплое
# Usage: ./deploy.sh [--skip-pull] [--skip-migrate] [--skip-build]
set -euo pipefail

APP_DIR="/var/www/canonix"
BRANCH="main"
PM2_NAME="canonix"
PORT=3001

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

step()   { echo -e "\n${CYAN}▸ $1${NC}"; }
ok()     { echo -e "  ${GREEN}✓ $1${NC}"; }
warn()   { echo -e "  ${YELLOW}⚠ $1${NC}"; }
fail()   { echo -e "  ${RED}✗ $1${NC}"; exit 1; }

# Parse flags
SKIP_PULL=0
SKIP_MIGRATE=0
SKIP_BUILD=0
for arg in "$@"; do
  case "$arg" in
    --skip-pull)    SKIP_PULL=1 ;;
    --skip-migrate) SKIP_MIGRATE=1 ;;
    --skip-build)   SKIP_BUILD=1 ;;
    --help|-h)
      echo "Usage: ./deploy.sh [--skip-pull] [--skip-migrate] [--skip-build]"
      echo ""
      echo "  --skip-pull      Skip git pull (useful when local changes)"
      echo "  --skip-migrate   Skip Prisma migration"
      echo "  --skip-build     Skip npm run build"
      exit 0
      ;;
  esac
done

START_TIME=$SECONDS

# ─── 1. Navigate ──────────────────────────────────────────────
step "Переход в $APP_DIR"
cd "$APP_DIR" || fail "Нет директории $APP_DIR"
ok "OK"

# ─── 2. Git pull ──────────────────────────────────────────────
if [ "$SKIP_PULL" -eq 0 ]; then
  step "Pull кода ($BRANCH)"
  if [ ! -d ".git" ]; then
    fail "Нет .git — клонируйте репозиторий вручную"
  fi

  # Stash local changes if any
  STASHED=0
  if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
    warn "Есть незакоммиченные изменения — делаю git stash"
    git stash
    STASHED=1
  fi

  git pull origin "$BRANCH"
  ok "Код обновлён"

  if [ "$STASHED" -eq 1 ]; then
    step "Восстанавливаю stash"
    git stash pop || warn "Не удалось применить stash — проверьте конфликты"
  fi
else
  step "Pull кода — ПРОПУСК"
fi

# ─── 3. Dependencies ──────────────────────────────────────────
step "Установка зависимостей"
npm ci --production=false 2>&1 | tail -1
ok "Зависимости установлены"

# ─── 4. Prisma ────────────────────────────────────────────────
step "Генерация Prisma клиента"
npx prisma generate
ok "Клиент сгенерирован"

if [ "$SKIP_MIGRATE" -eq 0 ]; then
  step "Миграция БД"
  npx prisma db push 2>&1 | tail -3
  ok "БД обновлена"
else
  step "Миграция БД — ПРОПУСК"
fi

# ─── 5. Build ─────────────────────────────────────────────────
if [ "$SKIP_BUILD" -eq 0 ]; then
  step "Build"
  if npm run build 2>&1 | tail -20; then
    ok "Build успешен"
  else
    fail "Build упал — проверьте ошибки выше"
  fi

  # Copy files needed by standalone output
  step "Подготовка standalone"
  STANDALONE=".next/standalone"
  if [ -d "$STANDALONE" ]; then
    cp -r .next/static "$STANDALONE/.next/static"
    cp -r public "$STANDALONE/public" 2>/dev/null || true
    cp .env "$STANDALONE/.env" 2>/dev/null || warn "Нет .env — убедитесь что переменные заданы в окружении"
    ok "static + public + .env скопированы в standalone"
  fi
else
  step "Build — ПРОПУСК"
fi

# ─── 6. Restart PM2 ───────────────────────────────────────────
step "Перезапуск PM2 ($PM2_NAME)"
if pm2 describe "$PM2_NAME" > /dev/null 2>&1; then
  pm2 restart "$PM2_NAME"
  ok "PM2 процесс перезапущен"
else
  pm2 delete "$PM2_NAME" 2>/dev/null || true
  if [ -f ".next/standalone/server.js" ]; then
    pm2 start .next/standalone/server.js --name "$PM2_NAME" -- -p "$PORT"
  else
    pm2 start npx --name "$PM2_NAME" -- next start -p "$PORT"
  fi
  pm2 save
  ok "PM2 процесс создан"
fi

# ─── 7. Health check ──────────────────────────────────────────
step "Health check"
sleep 2
if curl -sf -o /dev/null "http://localhost:$PORT" 2>/dev/null; then
  ok "Сервер отвечает на :$PORT"
else
  warn "Сервер не отвечает на :$PORT — проверьте логи: pm2 logs $PM2_NAME"
fi

# ─── Done ──────────────────────────────────────────────────────
ELAPSED=$(( SECONDS - START_TIME ))
echo -e "\n${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  Деплой завершён за ${ELAPSED}s${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}""