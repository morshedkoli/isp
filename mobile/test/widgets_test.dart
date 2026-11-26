import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:isp_admin/domain/models.dart';
import 'package:isp_admin/ui/forms.dart';
import 'package:isp_admin/ui/login_screen.dart';
import 'package:isp_admin/ui/setup_screen.dart';
import 'package:isp_admin/ui/theme.dart';

Widget host(Widget child) => MaterialApp(
  theme: buildTheme(),
  home: Scaffold(body: child),
);

void main() {
  testWidgets('setup screen asks for a connection string', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: buildTheme(),
        home: SetupScreen(onConnected: () {}),
      ),
    );
    expect(find.text('Connect your database'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Connect'), findsOneWidget);
  });

  testWidgets('login screen validates empty input without a network call', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: buildTheme(),
        home: LoginScreen(onLoggedIn: (_) {}, onChangeDatabase: () {}),
      ),
    );
    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pump();
    expect(find.text('Enter your email and password.'), findsOneWidget);
  });

  testWidgets('hotspot form prices from the package table', (tester) async {
    HotspotSaleInput? saved;
    await tester.pumpWidget(
      host(
        SingleChildScrollView(
          child: HotspotSaleForm(
            initialDate: DateTime.utc(2026, 11, 1),
            package: 'THIRTY_DAY',
            onSave: (input) async {
              saved = input;
              return false;
            },
          ),
        ),
      ),
    );
    expect(find.text('৳200'), findsOneWidget);

    await tester.enterText(find.widgetWithText(TextField, 'Quantity'), '3');
    await tester.enterText(find.widgetWithText(TextField, 'Discount'), '50');
    await tester.pump();
    expect(find.text('৳550'), findsOneWidget);

    await tester.ensureVisible(find.widgetWithText(FilledButton, 'Save'));
    await tester.tap(find.widgetWithText(FilledButton, 'Save'));
    await tester.pump();
    expect(saved?.quantity, 3);
    expect(saved?.discount, 50);
    expect(saved?.package, 'THIRTY_DAY');
  });

  testWidgets('expense form rejects a missing amount', (tester) async {
    var called = false;
    await tester.pumpWidget(
      host(
        SingleChildScrollView(
          child: ExpenseForm(
            initialDate: DateTime.utc(2026, 11, 1),
            onSave: (_) async => called = true,
          ),
        ),
      ),
    );
    await tester.enterText(
      find.widgetWithText(TextField, 'কর্মচারীর নাম'),
      'Rahim',
    );
    await tester.ensureVisible(find.widgetWithText(FilledButton, 'Save'));
    await tester.tap(find.widgetWithText(FilledButton, 'Save'));
    await tester.pump();
    expect(called, isFalse);
    expect(find.text('Amount must be greater than zero.'), findsOneWidget);
  });
}
