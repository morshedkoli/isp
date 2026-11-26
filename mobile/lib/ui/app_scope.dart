import 'package:flutter/material.dart';

import 'package:isp_admin/core/business_date.dart';
import 'package:isp_admin/data/auth.dart';
import 'package:isp_admin/data/repository.dart';

/// State for one signed-in session: the admin, the repository, the month
/// being viewed, and a revision counter bumped after every write so every tab
/// reloads with fresh numbers.
class AppSession {
  AppSession({required this.user, required this.onLogout})
    : repository = Repository(user.id);

  final AdminUser user;
  final Repository repository;
  final Future<void> Function() onLogout;
  final ValueNotifier<Period> period = ValueNotifier(currentPeriod());
  final ValueNotifier<int> revision = ValueNotifier(0);

  void dataChanged() => revision.value++;

  void dispose() {
    period.dispose();
    revision.dispose();
  }
}

class AppScope extends InheritedWidget {
  const AppScope({required this.session, required super.child, super.key});

  final AppSession session;

  static AppSession of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AppScope>();
    assert(scope != null, 'AppScope missing above this widget');
    return scope!.session;
  }

  @override
  bool updateShouldNotify(AppScope oldWidget) =>
      !identical(session, oldWidget.session);
}
