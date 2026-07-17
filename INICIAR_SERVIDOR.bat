@echo off
title GET OMEGA 2.0 - Servidor
color 0A

echo.
echo  ========================================
echo    GET OMEGA 2.0 - Modo Servidor
echo  ========================================
echo.

cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
    echo  ERRO: Node.js nao encontrado. Instale em https://nodejs.org
    pause
    exit /b 1
)

where python >nul 2>&1
if errorlevel 1 (
    echo  ERRO: Python nao encontrado. Instale em https://python.org
    pause
    exit /b 1
)

echo  [1/3] Instalando dependencias do frontend...
call npm install
if errorlevel 1 goto :erro

echo  [2/3] Gerando build de producao...
call npm run build
if errorlevel 1 goto :erro

echo  [3/3] Instalando dependencias do backend...
pip install -r requirements.txt
if errorlevel 1 goto :erro

echo.
echo  ========================================
echo    Iniciando GET OMEGA 2.0...
echo.
echo    Acesso local:  http://localhost:3001
echo    Acesso rede:   http://IP-DO-SERVIDOR:3001
echo.
echo    Pressione Ctrl+C para encerrar.
echo  ========================================
echo.

python backend.py
goto :fim

:erro
echo.
echo  Falha na inicializacao. Verifique as mensagens acima.
pause
exit /b 1

:fim
