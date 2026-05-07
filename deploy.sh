#!/bin/bash
# Script de deployment para Huella Bot
# Uso: bash deploy.sh TU_USUARIO_GITHUB

GITHUB_USER=${1:-"tu-usuario"}
REPO_NAME="huellabot"

echo ""
echo "🐾 Huella Bot — Deploy Script"
echo "================================"
echo ""

# 1. Instalar gh CLI si no está
if ! command -v gh &> /dev/null; then
  echo "📦 Instalando GitHub CLI..."
  curl -L https://github.com/cli/cli/releases/download/v2.50.0/gh_2.50.0_macOS_arm64.zip -o /tmp/gh.zip
  unzip -q /tmp/gh.zip -d /tmp/gh-cli
  sudo cp /tmp/gh-cli/gh_2.50.0_macOS_arm64/bin/gh /usr/local/bin/gh
  echo "✓ gh instalado"
fi

# 2. Autenticar con GitHub
echo "🔐 Autenticando con GitHub..."
gh auth login

# 3. Crear repo en GitHub
echo "📂 Creando repositorio en GitHub..."
gh repo create "$REPO_NAME" --public --source=. --push --description "Chatbot IA para veterinarias"

echo ""
echo "✅ Código en GitHub: https://github.com/$GITHUB_USER/$REPO_NAME"
echo ""
echo "🚀 Ahora despliega en Vercel:"
echo "   1. Ve a https://vercel.com/new"
echo "   2. Importa el repo: $REPO_NAME"
echo "   3. Agrega estas variables de entorno:"
echo ""
echo "      NEXT_PUBLIC_SUPABASE_URL=<tu_url>"
echo "      NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu_key>"
echo "      SUPABASE_SERVICE_ROLE_KEY=<tu_service_key>"
echo "      ANTHROPIC_API_KEY=<tu_key>"
echo "      NEXT_PUBLIC_APP_URL=https://<tu-proyecto>.vercel.app"
echo ""
echo "   4. Haz clic en Deploy"
echo ""
