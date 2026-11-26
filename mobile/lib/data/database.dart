import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mongo_dart/mongo_dart.dart';

/// Thrown for connection or data problems the UI should show as a message.
class DataException implements Exception {
  const DataException(this.message);
  final String message;
  @override
  String toString() => message;
}

/// A connection or driver failure, as opposed to a message the app raised on
/// purpose (bad password, validation). Only these are worth retrying.
class _DriverFailure extends DataException {
  const _DriverFailure(super.message);
}

/// Owns the MongoDB connection.
///
/// Release builds get the connection string at compile time through
/// `--dart-define-from-file=build-secrets.json` (git-ignored), so users only
/// sign in. Without it, the string is entered once on the setup screen and
/// kept in Android encrypted storage. It is never in source code.
class Database {
  Database._();
  static final Database instance = Database._();

  static const String _builtInUrl = String.fromEnvironment('MONGO_URL');

  /// True when this build carries its own connection string.
  static bool get hasBuiltInUrl => _builtInUrl.isNotEmpty;

  static const _urlKey = 'mongo_url';
  static const Duration _timeout = Duration(seconds: 20);
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  Db? _db;
  String? _url;

  Future<String?> savedUrl() async =>
      hasBuiltInUrl ? _builtInUrl : _storage.read(key: _urlKey);

  Future<void> forgetUrl() async {
    await close();
    await _storage.delete(key: _urlKey);
  }

  /// Connect with [url] and, if it works, remember it.
  Future<void> connectAndSave(String url) async {
    await _open(url.trim());
    await _storage.write(key: _urlKey, value: url.trim());
  }

  /// Reconnect with the saved URL. Returns false when none is saved.
  Future<bool> connectSaved() async {
    final url = await savedUrl();
    if (url == null || url.isEmpty) return false;
    await _open(url);
    return true;
  }

  Future<void> _open(String url) async {
    if (!url.startsWith('mongodb://') && !url.startsWith('mongodb+srv://')) {
      throw const DataException(
        'The connection string must start with mongodb:// or mongodb+srv://',
      );
    }
    await close();
    try {
      final db = await Db.create(url).timeout(_timeout);
      await db.open(secure: url.startsWith('mongodb+srv://')).timeout(_timeout);
      _db = db;
      _url = url;
    } on MongoDartError catch (e) {
      throw DataException('Could not connect to the database: ${_short(e)}');
    } on Exception catch (e) {
      throw DataException('Could not connect to the database: ${_short(e)}');
    }
  }

  Future<void> close() async {
    final db = _db;
    _db = null;
    if (db != null && db.isConnected) {
      try {
        await db.close();
      } on Exception {
        // Closing a dead connection is not worth surfacing.
      }
    }
  }

  /// The live connection, reconnecting once if the socket dropped (phones
  /// sleep and change networks constantly).
  Future<Db> get db async {
    final current = _db;
    if (current != null && current.isConnected && current.state == State.open) {
      return current;
    }
    final url = _url ?? await savedUrl();
    if (url == null) throw const DataException('No database is configured.');
    await _open(url);
    return _db!;
  }

  Future<DbCollection> collection(String name) async =>
      (await db).collection(name);

  /// Runs a database operation, turning driver failures into [DataException].
  /// mongo_dart reports server/socket problems as `MongoDartError`, so it is
  /// caught explicitly alongside ordinary exceptions.
  ///
  /// With [retry], a failed attempt drops the connection and runs [action]
  /// once more on a fresh one. Phones sleep and switch networks, which leaves
  /// a dead socket behind. Only pass it for reads and idempotent updates: a
  /// write that reached the server before the socket died would run twice.
  static Future<T> guard<T>(
    Future<T> Function() action, {
    bool retry = false,
  }) async {
    try {
      return await _attempt(action);
    } on DataException catch (e) {
      if (!retry || e is! _DriverFailure) rethrow;
      return _attempt(action);
    }
  }

  static Future<T> _attempt<T>(Future<T> Function() action) async {
    try {
      return await action().timeout(_timeout);
    } on DataException {
      rethrow;
    } on MongoDartError catch (e) {
      await instance.close();
      throw _DriverFailure(_short(e));
    } on Exception catch (e) {
      await instance.close();
      throw _DriverFailure(_short(e));
    }
  }

  static String _short(Object e) {
    final text = e.toString();
    return text.length > 160 ? '${text.substring(0, 160)}…' : text;
  }
}
