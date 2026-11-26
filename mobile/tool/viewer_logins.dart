// Gives partners and commission agents a VIEW-ONLY login for the Android app.
//
//   dart run tool/viewer_logins.dart Halim Tanzina Sourab Tushar
//
// For each name:
//   * a PARTNER user with that name gets a login email and a new password;
//   * otherwise a commission agent with that name gets an AGENT user (created
//     on first run) with a login email and a new password.
// Running it again for someone gives them a NEW password; the old one stops
// working. Passwords are printed once, here, and stored only as bcrypt hashes.
//
// The connection string comes from MONGO_URL, or from build-secrets.json.
// Every change is written to audit_logs, recorded against the first ADMIN.
import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:bcrypt/bcrypt.dart';
import 'package:mongo_dart/mongo_dart.dart';

const _emailDomain = 'gwifi.app';
const _passwordLength = 10;
// No 0/O, 1/l/I: easy to read out and type on a phone.
const _alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
const _client = 'isp_admin_tool';

final _random = Random.secure();

typedef Login = ({String name, String role, String email, String password});

Future<void> main(List<String> names) async {
  if (names.isEmpty) {
    stderr.writeln(
      'Usage: dart run tool/viewer_logins.dart <name> [<name> ...]',
    );
    exit(64);
  }
  final url = _mongoUrl();
  final db = await Db.create(url);
  await db.open(secure: url.startsWith('mongodb+srv://'));
  try {
    final users = db.collection('users');
    final admin = await users.findOne(where.eq('role', 'ADMIN'));
    if (admin == null) {
      throw StateError('No ADMIN user found for the audit log');
    }
    final adminId = admin['_id'] as ObjectId;

    final logins = <Login>[];
    for (final name in names) {
      final login = await _issue(db, adminId, name.trim());
      if (login == null) {
        stderr.writeln(
          'Skipped "$name": no partner or commission agent has that name.',
        );
      } else {
        logins.add(login);
      }
    }
    _print(logins);
  } finally {
    await db.close();
  }
}

String _mongoUrl() {
  final env = Platform.environment['MONGO_URL'];
  if (env != null && env.isNotEmpty) return env;
  final file = File('build-secrets.json');
  if (!file.existsSync()) {
    stderr.writeln('Set MONGO_URL or create build-secrets.json');
    exit(2);
  }
  final json = jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
  final url = json['MONGO_URL'];
  if (url is! String || url.isEmpty) {
    stderr.writeln('build-secrets.json has no MONGO_URL');
    exit(2);
  }
  return url;
}

Future<Login?> _issue(Db db, ObjectId adminId, String name) async {
  final users = db.collection('users');
  final nameMatch = {r'$regex': '^${RegExp.escape(name)}\$', r'$options': 'i'};

  final partner = await users.findOne({'role': 'PARTNER', 'name': nameMatch});
  if (partner != null) return _setLogin(db, adminId, partner);

  final agent = await db.collection('commission_agents').findOne({
    'name': nameMatch,
  });
  if (agent == null) return null;
  final agentName = agent['name'] as String;
  final existing = await users.findOne({'role': 'AGENT', 'name': agentName});
  if (existing != null) return _setLogin(db, adminId, existing);

  final now = DateTime.now().toUtc();
  final newId = ObjectId();
  final created = <String, dynamic>{
    '_id': newId,
    'email': await _freeEmail(users, agentName, null),
    // users.phone has a unique, non-sparse index and the ADMIN has no phone,
    // so a second empty phone would clash. Agents have none on file either.
    'phone': 'agent-${newId.oid}',
    'name': agentName,
    'password': '',
    'role': 'AGENT',
    'isActive': true,
    'lastLoginAt': null,
    'createdAt': now,
    'updatedAt': now,
  };
  await users.insertOne(created);
  await _audit(db, adminId, 'CREATE', created['_id'] as ObjectId, {
    'name': agentName,
    'email': created['email'],
    'role': 'AGENT',
  });
  return _setLogin(db, adminId, created);
}

Future<Login> _setLogin(
  Db db,
  ObjectId adminId,
  Map<String, dynamic> user,
) async {
  final users = db.collection('users');
  final id = user['_id'] as ObjectId;
  final name = user['name'] as String;
  final role = user['role'] as String;
  final email = await _freeEmail(users, name, id);
  final password = _newPassword();
  await users.updateOne(
    {'_id': id},
    {
      r'$set': {
        'email': email,
        'password': BCrypt.hashpw(password, BCrypt.gensalt(logRounds: 10)),
        'isActive': true,
        'updatedAt': DateTime.now().toUtc(),
      },
    },
  );
  await _audit(db, adminId, 'UPDATE', id, {
    'email': email,
    'password': 'changed',
    'viewOnlyAppLogin': true,
  });
  return (name: name, role: role, email: email, password: password);
}

/// `firstname@gwifi.app`, with a number added if someone else already has it.
Future<String> _freeEmail(
  DbCollection users,
  String name,
  ObjectId? self,
) async {
  final slug = name
      .toLowerCase()
      .split(RegExp(r'\s+'))
      .first
      .replaceAll(RegExp('[^a-z0-9]'), '');
  final base = slug.isEmpty ? 'user' : slug;
  for (var n = 1; ; n++) {
    final email = n == 1 ? '$base@$_emailDomain' : '$base$n@$_emailDomain';
    final taken = await users.findOne({'email': email});
    if (taken == null || taken['_id'] == self) return email;
  }
}

String _newPassword() => List.generate(
  _passwordLength,
  (_) => _alphabet[_random.nextInt(_alphabet.length)],
).join();

Future<void> _audit(
  Db db,
  ObjectId adminId,
  String action,
  ObjectId userId,
  Map<String, dynamic> newData,
) => db.collection('audit_logs').insertOne({
  '_id': ObjectId(),
  'userId': adminId,
  'action': action,
  'entityType': 'User',
  'entityId': userId.oid,
  'oldData': null,
  'newData': jsonEncode(newData),
  'ipAddress': null,
  'userAgent': _client,
  'createdAt': DateTime.now().toUtc(),
});

void _print(List<Login> logins) {
  if (logins.isEmpty) return;
  stdout.writeln('\nView-only app logins (shown once, not stored anywhere):\n');
  for (final l in logins) {
    stdout.writeln('  ${l.name} (${l.role.toLowerCase()})');
    stdout.writeln('    email:    ${l.email}');
    stdout.writeln('    password: ${l.password}\n');
  }
}
