import 'package:flutter/material.dart';

/// "Ledger book" direction: warm paper surfaces, deep emerald ink for money in,
/// terracotta for money out, tabular figures so columns of taka line up.
abstract final class AppColors {
  static const ink = Color(0xFF0F2A22);
  static const emerald = Color(0xFF0B6E4F);
  static const emeraldDeep = Color(0xFF064532);
  static const mint = Color(0xFFDDF1E7);
  static const paper = Color(0xFFF7F4EC);
  static const card = Color(0xFFFFFDF8);
  static const rule = Color(0xFFE6E0D2);
  static const muted = Color(0xFF6B6A61);
  static const loss = Color(0xFFB5472B);
  static const lossSoft = Color(0xFFF8E3DA);
  static const amber = Color(0xFFB7791F);
  static const amberSoft = Color(0xFFFBEFD5);
  static const violet = Color(0xFF5B4BB7);
  static const violetSoft = Color(0xFFE9E6FA);
}

const List<FontFeature> tabular = [FontFeature.tabularFigures()];

ThemeData buildTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: AppColors.emerald,
    surface: AppColors.paper,
    primary: AppColors.emerald,
    error: AppColors.loss,
  );
  final base = ThemeData(colorScheme: scheme, useMaterial3: true);
  final text = base.textTheme.apply(
    bodyColor: AppColors.ink,
    displayColor: AppColors.ink,
  );
  return base.copyWith(
    scaffoldBackgroundColor: AppColors.paper,
    textTheme: text.copyWith(
      headlineMedium: text.headlineMedium?.copyWith(
        fontWeight: FontWeight.w800,
        letterSpacing: -0.8,
      ),
      titleLarge: text.titleLarge?.copyWith(
        fontWeight: FontWeight.w800,
        letterSpacing: -0.4,
      ),
      titleMedium: text.titleMedium?.copyWith(fontWeight: FontWeight.w700),
      labelSmall: text.labelSmall?.copyWith(
        letterSpacing: 1.1,
        fontWeight: FontWeight.w700,
      ),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.paper,
      surfaceTintColor: Colors.transparent,
      foregroundColor: AppColors.ink,
      centerTitle: false,
      titleTextStyle: TextStyle(
        color: AppColors.ink,
        fontSize: 22,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.5,
      ),
    ),
    cardTheme: CardThemeData(
      color: AppColors.card,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: const BorderSide(color: AppColors.rule),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: AppColors.card,
      indicatorColor: AppColors.mint,
      surfaceTintColor: Colors.transparent,
      labelTextStyle: WidgetStateProperty.resolveWith(
        (states) => TextStyle(
          fontSize: 11.5,
          fontWeight: states.contains(WidgetState.selected)
              ? FontWeight.w800
              : FontWeight.w500,
          color: states.contains(WidgetState.selected)
              ? AppColors.emeraldDeep
              : AppColors.muted,
        ),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.card,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: AppColors.rule),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: AppColors.rule),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: AppColors.emerald, width: 1.6),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        textStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
      ),
    ),
    dividerTheme: const DividerThemeData(
      color: AppColors.rule,
      space: 1,
      thickness: 1,
    ),
    snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
  );
}
