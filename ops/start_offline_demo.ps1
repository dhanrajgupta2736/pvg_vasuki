$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$demoDirectory = Join-Path $projectRoot 'docs/demo'
$runDirectory = Join-Path $projectRoot '.run'
if (-not (Test-Path -LiteralPath (Join-Path $demoDirectory 'offline.html'))) {
    throw 'Export a verified demo run with ops/export_demo.py first.'
}
try {
    $page = Invoke-WebRequest -Uri 'http://127.0.0.1:18888/offline.html' -UseBasicParsing -TimeoutSec 3
    if ($page.Content -match 'RECORDED RUN') {
        Write-Host 'Offline recorded demo: http://127.0.0.1:18888/offline.html'
        exit 0
    }
    throw 'Port 18888 is already serving another page.'
} catch {
    if (Get-NetTCPConnection -LocalPort 18888 -State Listen -ErrorAction SilentlyContinue) {
        throw 'Port 18888 is occupied. Close the existing server before starting the offline demo.'
    }
}
New-Item -ItemType Directory -Force -Path $runDirectory | Out-Null
$pythonPath = (Get-Command python).Source
$server = Start-Process -FilePath $pythonPath -ArgumentList @('-m', 'http.server', '18888', '--bind', '127.0.0.1') -WorkingDirectory $demoDirectory -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runDirectory 'offline-demo.log') -RedirectStandardError (Join-Path $runDirectory 'offline-demo-error.log')
$server.Id | Set-Content -LiteralPath (Join-Path $runDirectory 'offline-demo.pid')
Write-Host 'Offline recorded demo: http://127.0.0.1:18888/offline.html'
