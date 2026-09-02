@echo off
title Bjorka System - Full Auto Patch ^& Seed v13 (Fixed Scripts)
color 0A

echo ====================================================================
echo          STARTING FULL BJORKA AUTO PATCH + SEED CORE TO v13
echo ====================================================================
echo.

cd /d "%~dp0"

echo [1/8] Menginstal Dependensi Project Bawaan (npm install)...
call npm install

echo.
echo [2/8] Menginstal Library Tambahan (dotenvx, dll)...
call npm install @dotenvx/dotenvx

echo.
echo [3/8] Membuka proteksi keamanan rute (Next.js 16 Proxy Convention)...
if exist "src\middleware.ts" (
    echo [!] Mendeteksi konvensi lama src/middleware.ts, menghapus...
    del /f /q "src\middleware.ts"
)
if exist "D:\backup\webpatrol\proxy.ts" (
    copy /Y "D:\backup\webpatrol\proxy.ts" "src\proxy.ts"
)

echo.
echo [4/8] Menyuntikkan Fix Geofence murni ke API Patrol Start...
if exist "D:\backup\webpatrol\start\route.ts" (
    if not exist "src\app\api\v1\patrol\start" mkdir "src\app\api\v1\patrol\start"
    copy /Y "D:\backup\webpatrol\start\route.ts" "src\app\api\v1\patrol\start\route.ts"
)

echo.
echo [5/8] Memperbarui API Laporan Excel (Presensi ^& Payroll)...
if exist "D:\backup\webpatrol\report-attendances\route.ts" (
    if not exist "src\app\api\v1\reports\attendances" mkdir "src\app\api\v1\reports\attendances"
    copy /Y "D:\backup\webpatrol\report-attendances\route.ts" "src\app\api\v1\reports\attendances\route.ts"
)
if exist "D:\backup\webpatrol\report-payroll\route.ts" (
    if not exist "src\app\api\v1\reports\payroll" mkdir "src\app\api\v1\reports\payroll"
    copy /Y "D:\backup\webpatrol\report-payroll\route.ts" "src\app\api\v1\reports\payroll\route.ts"
)

echo.
echo [6/8] Menjalankan Master Database Seeding...
:: FIX: Menggunakan 'npm run seed' sesuai package.json v13
call npm run seed

echo.
echo [7/8] Menjalankan Demo/Dummy Data Seeding...
:: FIX: Menggunakan 'npm run seed:demo' sesuai package.json v13
call npm run seed:demo

echo.
echo [8/8] Membersihkan Cache Sistem Next.js (Turbopack Refresh)...
if exist ".next" (
    rmdir /s /q ".next"
)

echo.
echo ====================================================================
echo         ALL PATCHES AND SEEDING APPLIED PERFECTLY BY BJORKA
echo ====================================================================
echo.
pause