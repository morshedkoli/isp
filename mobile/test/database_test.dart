import 'package:flutter_test/flutter_test.dart';

import 'package:isp_admin/data/database.dart';

void main() {
  group('Database.guard', () {
    test('retries a dropped connection once when asked', () async {
      var calls = 0;
      final result = await Database.guard(() async {
        calls++;
        if (calls == 1) throw Exception('connection reset by peer');
        return 'ok';
      }, retry: true);
      expect(result, 'ok');
      expect(calls, 2);
    });

    test('does not retry writes', () async {
      var calls = 0;
      await expectLater(
        Database.guard<void>(() async {
          calls++;
          throw Exception('connection reset by peer');
        }),
        throwsA(isA<DataException>()),
      );
      expect(calls, 1);
    });

    test('does not retry the app\'s own errors', () async {
      var calls = 0;
      await expectLater(
        Database.guard<void>(() async {
          calls++;
          throw const DataException('Invalid email or password.');
        }, retry: true),
        throwsA(
          isA<DataException>().having(
            (e) => e.message,
            'message',
            'Invalid email or password.',
          ),
        ),
      );
      expect(calls, 1);
    });
  });
}
