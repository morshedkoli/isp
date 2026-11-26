import 'package:flutter/material.dart';

import 'package:isp_admin/data/database.dart';
import 'package:isp_admin/ui/theme.dart';

/// First-run screen: the MongoDB connection string is typed here once and kept
/// in Android encrypted storage, so it never ships inside the APK.
class SetupScreen extends StatefulWidget {
  const SetupScreen({required this.onConnected, super.key});
  final VoidCallback onConnected;

  @override
  State<SetupScreen> createState() => _SetupScreenState();
}

class _SetupScreenState extends State<SetupScreen> {
  final _controller = TextEditingController();
  bool _busy = false;
  bool _obscure = true;
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _connect() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await Database.instance.connectAndSave(_controller.text);
      widget.onConnected();
    } on DataException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(24, 48, 24, 24),
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: AppColors.mint,
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Icon(
              Icons.storage_rounded,
              color: AppColors.emeraldDeep,
              size: 32,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Connect your database',
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: 8),
          const Text(
            'Paste the same MongoDB connection string the website uses (DATABASE_URL). '
            'It is stored encrypted on this phone only.',
            style: TextStyle(color: AppColors.muted, height: 1.45),
          ),
          const SizedBox(height: 28),
          TextField(
            controller: _controller,
            obscureText: _obscure,
            autocorrect: false,
            enableSuggestions: false,
            keyboardType: TextInputType.url,
            decoration: InputDecoration(
              labelText: 'Connection string',
              hintText: 'mongodb+srv://user:password@cluster/db',
              errorText: _error,
              errorMaxLines: 4,
              suffixIcon: IconButton(
                onPressed: () => setState(() => _obscure = !_obscure),
                icon: Icon(
                  _obscure
                      ? Icons.visibility_outlined
                      : Icons.visibility_off_outlined,
                ),
              ),
            ),
            onSubmitted: (_) => _connect(),
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _busy ? null : _connect,
            child: _busy
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(strokeWidth: 2.4),
                  )
                : const Text('Connect'),
          ),
        ],
      ),
    ),
  );
}
