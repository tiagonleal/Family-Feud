@echo off
REM Script para correr o Family Feud em Windows

cd /d "%~dp0"

echo.
echo ========================================
echo    FAMILY FEUD - Iniciando...
echo ========================================
echo.

REM Verificar se Python está instalado
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Python encontrado
    echo [*] Iniciando servidor em http://localhost:8000...
    echo [*] Abrindo browser em 3 segundos...
    echo.
    start /B python -m http.server 8000
    timeout /t 3 /nobreak >nul
    start http://localhost:8000
    echo.
    echo ========================================
    echo    SERVIDOR A CORRER!
    echo    URL: http://localhost:8000
    echo    Pressiona Ctrl+C para parar
    echo ========================================
    echo.
    python -m http.server 8000
    goto end
)

REM Se Python não existir, tentar Python3
python3 --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Python3 encontrado
    echo [*] Iniciando servidor em http://localhost:8000...
    echo [*] Abrindo browser em 3 segundos...
    echo.
    start /B python3 -m http.server 8000
    timeout /t 3 /nobreak >nul
    start http://localhost:8000
    echo.
    echo ========================================
    echo    SERVIDOR A CORRER!
    echo    URL: http://localhost:8000
    echo    Pressiona Ctrl+C para parar
    echo ========================================
    echo.
    python3 -m http.server 8000
    goto end
)

REM Se nenhum Python, usar Node.js
node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Node.js encontrado
    echo [*] Iniciando servidor em http://localhost:8000...
    echo [*] Abrindo browser em 3 segundos...
    echo.
    timeout /t 3 /nobreak >nul
    start http://localhost:8000
    echo.
    echo ========================================
    echo    SERVIDOR A CORRER!
    echo    URL: http://localhost:8000
    echo    Pressiona Ctrl+C para parar
    echo ========================================
    echo.
    npx http-server -p 8000 -c-1 -o
    goto end
)

REM Se nada funcionou
echo [ERRO] Nenhum servidor encontrado!
echo [INFO] Por favor instala Python ou Node.js
echo.
echo [*] Abrindo index.html diretamente no browser...
start index.html
pause

:end
