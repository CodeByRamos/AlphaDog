@echo off
REM Libera a porta do Metro (Expo) no Firewall do Windows.
REM
REM Existe porque o passo "abra o PowerShell como administrador" falha calado
REM quando a elevacao nao acontece: o comando roda, nao cria nada, e o celular
REM continua dando timeout sem explicacao.
REM
REM Uso: botao direito neste arquivo -> "Executar como administrador".

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo   ERRO: este arquivo precisa ser executado como ADMINISTRADOR.
    echo.
    echo   Feche esta janela, clique com o BOTAO DIREITO no arquivo
    echo   liberar-firewall.bat e escolha "Executar como administrador".
    echo.
    pause
    exit /b 1
)

echo.
echo   Criando regra de firewall para o Metro (portas 8081-8085)...
echo.

powershell -NoProfile -Command "Remove-NetFirewallRule -DisplayName 'Expo Metro' -ErrorAction SilentlyContinue; New-NetFirewallRule -DisplayName 'Expo Metro' -Direction Inbound -Protocol TCP -LocalPort 8081-8085 -Action Allow -Profile Any | Out-Null"

if %errorLevel% neq 0 (
    echo   Falhou ao criar a regra.
    pause
    exit /b 1
)

echo   Pronto. Regra "Expo Metro" criada.
echo.
echo   Agora, no celular (na mesma Wi-Fi CasaMonstro, sem dados moveis):
echo     http://192.168.1.103:8081
echo.
pause
