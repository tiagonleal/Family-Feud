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
    echo ========================================
    echo    SERVIDOR A CORRER!
    echo    URL: http://localhost:8000
    echo.
    echo    Para PARAR: Fecha esta janela
    echo ========================================
    echo.
    timeout /t 3 /nobreak >nul
    start http://localhost:8000
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
    echo ========================================
    echo    SERVIDOR A CORRER!
    echo    URL: http://localhost:8000
    echo.
    echo    Para PARAR: Fecha esta janela
    echo ========================================
    echo.
    timeout /t 3 /nobreak >nul
    start http://localhost:8000
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
    echo ========================================
    echo    SERVIDOR A CORRER!
    echo    URL: http://localhost:8000
    echo.
    echo    Para PARAR: Fecha esta janela
    echo ========================================
    echo.
    timeout /t 3 /nobreak >nul
    start http://localhost:8000
    npx http-server -p 8000 -c-1
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
