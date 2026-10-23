#!/data/data/com.termux/files/usr/bin/bash
# Instalador de CORTANABOT 2.0 para Termux (Android).
# Uso: bash termux-install.sh
set -euo pipefail
cd "$(dirname "$0")"

echo "==> Actualizando paquetes de Termux..."
pkg update -y
pkg upgrade -y

echo "==> Instalando Node.js y dependencias del sistema..."
if ! pkg install -y nodejs-lts; then
  pkg install -y nodejs
fi
pkg install -y npm

# git: comandos .carga/.git
# python: speed.py
# ffmpeg: stickers, conversiones de audio/video y miniaturas
# libwebp: soporte WebP para stickers
pkg install -y git python ffmpeg libwebp

echo "==> Versiones instaladas:"
node -v
npm -v

echo "==> Creando carpetas necesarias..."
mkdir -p sessions tmp src

echo "==> Instalando dependencias de npm..."
# .npmrc ya define legacy-peer-deps=true para no intentar instalar sharp.
npm install --no-audit --no-fund

echo ""
echo "✅ Instalación terminada."
echo "Inicia el bot con:"
echo "  npm start"
