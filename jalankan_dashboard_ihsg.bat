@echo off
title PintarSaham Dashboard IHSG & Saham IDX (Live yfinance)
echo ========================================================
echo   PintarSaham Intelligence - Live Yahoo Finance
echo   Mengambil data IHSG (^JKSE) & Saham IDX...
echo ========================================================
python fetch_market_data.py
echo.
echo ========================================================
echo   Menjalankan Local Server di http://localhost:8080
echo ========================================================
timeout /t 1 >nul
start "" "http://localhost:8080/PintarSaham_Dashboard_Interaktif.html"
python server.py
pause
