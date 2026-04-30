#!/bin/bash
# setup-server.sh — запускать ОДИН РАЗ на VPS
set -e

echo "=== Обновление системы ==="
sudo apt update && sudo apt upgrade -y

echo "=== Установка Node.js 20 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo "=== Установка PM2 ==="
sudo npm install -g pm2

echo "=== Установка Nginx ==="
sudo apt install -y nginx

echo "=== Установка Certbot ==="
sudo apt install -y certbot python3-certbot-nginx

echo "=== Создание пользователя deploy ==="
sudo useradd -m -s /bin/bash deploy || true
sudo usermod -aG www-data deploy

echo "=== Создание директории приложения ==="
sudo mkdir -p /var/www/canonix
sudo chown deploy:www-data /var/www/canonix

echo "=== Готово! Теперь залей код и запусти deploy.sh ==="