<#
.SYNOPSIS
  Launch the Hood Canal Marine Dashboard full-screen on this machine's display (the TV).

.DESCRIPTION
  - If -Url is not given, starts the local production server (builds first if needed)
    and points the browser at http://localhost:3000.
  - Opens Microsoft Edge (or Chrome) in kiosk mode: full-screen, no tabs/toolbars,
    no "restore pages" nag, autoplay allowed, first-run dialogs suppressed.
  - Keeps the display awake by asking Windows not to sleep while it runs.

.EXAMPLE
  .\scripts\start-tv.ps1
  .\scripts\start-tv.ps1 -Url https://hoodhomeinfo-justinfoote-gmailcoms-projects.vercel.app
  .\scripts\start-tv.ps1 -Theme daylight-glass
#>
param(
  [string]$Url = "",
  [ValidateSet("command-center", "daylight-glass")]
  [string]$Theme = "command-center",
  [int]$Port = 3000
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

# ---- 1. Local server (only when no hosted URL was given) ----
if (-not $Url) {
  if (-not (Test-Path (Join-Path $root "node_modules"))) {
    Write-Host "Installing dependencies..." -ForegroundColor Cyan
    npm install
  }
  if (-not (Test-Path (Join-Path $root ".next\BUILD_ID"))) {
    Write-Host "Building production bundle (first run only)..." -ForegroundColor Cyan
    npm run build
  }
  $listening = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if (-not $listening) {
    Write-Host "Starting dashboard server on port $Port..." -ForegroundColor Cyan
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm start -- -p $Port" -WorkingDirectory $root -WindowStyle Minimized
    # Wait for the port to open (max ~60 s)
    $deadline = (Get-Date).AddSeconds(60)
    while ((Get-Date) -lt $deadline) {
      Start-Sleep -Seconds 2
      if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) { break }
    }
  }
  $Url = "http://localhost:$Port"
}

$sep = if ($Url.Contains("?")) { "&" } else { "?" }
$target = "$Url$sep" + "theme=$Theme"

# ---- 2. Find a browser ----
$candidates = @(
  "$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
)
$browser = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $browser) { throw "Neither Microsoft Edge nor Google Chrome was found." }

# Dedicated profile so kiosk settings never collide with your normal browsing.
$profileDir = Join-Path $env:LOCALAPPDATA "HoodCanalDashboardKiosk"
New-Item -ItemType Directory -Force -Path $profileDir | Out-Null

$args = @(
  "--kiosk", $target,
  "--edge-kiosk-type=fullscreen",
  "--user-data-dir=`"$profileDir`"",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-session-crashed-bubble",
  "--disable-infobars",
  "--disable-features=TranslateUI,msEdgeSidebarV2,msHubApps",
  "--autoplay-policy=no-user-gesture-required",
  "--overscroll-history-navigation=0",
  "--start-fullscreen",
  "--window-position=0,0",
  "--window-size=1920,1080"
)

# ---- 3. Keep Windows awake while the kiosk is up ----
$sig = @"
[System.Runtime.InteropServices.DllImport("kernel32.dll")]
public static extern uint SetThreadExecutionState(uint esFlags);
"@
try {
  $k = Add-Type -MemberDefinition $sig -Name "Kiosk" -Namespace "HoodCanal" -PassThru
  # ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED
  [void]$k::SetThreadExecutionState(0x80000000 -bor 0x00000001 -bor 0x00000002)
} catch { }

Write-Host "Opening $target in kiosk mode..." -ForegroundColor Green
Write-Host "Press Alt+F4 on the TV keyboard to exit." -ForegroundColor DarkGray
$proc = Start-Process -FilePath $browser -ArgumentList $args -PassThru
$proc.WaitForExit()
