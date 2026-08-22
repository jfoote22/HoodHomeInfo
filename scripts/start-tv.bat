@echo off
REM Double-click to launch the Hood Canal Marine Dashboard full-screen on this TV/PC.
REM Edit the URL below to use the hosted Vercel version instead of the local server, e.g.
REM   set URL=https://hoodhomeinfo-justinfoote-gmailcoms-projects.vercel.app
set URL=
set THEME=command-center

if "%URL%"=="" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-tv.ps1" -Theme %THEME%
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-tv.ps1" -Url %URL% -Theme %THEME%
)
