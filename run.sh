#!/bin/bash
# Script para correr o Family Feud em Mac/Linux

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo ""
echo "========================================"
echo "   FAMILY FEUD - Iniciando..."
echo "========================================"
echo ""

# Função para abrir browser
open_browser() {
    sleep 3
    if command -v open &> /dev/null; then
        # Mac
        open http://localhost:8000
    elif command -v xdg-open &> /dev/null; then
        # Linux
        xdg-open http://localhost:8000
    else
        echo "[INFO] Abre manualmente: http://localhost:8000"
    fi
}

# Verificar se Python3 está instalado
if command -v python3 &> /dev/null; then
    echo "[OK] Python3 encontrado"
    echo "[*] Iniciando servidor em http://localhost:8000..."
    echo "[*] Abrindo browser em 3 segundos..."
    echo ""
    
    # Abrir browser em background
    open_browser &
    
    echo "========================================"
    echo "   SERVIDOR A CORRER!"
    echo "   URL: http://localhost:8000"
    echo "   Pressiona Ctrl+C para parar"
    echo "========================================"
    echo ""
    
    python3 -m http.server 8000
    exit 0
fi

# Se Python3 não existir, tentar Python
if command -v python &> /dev/null; then
    echo "[OK] Python encontrado"
    echo "[*] Iniciando servidor em http://localhost:8000..."
    echo "[*] Abrindo browser em 3 segundos..."
    echo ""
    
    # Abrir browser em background
    open_browser &
    
    echo "========================================"
    echo "   SERVIDOR A CORRER!"
    echo "   URL: http://localhost:8000"
    echo "   Pressiona Ctrl+C para parar"
    echo "========================================"
    echo ""
    
    python -m http.server 8000
    exit 0
fi

# Se nenhum Python, usar Node.js
if command -v npx &> /dev/null; then
    echo "[OK] Node.js encontrado"
    echo "[*] Iniciando servidor em http://localhost:8000..."
    echo "[*] Abrindo browser em 3 segundos..."
    echo ""
    
    # Abrir browser em background
    open_browser &
    
    echo "========================================"
    echo "   SERVIDOR A CORRER!"
    echo "   URL: http://localhost:8000"
    echo "   Pressiona Ctrl+C para parar"
    echo "========================================"
    echo ""
    
    npx http-server -p 8000 -c-1
    exit 0
fi

# Se nada funcionou
echo ""
echo "[ERRO] Nenhum servidor encontrado!"
echo "[INFO] Por favor instala Python ou Node.js"
echo ""
echo "[*] Abrindo index.html diretamente no browser..."
if command -v open &> /dev/null; then
    open index.html
else
    xdg-open index.html
fi
