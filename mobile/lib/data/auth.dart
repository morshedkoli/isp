import 'package:bcrypt/bcrypt.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mongo_dart/mongo_dart.dart';

import 'package:isp_admin/data/database.dart';

/// A signed-in user. ADMINs can change data; PARTNER and AGENT accounts are
/// view-only.
class AdminUser {
  const AdminUser({
    required this.id,
    required this.name,
    required this.email,
    this.role = adminRole,
  });
  final String id;
  final String name;
  final String email;
  final String role;

  static const adminRole = 'ADMIN';

  /// Roles that may sign in to the app. Only [adminRole] may change data.
  static const allowedRoles = {adminRole, 'PARTNER', 'AGENT'};

  bool get canEdit => role == adminRole;
}

/// Like the web NextAuth credentials provider: active users only, password
/// checked against the stored bcrypt hash. Unlike the website, PARTNER and
/// AGENT accounts may also sign in, as view-only users.
class AuthService {
  AuthService._();
  static final AuthService instance = AuthService._();

  static const _userKey = 'session_user_id';
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  static const _invalid = 'Invalid email or password.';

  Future<AdminUser> login(String email, String password) =>
      Database.guard(() async {
        final users = await Database.instance.collection('users');
        final user = await users.findOne({'email': email.trim()});
        if (user == null ||
            user['isActive'] == false ||
            !AdminUser.allowedRoles.contains(user['role'])) {
          throw const DataException(_invalid);
        }
        final hash = user['password'];
        if (hash is! String || !_checkPassword(password, hash)) {
          throw const DataException(_invalid);
        }
        final id = user['_id'] as ObjectId;
        final now = DateTime.now().toUtc();
        await users.updateOne(
          {'_id': id},
          {
            r'$set': {'lastLoginAt': now, 'updatedAt': now},
          },
        );
        await _storage.write(key: _userKey, value: id.oid);
        return _toAdmin(user);
        // Safe to retry: the only write just sets the last-login time.
      }, retry: true);

  /// Restores a saved session, re-checking the account is still an active admin.
  Future<AdminUser?> restore() async {
    final id = await _storage.read(key: _userKey);
    if (id == null) return null;
    return Database.guard(() async {
      final users = await Database.instance.collection('users');
      final user = await users.findOne({'_id': ObjectId.fromHexString(id)});
      if (user == null ||
          user['isActive'] == false ||
          !AdminUser.allowedRoles.contains(user['role'])) {
        await logout();
        return null;
      }
      return _toAdmin(user);
    }, retry: true);
  }

  Future<void> logout() => _storage.delete(key: _userKey);

  static bool _checkPassword(String password, String hash) {
    try {
      return BCrypt.checkpw(password, hash);
    } on ArgumentError {
      // Malformed hash in the database — treat as a failed login.
      return false;
    }
  }

  static AdminUser _toAdmin(Map<String, dynamic> user) => AdminUser(
    id: (user['_id'] as ObjectId).oid,
    name: user['name'] is String ? user['name'] as String : 'Admin',
    email: user['email'] is String ? user['email'] as String : '',
    role: user['role'] as String,
  );
}
