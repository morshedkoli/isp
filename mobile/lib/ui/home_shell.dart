import 'package:flutter/material.dart';

import 'package:isp_admin/ui/app_scope.dart';
import 'package:isp_admin/ui/screens/balances_screen.dart';
import 'package:isp_admin/ui/screens/expenses_screen.dart';
import 'package:isp_admin/ui/screens/hotspot_screen.dart';
import 'package:isp_admin/ui/screens/monthly_screen.dart';
import 'package:isp_admin/ui/screens/overview_screen.dart';
import 'package:isp_admin/ui/theme.dart';
import 'package:isp_admin/ui/widgets.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({required this.onChangeDatabase, super.key});
  final VoidCallback? onChangeDatabase;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  static const _destinations = [
    NavigationDestination(
      icon: Icon(Icons.space_dashboard_outlined),
      selectedIcon: Icon(Icons.space_dashboard),
      label: 'Overview',
    ),
    NavigationDestination(
      icon: Icon(Icons.calendar_month_outlined),
      selectedIcon: Icon(Icons.calendar_month),
      label: 'Monthly',
    ),
    NavigationDestination(icon: Icon(Icons.wifi_tethering), label: 'Hotspot'),
    NavigationDestination(
      icon: Icon(Icons.receipt_long_outlined),
      selectedIcon: Icon(Icons.receipt_long),
      label: 'Expenses',
    ),
    NavigationDestination(
      icon: Icon(Icons.account_balance_wallet_outlined),
      selectedIcon: Icon(Icons.account_balance_wallet),
      label: 'Balances',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final menu = AccountMenu(onChangeDatabase: widget.onChangeDatabase);
    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: [
          OverviewScreen(menu: menu),
          MonthlyScreen(menu: menu),
          HotspotScreen(menu: menu),
          ExpensesScreen(menu: menu),
          BalancesScreen(menu: menu),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: _destinations,
      ),
    );
  }
}

class AccountMenu extends StatelessWidget {
  const AccountMenu({required this.onChangeDatabase, super.key});
  final VoidCallback? onChangeDatabase;

  @override
  Widget build(BuildContext context) {
    final session = AppScope.of(context);
    return PopupMenuButton<String>(
      tooltip: 'Account',
      icon: CircleAvatar(
        radius: 16,
        backgroundColor: AppColors.mint,
        child: Text(
          session.user.name.isEmpty ? 'A' : session.user.name[0].toUpperCase(),
          style: const TextStyle(
            color: AppColors.emeraldDeep,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
      onSelected: (value) async {
        switch (value) {
          case 'refresh':
            session.dataChanged();
          case 'logout':
            await session.onLogout();
          case 'database':
            final ok = await confirm(
              context,
              title: 'Change database?',
              body:
                  'This signs you out and forgets the saved connection string.',
              action: 'Change',
            );
            if (ok) onChangeDatabase?.call();
        }
      },
      itemBuilder: (_) => [
        PopupMenuItem(
          enabled: false,
          child: Text(
            '${session.user.name}\n${session.user.email}'
            '${session.canEdit ? '' : '\nView only'}',
            style: const TextStyle(color: AppColors.muted),
          ),
        ),
        const PopupMenuItem(value: 'refresh', child: Text('Refresh all')),
        if (onChangeDatabase != null)
          const PopupMenuItem(
            value: 'database',
            child: Text('Change database'),
          ),
        const PopupMenuItem(value: 'logout', child: Text('Sign out')),
      ],
    );
  }
}
