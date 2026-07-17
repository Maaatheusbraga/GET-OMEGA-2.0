@echo off
title GET OMEGA 2.0 - Inicializando...
color 0A

echo.
echo  ========================================
echo    GET OMEGA 2.0 - Modo Desenvolvimento
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
echo    Acesso rede:   http://SEU-IP:3000
echo.
echo    Para rodar no SERVIDOR da empresa, use:
echo    INICIAR_SERVIDOR.bat
echo  ========================================
echo.

start http://localhost:3000

exit
