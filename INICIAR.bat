@echo off
title GET OMEGA 2.0 - Inicializando...
color 0A

echo.
echo  ========================================
echo    GET OMEGA 2.0 - Iniciando sistema...
echo  ========================================
echo.

cd /d "%~dp0"

echo  [1/2] Iniciando Backend Python (porta 3001)...
start "GET OMEGA - Backend" cmd /k "cd /d %~dp0 && python backend.py"

timeout /t 3 /nobreak >nul

echo  [2/2] Iniciando Frontend (porta 3000)...
start "GET OMEGA - Frontend" cmd /k "cd /d %~dp0 && npm run preview"

timeout /t 5 /nobreak >nul

echo.
echo  ========================================
echo    Sistema iniciado com sucesso!
echo.
echo    Acesso local:  http://localhost:3000
echo    Acesso rede:   http://192.168.2.189:3000
echo  ========================================
echo.

start http://localhost:3000

exit
