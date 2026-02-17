# Agility Headless CLI - WSL Wrapper Script
# Usage: .\scripts\run-wsl.ps1 <command> [options]
# Example: .\scripts\run-wsl.ps1 run --xrpl rTEST --midnight mTEST --debug

param(
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$Arguments
)

$wslPath = "/home/anthony/CascadeProjects/Windsurf-Porject/agility-headless"
$argsString = $Arguments -join " "

Write-Host "[Agility] Running CLI via WSL..." -ForegroundColor Cyan
Write-Host ""

$command = "cd $wslPath && npm run cli -- $argsString"
wsl -e bash -c $command

exit $LASTEXITCODE
