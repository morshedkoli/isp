import 'package:flutter/material.dart';

import 'package:isp_admin/core/business_date.dart';
import 'package:isp_admin/core/format.dart';
import 'package:isp_admin/domain/models.dart';
import 'package:isp_admin/ui/app_scope.dart';
import 'package:isp_admin/ui/forms.dart';
import 'package:isp_admin/ui/theme.dart';
import 'package:isp_admin/ui/widgets.dart';

class HotspotScreen extends StatelessWidget {
  const HotspotScreen({required this.menu, super.key});
  final Widget menu;

  Future<void> _openForm(
    BuildContext context, {
    HotspotSale? sale,
    String? package,
  }) {
    final session = AppScope.of(context);
    final repo = session.repository;
    return showFormSheet<void>(
      context,
      HotspotSaleForm(
        initialDate: defaultEntryDate(session.period.value),
        existing: sale,
        package: package,
        onSave: (input) => runWrite(
          context,
          () => sale == null
              ? repo.createHotspotSale(input)
              : repo.updateHotspotSale(sale.id, input),
          success: sale == null ? 'Sale recorded' : 'Sale updated',
        ),
      ),
    );
  }

  Future<void> _delete(BuildContext context, HotspotSale sale) async {
    final repo = AppScope.of(context).repository;
    final ok = await confirm(
      context,
      title: 'Delete this sale?',
      body:
          '${sale.quantity} × ${hotspotPackages[sale.package]?.label} · ${formatTaka(sale.amount)}',
    );
    if (ok && context.mounted) {
      await runWrite(
        context,
        () => repo.deleteHotspotSale(sale.id),
        success: 'Sale deleted',
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = AppScope.of(context);
    final repo = session.repository;
    final canEdit = session.canEdit;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Hotspot sales'),
        actions: [menu, const SizedBox(width: 8)],
      ),
      floatingActionButton: canEdit
          ? FloatingActionButton.extended(
              onPressed: () => _openForm(context),
              icon: const Icon(Icons.add),
              label: const Text('Sale'),
            )
          : null,
      body: Column(
        children: [
          const PeriodBar(),
          Expanded(
            child: Loader<List<HotspotSale>>(
              load: repo.hotspotSales,
              builder: (context, sales, _) {
                final seven = sales.where((s) => s.package == 'SEVEN_DAY');
                final thirty = sales.where((s) => s.package == 'THIRTY_DAY');
                final revenue = sales.fold(0.0, (sum, s) => sum + s.amount);
                return ListView(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 96),
                  children: [
                    Card(
                      color: AppColors.amberSoft,
                      child: Padding(
                        padding: const EdgeInsets.all(18),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Eyebrow(
                                    'Revenue this month',
                                    color: AppColors.amber,
                                  ),
                                  const SizedBox(height: 4),
                                  Money(revenue, size: 30),
                                  Text(
                                    '${sales.length} sales',
                                    style: const TextStyle(
                                      color: AppColors.muted,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const Icon(
                              Icons.wifi_tethering,
                              size: 44,
                              color: AppColors.amber,
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    TileRow(
                      _QuickAdd(
                        info: hotspotPackages['SEVEN_DAY']!,
                        count: seven.fold(0, (n, s) => n + s.quantity),
                        revenue: seven.fold(0.0, (n, s) => n + s.amount),
                        onTap: canEdit
                            ? () => _openForm(context, package: 'SEVEN_DAY')
                            : null,
                      ),
                      _QuickAdd(
                        info: hotspotPackages['THIRTY_DAY']!,
                        count: thirty.fold(0, (n, s) => n + s.quantity),
                        revenue: thirty.fold(0.0, (n, s) => n + s.amount),
                        onTap: canEdit
                            ? () => _openForm(context, package: 'THIRTY_DAY')
                            : null,
                      ),
                    ),
                    const SectionTitle('Sales'),
                    if (sales.isEmpty)
                      const EmptyNote(
                        'No sales this month',
                        icon: Icons.wifi_off,
                      ),
                    if (sales.isNotEmpty)
                      Card(
                        clipBehavior: Clip.antiAlias,
                        child: Column(
                          children: [
                            for (final (i, s) in sales.indexed) ...[
                              if (i > 0)
                                const Divider(indent: 16, endIndent: 16),
                              ListTile(
                                onTap: canEdit
                                    ? () => _openForm(context, sale: s)
                                    : null,
                                onLongPress: canEdit
                                    ? () => _delete(context, s)
                                    : null,
                                leading: CircleAvatar(
                                  backgroundColor: s.package == 'SEVEN_DAY'
                                      ? AppColors.amberSoft
                                      : AppColors.violetSoft,
                                  child: Text(
                                    s.package == 'SEVEN_DAY' ? '7' : '30',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w800,
                                      color: s.package == 'SEVEN_DAY'
                                          ? AppColors.amber
                                          : AppColors.violet,
                                    ),
                                  ),
                                ),
                                title: Text(
                                  '${s.quantity} × ${hotspotPackages[s.package]?.label ?? s.package}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                subtitle: Text(
                                  [
                                    formatDate(s.date),
                                    if (s.customerName != null) s.customerName!,
                                    if (s.discount > 0)
                                      '−${formatTaka(s.discount)} disc.',
                                  ].join(' · '),
                                ),
                                trailing: Money(s.amount, size: 15),
                              ),
                            ],
                          ],
                        ),
                      ),
                    if (sales.isNotEmpty)
                      const Padding(
                        padding: EdgeInsets.only(top: 8),
                        child: Text(
                          'Tap to edit · long-press to delete',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: AppColors.muted,
                            fontSize: 12,
                          ),
                        ),
                      ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _QuickAdd extends StatelessWidget {
  const _QuickAdd({
    required this.info,
    required this.count,
    required this.revenue,
    required this.onTap,
  });
  final HotspotPackageInfo info;
  final int count;
  final double revenue;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Card(
    clipBehavior: Clip.antiAlias,
    child: InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Eyebrow(info.label)),
                if (onTap != null)
                  const Icon(
                    Icons.add_circle,
                    color: AppColors.emerald,
                    size: 22,
                  ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              '$count sold',
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
            ),
            Text(
              '${formatTaka(revenue)} · ৳${info.price.toInt()} each',
              style: const TextStyle(color: AppColors.muted, fontSize: 12),
            ),
          ],
        ),
      ),
    ),
  );
}
