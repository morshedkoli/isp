import 'package:flutter_test/flutter_test.dart';

import 'package:isp_admin/data/auth.dart';
import 'package:isp_admin/data/database.dart';
import 'package:isp_admin/data/repository.dart';

void main() {
  group('view-only accounts', () {
    test('only ADMIN can edit; partners and agents may sign in', () {
      const admin = AdminUser(id: 'a', name: 'A', email: 'a@x');
      const partner = AdminUser(
        id: 'p',
        name: 'P',
        email: 'p@x',
        role: 'PARTNER',
      );
      const agent = AdminUser(id: 'g', name: 'G', email: 'g@x', role: 'AGENT');
      expect(admin.canEdit, isTrue);
      expect(partner.canEdit, isFalse);
      expect(agent.canEdit, isFalse);
      expect(
        AdminUser.allowedRoles,
        containsAll(<String>['ADMIN', 'PARTNER', 'AGENT']),
      );
      expect(AdminUser.allowedRoles.contains('EMPLOYEE'), isFalse);
    });

    test('the repository refuses writes before touching the database', () {
      final repo = Repository('000000000000000000000001', canEdit: false);
      expect(
        repo.deleteExpense('000000000000000000000002'),
        throwsA(
          isA<DataException>().having(
            (e) => e.message,
            'message',
            Repository.viewOnlyMessage,
          ),
        ),
      );
      expect(
        repo.deleteHotspotSale('000000000000000000000003'),
        throwsA(isA<DataException>()),
      );
    });
  });
}
