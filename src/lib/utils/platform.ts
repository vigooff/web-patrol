import { Capacitor } from '@capacitor/core';

/**
 * True kalau app sedang jalan di dalam shell native Capacitor (Android),
 * false kalau jalan di browser biasa (desktop admin, atau browser mobile).
 *
 * SEMUA kode di src/lib/native/* WAJIB cek ini dulu sebelum manggil
 * native plugin — supaya web tetap jalan normal untuk admin yang masih
 * pakai laptop/browser.
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * 'android' | 'ios' | 'web' — berguna kalau nanti perlu behavior
 * berbeda per platform (sekarang fokus Android, tapi Capacitor
 * mendukung iOS juga kalau nanti dibutuhkan).
 */
export function getPlatform(): string {
  return Capacitor.getPlatform();
}
