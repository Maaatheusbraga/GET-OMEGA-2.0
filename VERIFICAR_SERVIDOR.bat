@echo off
chcp 65001 >nul
title GET OMEGA 2.0 - Diagnostico do Servidor
color 0B

echo.
echo  ============================================================
echo    GET OMEGA 2.0 - Verificacao do Servidor
echo    Rode este script NO SERVIDOR antes de instalar qualquer coisa
echo  ============================================================
echo.

echo  --- Sistema Operacional ---
ver
echo.

echo  --- Nome e IP do servidor ---
hostname
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do echo IP:%%a
echo.

echo  ============================================================
echo    1. NODE.JS (necessario para gerar o build do frontend)
echo  ============================================================
where node >nul 2>&1
if errorlevel 1 (
    echo  [X] Node.js NAO encontrado
    echo      Instalar: https://nodejs.org  ^(versao LTS^)
) else (
    for /f "delims=" %%v in ('node --version') do echo  [OK] Node.js %%v
    for /f "delims=" %%v in ('npm --version') do echo  [OK] npm %%v
)
echo.

echo  ============================================================
echo    2. PYTHON (necessario para o backend)
echo  ============================================================
where python >nul 2>&1
if errorlevel 1 (
    echo  [X] Python NAO encontrado
    echo      Instalar: https://python.org  ^(marcar "Add to PATH"^)
) else (
    for /f "delims=" %%v in ('python --version') do echo  [OK] %%v
    where pip >nul 2>&1
    if errorlevel 1 (
        echo  [?] pip nao encontrado no PATH
    ) else (
        for /f "delims=" %%v in ('pip --version') do echo  [OK] pip %%v
    )
)
echo.

echo  ============================================================
echo    3. ODBC DRIVER (necessario para conectar no SQL Server)
echo  ============================================================
set "ODBC_OK=0"
reg query "HKLM\SOFTWARE\ODBC\ODBCINST.INI\ODBC Driver 17 for SQL Server" >nul 2>&1
if not errorlevel 1 (
    echo  [OK] ODBC Driver 17 for SQL Server
    set "ODBC_OK=1"
)
reg query "HKLM\SOFTWARE\ODBC\ODBCINST.INI\ODBC Driver 18 for SQL Server" >nul 2>&1
if not errorlevel 1 (
    echo  [OK] ODBC Driver 18 for SQL Server
    set "ODBC_OK=1"
)
if "%ODBC_OK%"=="0" (
    echo  [X] ODBC Driver 17/18 NAO encontrado
    echo      Instalar: https://learn.microsoft.com/sql/connect/odbc/download-odbc-driver-for-sql-server
)
echo.

echo  ============================================================
echo    4. REDE - Acesso ao banco SRV-SISTEMA
echo  ============================================================
ping -n 2 SRV-SISTEMA >nul 2>&1
if errorlevel 1 (
    echo  [X] Nao foi possivel alcançar SRV-SISTEMA
    echo      Verifique rede/DNS com o TI antes de migrar
) else (
    echo  [OK] SRV-SISTEMA responde ao ping
)
echo.

echo  ============================================================
echo    5. PORTA 3001 (onde o GET OMEGA vai rodar)
echo  ============================================================
netstat -ano | findstr ":3001 " | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    echo  [OK] Porta 3001 livre
) else (
    echo  [!] Porta 3001 ja esta em uso:
    netstat -ano | findstr ":3001 " | findstr "LISTENING"
    echo      Outro programa pode estar usando essa porta
)
echo.

echo  ============================================================
echo    6. PASTA DO PROJETO
echo  ============================================================
if exist "%~dp0backend.py" (
    echo  [OK] backend.py encontrado nesta pasta
) else (
    echo  [X] backend.py NAO encontrado - copie o projeto completo para o servidor
)
if exist "%~dp0package.json" (
    echo  [OK] package.json encontrado
) else (
    echo  [X] package.json NAO encontrado
)
if exist "%~dp0dist\index.html" (
    echo  [OK] Build ja existe ^(pasta dist^)
) else (
    echo  [ ] Build ainda nao gerado ^(normal na primeira vez^)
)
echo.

echo  ============================================================
echo    RESUMO
echo  ============================================================
echo.
echo  Instale SOMENTE o que apareceu com [X] acima.
echo  Depois rode INICIAR_SERVIDOR.bat para subir a aplicacao.
echo.
pause
