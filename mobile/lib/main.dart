import 'package:flutter/material.dart';

import 'package:isp_admin/data/auth.dart';
import 'package:isp_admin/data/database.dart';
import 'package:isp_admin/ui/app_scope.dart';
import 'package:isp_admin/ui/home_shell.dart';
import 'package:isp_admin/ui/login_screen.dart';
import 'package:isp_admin/ui/setup_screen.dart';
import 'package:isp_admin/ui/theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const IspAdminApp());
}

enum _Stage { starting, setup, login, home, offline }

class IspAdminApp extends StatefulWidget {
  const IspAdminApp({super.key});

  @override
  State<IspAdminApp> createState() => _IspAdminAppState();
}

class _IspAdminAppState extends State<IspAdminApp> {
  _Stage _stage = _Stage.starting;
  AppSession? _session;
  String _offlineMessage = '';

  @override
  void initState() {
    super.initState();
    _boot();
  }

  Future<void> _boot() async {
    setState(() => _stage = _Stage.starting);
    try {
      if (!await Database.instance.connectSaved()) {
        setState(() => _stage = _Stage.setup);
        return;
      }
      final user = await AuthService.instance.restore();
      if (user == null) {
        setState(() => _stage = _Stage.login);
      } else {
        _startSession(user);
      }
    } on DataException catch (e) {
      setState(() {
        _offlineMessage = e.message;
        _stage = _Stage.offline;
      });
    }
  }

  void _startSession(AdminUser user) {
    _session?.dispose();
    setState(() {
      _session = AppSession(user: user, onLogout: _logout);
      _stage = _Stage.home;
    });
  }

  Future<void> _logout() async {
    await AuthService.instance.logout();
    _session?.dispose();
    setState(() {
      _session = null;
      _stage = _Stage.login;
    });
  }

  Future<void> _changeDatabase() async {
    await AuthService.instance.logout();
    await Database.instance.forgetUrl();
    _session?.dispose();
    setState(() {
      _session = null;
      _stage = _Stage.setup;
    });
  }

  @override
  Widget build(BuildContext context) {
    final session = _session;
    final Widget home = switch (_stage) {
      _Stage.starting => const _Splash(),
      _Stage.setup => SetupScreen(
        onConnected: () => setState(() => _stage = _Stage.login),
      ),
      _Stage.login => LoginScreen(
        onLoggedIn: _startSession,
        onChangeDatabase: _changeDatabase,
      ),
      _Stage.offline => _Offline(
        message: _offlineMessage,
        onRetry: _boot,
        onChangeDatabase: _changeDatabase,
      ),
      _Stage.home =>
        session == null
            ? const _Splash()
            : HomeShell(onChangeDatabase: _changeDatabase),
    };
    final app = MaterialApp(
      title: 'GrameenWiFi Admin',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(),
      home: home,
    );
    // Above MaterialApp so pushed routes (statements, editors) see the session.
    return session == null ? app : AppScope(session: session, child: app);
  }
}

class _Splash extends StatelessWidget {
  const _Splash();

  @override
  Widget build(BuildContext context) => const Scaffold(
    backgroundColor: AppColors.emeraldDeep,
    body: Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.wifi_rounded, color: Colors.white, size: 56),
          SizedBox(height: 16),
          CircularProgressIndicator(color: Colors.white),
        ],
      ),
    ),
  );
}

class _Offline extends StatelessWidget {
  const _Offline({
    required this.message,
    required this.onRetry,
    required this.onChangeDatabase,
  });
  final String message;
  final VoidCallback onRetry;
  final VoidCallback onChangeDatabase;

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.wifi_off_rounded, size: 56, color: AppColors.loss),
            const SizedBox(height: 16),
            Text(
              'Can’t reach the database',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.muted),
            ),
            const SizedBox(height: 24),
            FilledButton(onPressed: onRetry, child: const Text('Try again')),
            TextButton(
              onPressed: onChangeDatabase,
              child: const Text('Use a different connection'),
            ),
          ],
        ),
      ),
    ),
  );
}
