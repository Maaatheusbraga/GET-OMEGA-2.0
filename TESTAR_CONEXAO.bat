@echo off
chcp 65001 >nul
title GET OMEGA 2.0 - Teste de Conexao
color 0E

echo.
echo  ============================================================
echo    TESTE DE CONEXAO - GET OMEGA 2.0
echo  ============================================================
echo.

echo  [1] Processo Python rodando?
tasklist /FI "IMAGENAME eq python.exe" 2>nul | findstr /i python >nul
if errorlevel 1 (
    echo  [X] Nenhum python.exe encontrado
    echo      O backend NAO esta rodando. Execute INICIAR_SERVIDOR.bat
) else (
    echo  [OK] python.exe encontrado:
    tasklist /FI "IMAGENAME eq python.exe"
)
echo.

echo  [2] Porta 3001 em uso?
netstat -ano | findstr ":3001 " | findstr "LISTENING" >nul
if errorlevel 1 (
    echo  [X] Nada escutando na porta 3001
    echo      Execute INICIAR_SERVIDOR.bat e deixe a janela aberta
) else (
    echo  [OK] Porta 3001 ativa:
    netstat -ano | findstr ":3001 " | findstr "LISTENING"
)
echo.

echo  [3] Teste HTTP em 127.0.0.1:3001...
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3001' -UseBasicParsing -TimeoutSec 5; Write-Host '  [OK] Respondeu HTTP' $r.StatusCode; if ($r.Content -match 'GET OMEGA') { Write-Host '  [OK] Pagina GET OMEGA encontrada' } else { Write-Host '  [!] Respondeu mas conteudo inesperado' } } catch { Write-Host '  [X] FALHOU:' $_.Exception.Message }"
echo.

echo  [4] Teste HTTP em 192.168.2.4:3001...
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://192.168.2.4:3001' -UseBasicParsing -TimeoutSec 5; Write-Host '  [OK] Respondeu HTTP' $r.StatusCode } catch { Write-Host '  [X] FALHOU:' $_.Exception.Message }"
echo.

echo  ============================================================
echo    O QUE FAZER SE DEU [X]
echo  ============================================================
echo.
echo  1. Feche janelas antigas do GET OMEGA
echo  2. Execute INICIAR_SERVIDOR.bat como Administrador
echo  3. Execute LIBERAR_FIREWALL.bat como Administrador
echo  4. Rode este script de novo
echo  5. No navegador use: http://127.0.0.1:3001
echo     Se Chrome nao abrir, teste o Microsoft Edge
echo.
pause
