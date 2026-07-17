@echo off
title GET OMEGA 2.0 - Firewall
color 0E

echo.
echo  Liberando porta 3001 no Firewall do Windows...
echo  (executar como Administrador)
echo.

netsh advfirewall firewall add rule name="GET OMEGA 2.0" dir=in action=allow protocol=TCP localport=3001

if errorlevel 1 (
    echo  ERRO: Execute como Administrador.
) else (
    echo  Porta 3001 liberada com sucesso!
)

echo.
pause
