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
    echo    Para PARAR: Pressiona Ctrl+C
    echo ========================================
    echo.
    timeout /t 3 /nobreak >nul
    
    REM Tentar abrir Chrome, senão abre browser padrão
    if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
        start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "http://localhost:8000"
    ) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
        start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" "http://localhost:8000"
    ) else if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
        start "" "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" "http://localhost:8000"
    ) else (
        start http://localhost:8000
    )
    
    python -m http.server 8000
    echo.
    echo [*] Servidor parado!
    pause
    exit /b
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
    echo    Para PARAR: Pressiona Ctrl+C
    echo ========================================
    echo.
    timeout /t 3 /nobreak >nul
    
    REM Tentar abrir Chrome, senão abre browser padrão
    if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
        start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "http://localhost:8000"
    ) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
        start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" "http://localhost:8000"
    ) else if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
        start "" "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" "http://localhost:8000"
    ) else (
        start http://localhost:8000
    )
    
    python3 -m http.server 8000
    echo.
    echo [*] Servidor parado!
    pause
    exit /b
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
    echo    Para PARAR: Pressiona Ctrl+C
    echo ========================================
    echo.
    timeout /t 3 /nobreak >nul
    
    REM Tentar abrir Chrome, senão abre browser padrão
    if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
        start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "http://localhost:8000"
    ) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
        start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" "http://localhost:8000"
    ) else if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
        start "" "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" "http://localhost:8000"
    ) else (
        start http://localhost:8000
    )
    
    npx http-server -p 8000 -c-1
    echo.
    echo [*] Servidor parado!
    pause
    exit /b
)

REM Se nada funcionou
echo.
echo [ERRO] Nenhum servidor encontrado!
echo [INFO] Por favor instala Python ou Node.js
echo.
pause

