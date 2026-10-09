@echo off
title PintarSaham Dashboard IHSG & Saham IDX
echo ========================================================
echo   PintarSaham Intelligence - Dashboard Saham IDX
echo ========================================================
echo.
echo ========================================================
echo   Menjalankan Local Server di http://localhost:8080
echo ========================================================
timeout /t 1 >nul
start "" "http://localhost:8080/"
python server.py
pause

