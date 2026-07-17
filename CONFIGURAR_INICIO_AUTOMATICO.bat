@echo off
title GET OMEGA 2.0 - Inicio Automatico
color 0E

echo.
echo  ========================================
echo    Configurar inicio automatico
echo    (executar como Administrador)
echo  ========================================
echo.

cd /d "%~dp0"

set "SCRIPT=%~dp0INICIAR_SERVIDOR.bat"
set "TASK_NAME=GET OMEGA 2.0"

schtasks /query /tn "%TASK_NAME%" >nul 2>&1
if not errorlevel 1 (
    echo  Removendo tarefa antiga...
    schtasks /delete /tn "%TASK_NAME%" /f >nul
)

echo  Criando tarefa agendada para iniciar com o Windows...
schtasks /create /tn "%TASK_NAME%" /tr "\"%SCRIPT%\"" /sc onstart /ru SYSTEM /rl highest /f

if errorlevel 1 (
    echo.
    echo  ERRO: Execute este arquivo como Administrador.
    echo  Clique com botao direito ^> Executar como administrador
    pause
    exit /b 1
)

echo.
echo  Tarefa criada com sucesso!
echo  O GET OMEGA iniciara automaticamente quando o servidor ligar.
echo.
pause
