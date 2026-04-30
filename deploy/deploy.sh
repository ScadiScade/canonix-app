#!/bin/bash
# deploy.sh — запускать при каждом деплое
set -e

APP_DIR="/var/www/canonix"
BRANCH="main"

echo "=== Переход в директорию ==="
cd "$APP_DIR" || { echo "Нет директории $APP_DIR"; exit 1; }

echo "=== Pull кода ==="
if [ ! -d ".git" ]; then
  git clone https://github.com/ТВОЙ_РЕПО/canonix-app.git .
fi
git pull origin "$BRANCH"

echo "=== Установка зависимостей ==="
npm ci

echo "=== Генерация Prisma клиента ==="
npx prisma generate

echo "=== Миграция БД ==="
npx prisma db push

echo "=== Build ==="
npm run build

echo "=== Перезапуск PM2 ==="
pm2 delete canonix 2>/dev/null || true
pm2 start .next/standalone/server.js --name canonix -- -p 3001
pm2 save

echo "=== Деплой завершён! ==="