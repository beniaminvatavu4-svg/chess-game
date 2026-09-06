# Chess Live Event - Local Server Launcher
# Requires: Node.js, ngrok (https://ngrok.com/download)

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  Chess Live Event - Local Server  " -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check ngrok
if (-not (Get-Command "ngrok" -ErrorAction SilentlyContinue)) {
    Write-Host "EROARE: ngrok nu e instalat." -ForegroundColor Red
    Write-Host "Descarca de la: https://ngrok.com/download" -ForegroundColor Yellow
    Write-Host "Sau cu winget: winget install ngrok" -ForegroundColor Yellow
    Read-Host "Apasa Enter pentru a iesi"
    exit 1
}

# Build
Write-Host "Se construieste proiectul..." -ForegroundColor Yellow
Set-Location $PSScriptRoot
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build esuat!" -ForegroundColor Red
    Read-Host "Apasa Enter pentru a iesi"
    exit 1
}
Write-Host "Build OK" -ForegroundColor Green

# Static domain (set NGROK_DOMAIN in your environment to use a fixed URL)
# e.g. $env:NGROK_DOMAIN = "your-static-domain.ngrok-free.app"
$staticDomain = $env:NGROK_DOMAIN

# Start ngrok in background
Write-Host ""
Write-Host "Se porneste ngrok..." -ForegroundColor Yellow
if ($staticDomain) {
    $ngrokProc = Start-Process "ngrok" -ArgumentList "http --domain=$staticDomain 3000" -PassThru -WindowStyle Minimized
} else {
    $ngrokProc = Start-Process "ngrok" -ArgumentList "http 3000" -PassThru -WindowStyle Minimized
}

# Wait for ngrok to be ready
$publicUrl = $null
for ($i = 0; $i -lt 10; $i++) {
    Start-Sleep 1
    try {
        $tunnels = Invoke-RestMethod "http://localhost:4040/api/tunnels" -ErrorAction Stop
        $https = $tunnels.tunnels | Where-Object { $_.proto -eq "https" }
        if ($https) {
            $publicUrl = $https.public_url
            break
        }
    } catch { }
}

if (-not $publicUrl) {
    Write-Host "Nu s-a putut obtine URL-ul ngrok." -ForegroundColor Red
    $ngrokProc | Stop-Process -ErrorAction SilentlyContinue
    Read-Host "Apasa Enter pentru a iesi"
    exit 1
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "  HOST (tu):   $publicUrl/host" -ForegroundColor Green
Write-Host "  WATCH:       $publicUrl/watch" -ForegroundColor Green
Write-Host "  JOIN:        $publicUrl/join" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Apasa Ctrl+C pentru a opri serverul." -ForegroundColor Gray
Write-Host ""

# Start server
$env:CLIENT_URL = $publicUrl
$env:PORT = "3000"
node backend/dist/server.js
