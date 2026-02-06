import 'package:flutter/material.dart';

/// Crypto/Fintech Design System
/// Flat UI design with cryptocurrency styling
class CryptoScheme {
  // Core colors
  static const Color background = Color(0xFF0F172A); // Dark slate
  static const Color text = Color(0xFFF8FAFC); // Light slate
  static const Color primary = Color(0xFFF59E0B); // Amber/Gold - SYM token color
  static const Color secondary = Color(0xFF8B5CF6); // Purple - Crypto accent
  static const Color border = Color(0xFF334155); // Slate border
  static const Color muted = Color(0xFF64748B); // Muted text
  
  // Activity-specific colors
  static const Color dailyColor = Color(0xFFF59E0B); // Amber/Gold - matches SYM
  static const Color merchantColor = Color(0xFF3B82F6); // Blue
  static const Color modelDevColor = Color(0xFF10B981); // Green/Emerald
  
  // Status colors
  static const Color success = Color(0xFF10B981);
  static const Color error = Color(0xFFEF4444);
  static const Color warning = Color(0xFFF59E0B);
  static const Color info = Color(0xFF3B82F6);
  
  // Token colors
  static const Color aptosColor = Color(0xFF3B82F6); // Blue for APTOS
  static const Color symColor = Color(0xFFF59E0B); // Amber/Gold for SYM
}

/// App-wide theme configuration
class CryptoTheme {
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: CryptoScheme.background,
      colorScheme: const ColorScheme.dark(
        primary: CryptoScheme.primary,
        secondary: CryptoScheme.merchantColor,
        surface: CryptoScheme.border,
        error: CryptoScheme.error,
        onPrimary: CryptoScheme.background,
        onSecondary: CryptoScheme.text,
        onSurface: CryptoScheme.text,
        onError: CryptoScheme.text,
        onBackground: CryptoScheme.text,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: CryptoScheme.background,
        elevation: 0,
        foregroundColor: CryptoScheme.text,
        titleTextStyle: TextStyle(
          color: CryptoScheme.text,
          fontSize: 20,
          fontWeight: FontWeight.w600,
        ),
      ),
      cardTheme: CardThemeData(
        color: CryptoScheme.border.withOpacity(0.3),
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(
            color: CryptoScheme.border,
            width: 1,
          ),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: CryptoScheme.primary,
          foregroundColor: CryptoScheme.background,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
          textStyle: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 16,
            letterSpacing: 0.5,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: CryptoScheme.primary,
          textStyle: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 14,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: CryptoScheme.border.withOpacity(0.3),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(
            color: CryptoScheme.border,
            width: 1,
          ),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(
            color: CryptoScheme.border,
            width: 1,
          ),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(
            color: CryptoScheme.primary,
            width: 2,
          ),
        ),
      ),
    );
  }
}

