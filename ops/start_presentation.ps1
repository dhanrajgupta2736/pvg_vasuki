$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runDirectory = Join-Path $projectRoot '.run'
New-Item -ItemType Directory -Force -Path $runDirectory | Out-Null
Set-Location -LiteralPath $projectRoot

try {
    $health = Invoke-RestMethod -Uri 'http://127.0.0.1:18000/api/health' -TimeoutSec 8
    if ($health.database -eq 'connected') {
        Write-Host 'Oracle dashboard is ready: http://127.0.0.1:18000'
        exit 0
    }
} catch { }

Write-Host 'Preparing a fresh temporary Oracle SSH session...'
python ops/oracle_bastion.py --renew
if ($LASTEXITCODE -ne 0) { throw 'Oracle session creation failed. Inspect the OCI diagnostic above.' }
$active = $false
for ($attempt = 0; $attempt -lt 15; $attempt++) {
    $state = Get-Content -LiteralPath (Join-Path $runDirectory 'bastion.json') -Raw | ConvertFrom-Json
    $check = python -c "import json,oci; from pathlib import Path; s=json.loads(Path('.run/bastion.json').read_text()); print(oci.bastion.BastionClient(oci.config.from_file()).get_session(s['session_id']).data.lifecycle_state)"
    if ($check -eq 'ACTIVE') { $active = $true; break }
    if ($check -in @('FAILED', 'DELETED')) { throw "Oracle session entered $check" }
    Start-Sleep -Seconds 4
}
if (-not $active) { throw 'Oracle session is still preparing. Run this script again after the agent finishes.' }

$pythonPath = (Get-Command python).Source
$tunnel = Start-Process -FilePath $pythonPath -ArgumentList @('ops/oracle_ssh.py', '--tunnel') -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runDirectory 'presentation-tunnel.log') -RedirectStandardError (Join-Path $runDirectory 'presentation-tunnel-error.log')
$tunnel.Id | Set-Content -LiteralPath (Join-Path $runDirectory 'presentation-tunnel.pid')
for ($attempt = 0; $attempt -lt 15; $attempt++) {
    try {
        $health = Invoke-RestMethod -Uri 'http://127.0.0.1:18000/api/health' -TimeoutSec 4
        if ($health.database -eq 'connected') {
            Write-Host 'Oracle dashboard is ready: http://127.0.0.1:18000'
            Write-Host 'n8n: http://127.0.0.1:15678'
            exit 0
        }
    } catch { }
    Start-Sleep -Seconds 2
}
throw 'The tunnel did not become ready. Check .run/presentation-tunnel-error.log.'
