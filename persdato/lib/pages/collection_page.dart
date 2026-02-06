import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/wallet_model.dart';
import '../models/receipt_model.dart';
import '../services/receipt_collection_service.dart';
import '../theme/crypto_theme.dart';
import 'receipt_detail_page.dart';

class CollectionPage extends StatefulWidget {
  const CollectionPage({super.key});

  @override
  State<CollectionPage> createState() => _CollectionPageState();
}

class _CollectionPageState extends State<CollectionPage> {
  List<Receipt> _receipts = [];
  bool _isLoading = false;
  String? _error;
  String? _lastLoadedAddress;
  bool _isLoadingScheduled = false;
  DateTime? _lastVisibleTime;

  @override
  void initState() {
    super.initState();
    _isLoading = false;
  }

  void _checkAndLoadReceipts(
    String walletAddress, {
    bool forceReload = false,
  }) {
    if ((_lastLoadedAddress != walletAddress || forceReload) &&
        walletAddress.isNotEmpty) {
      _lastLoadedAddress = walletAddress;
      _isLoadingScheduled = false;
      _loadReceipts();
    }
  }

  Future<void> _loadReceipts() async {
    final walletModel = Provider.of<WalletModel>(context, listen: false);
    if (!walletModel.isConnected || walletModel.address.isEmpty) {
      setState(() {
        _isLoading = false;
        _error = 'Please connect your wallet first';
        _receipts = [];
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final receipts = await ReceiptCollectionService.getReceipts(
        walletModel.address,
      );

      setState(() {
        _receipts = receipts;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load receipts: $e';
        _isLoading = false;
      });
    }
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inDays == 0) {
      return 'Today';
    } else if (difference.inDays == 1) {
      return 'Yesterday';
    } else if (difference.inDays < 7) {
      return '${difference.inDays} days ago';
    } else {
      return '${date.day}/${date.month}/${date.year}';
    }
  }

  double _getTotalSymEarned() {
    return _receipts.fold(
      0.0,
      (sum, receipt) => sum + (receipt.totalSymEarned ?? 0.0),
    );
  }

  double _getTotalAmount() {
    return _receipts.fold(
      0.0,
      (sum, receipt) => sum + (receipt.totalAmount ?? 0.0),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<WalletModel>(
      builder: (context, walletModel, child) {
        final now = DateTime.now();
        final shouldReload =
            _lastVisibleTime != null &&
            now.difference(_lastVisibleTime!) > const Duration(seconds: 1);

        if (walletModel.isConnected && walletModel.address.isNotEmpty) {
          final addressChanged = _lastLoadedAddress != walletModel.address;
          final shouldReloadOnTabSwitch =
              shouldReload &&
              _lastLoadedAddress == walletModel.address &&
              _receipts.isNotEmpty;

          final needsLoad = addressChanged || shouldReloadOnTabSwitch;

          if (needsLoad && !_isLoadingScheduled) {
            _isLoadingScheduled = true;
            _lastVisibleTime = now;
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted) {
                final forceReload = shouldReloadOnTabSwitch;
                _checkAndLoadReceipts(
                  walletModel.address,
                  forceReload: forceReload,
                );
              } else {
                _isLoadingScheduled = false;
              }
            });
          } else if (!shouldReload && _lastVisibleTime == null) {
            _lastVisibleTime = now;
          }
        } else {
          if (_lastLoadedAddress != null) {
            _lastLoadedAddress = null;
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted) {
                setState(() {
                  _receipts = [];
                  _error = null;
                  _isLoading = false;
                });
              }
            });
          }
        }

        if (!walletModel.isConnected) {
          return Scaffold(
            appBar: AppBar(
              title: const Text('Collection'),
              automaticallyImplyLeading: false,
            ),
            body: const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.account_balance_wallet_outlined,
                    size: 64,
                    color: CryptoScheme.muted,
                  ),
                  SizedBox(height: 16),
                  Text(
                    'Connect Your Wallet',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: CryptoScheme.text,
                      letterSpacing: -0.5,
                    ),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Please connect your wallet to view receipts',
                    style: TextStyle(
                      fontSize: 16,
                      color: CryptoScheme.muted,
                      letterSpacing: 0.2,
                    ),
                  ),
                ],
              ),
            ),
          );
        }

        return Scaffold(
          appBar: AppBar(
            title: const Text('Collection'),
            automaticallyImplyLeading: false,
            actions: [
              IconButton(
                icon: const Icon(Icons.refresh),
                onPressed: _isLoading ? null : () => _loadReceipts(),
                tooltip: 'Refresh',
              ),
            ],
          ),
          body: _isLoading
              ? const Center(
                  child: CircularProgressIndicator(color: CryptoScheme.primary),
                )
              : _error != null
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(
                            Icons.error_outline,
                            size: 64,
                            color: CryptoScheme.error,
                          ),
                          const SizedBox(height: 16),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 32),
                            child: Text(
                              _error!,
                              style: const TextStyle(
                                color: CryptoScheme.error,
                                fontSize: 16,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ),
                          const SizedBox(height: 24),
                          ElevatedButton.icon(
                            onPressed: _loadReceipts,
                            icon: const Icon(Icons.refresh),
                            label: const Text('Retry'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: CryptoScheme.primary,
                              foregroundColor: CryptoScheme.text,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 24,
                                vertical: 12,
                              ),
                            ),
                          ),
                        ],
                      ),
                    )
                  : _receipts.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(32),
                                decoration: BoxDecoration(
                                  color: CryptoScheme.border.withOpacity(0.2),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.receipt_long_outlined,
                                  size: 64,
                                  color: CryptoScheme.muted,
                                ),
                              ),
                              const SizedBox(height: 32),
                              const Text(
                                'No Receipts Yet',
                                style: TextStyle(
                                  fontSize: 28,
                                  fontWeight: FontWeight.bold,
                                  color: CryptoScheme.text,
                                  letterSpacing: -0.5,
                                ),
                              ),
                              const SizedBox(height: 12),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 48),
                                child: Text(
                                  'Start uploading receipts to earn SYM tokens and build your collection',
                                  style: const TextStyle(
                                    fontSize: 16,
                                    color: CryptoScheme.muted,
                                    letterSpacing: 0.2,
                                    height: 1.5,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ),
                            ],
                          ),
                        )
                      : RefreshIndicator(
                          onRefresh: _loadReceipts,
                          color: CryptoScheme.primary,
                          backgroundColor: CryptoScheme.background,
                          child: CustomScrollView(
                            slivers: [
                              // Stats Header
                              SliverToBoxAdapter(
                                child: _buildStatsHeader(),
                              ),
                              // Receipts List
                              SliverPadding(
                                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                                sliver: SliverList(
                                  delegate: SliverChildBuilderDelegate(
                                    (context, index) {
                                      return _buildReceiptCard(_receipts[index]);
                                    },
                                    childCount: _receipts.length,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
        );
      },
    );
  }

  Widget _buildStatsHeader() {
    final totalSym = _getTotalSymEarned();
    final totalReceipts = _receipts.length;
    final totalAmount = _getTotalAmount();

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            CryptoScheme.border.withOpacity(0.4),
            CryptoScheme.border.withOpacity(0.2),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: CryptoScheme.border,
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: CryptoScheme.primary.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.analytics_outlined,
                  color: CryptoScheme.primary,
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              const Text(
                'Overview',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: CryptoScheme.text,
                  letterSpacing: -0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: _buildStatItem(
                  icon: Icons.receipt_long,
                  label: 'Total Receipts',
                  value: totalReceipts.toString(),
                  color: CryptoScheme.primary,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _buildStatItem(
                  icon: Icons.account_balance_wallet,
                  label: 'Total SYM Earned',
                  value: '${totalSym.toStringAsFixed(1)} SYM',
                  color: CryptoScheme.symColor,
                ),
              ),
            ],
          ),
          if (totalAmount > 0) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: CryptoScheme.border.withOpacity(0.2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(
                        Icons.attach_money,
                        size: 20,
                        color: CryptoScheme.muted,
                      ),
                      const SizedBox(width: 8),
                      const Text(
                        'Total Spent',
                        style: TextStyle(
                          fontSize: 14,
                          color: CryptoScheme.muted,
                          letterSpacing: 0.2,
                        ),
                      ),
                    ],
                  ),
                  Text(
                    'MYR ${totalAmount.toStringAsFixed(2)}',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: CryptoScheme.text,
                      letterSpacing: 0.2,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildStatItem({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: color.withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 12),
          Text(
            value,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: color,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: CryptoScheme.muted,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReceiptCard(Receipt receipt) {
    final storeName = receipt.storeName ?? 'Unknown Store';
    final receiptDate = receipt.receiptDate;
    final totalAmount = receipt.totalAmount;
    final currency = receipt.currency;
    final symEarned = receipt.totalSymEarned ?? 0.0;
    final items = receipt.items;
    final itemCount = items.length;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: CryptoScheme.border.withOpacity(0.3),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: CryptoScheme.border,
          width: 1,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (context) => ReceiptDetailPage(receipt: receipt),
              ),
            );
          },
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header Row
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Receipt Icon - Crypto Style
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            CryptoScheme.merchantColor.withOpacity(0.4),
                            CryptoScheme.secondary.withOpacity(0.2),
                          ],
                        ),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: CryptoScheme.merchantColor.withOpacity(0.5),
                          width: 1.5,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: CryptoScheme.merchantColor.withOpacity(0.2),
                            blurRadius: 8,
                            spreadRadius: 0,
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.receipt_long,
                        color: CryptoScheme.merchantColor,
                        size: 28,
                      ),
                    ),
                    const SizedBox(width: 16),
                    // Store Info
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            storeName,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: CryptoScheme.text,
                              letterSpacing: -0.5,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: CryptoScheme.border.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.access_time,
                                  size: 12,
                                  color: CryptoScheme.merchantColor,
                                ),
                                const SizedBox(width: 6),
                                Flexible(
                                  child: Text(
                                    receiptDate != null
                                        ? '$receiptDate • ${_formatDate(receipt.createdAt)}'
                                        : _formatDate(receipt.createdAt),
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w500,
                                      color: CryptoScheme.merchantColor,
                                      letterSpacing: 0.2,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (itemCount > 0) ...[
                            const SizedBox(height: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: CryptoScheme.secondary.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(
                                  color: CryptoScheme.secondary.withOpacity(0.3),
                                  width: 1,
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    Icons.inventory_2_outlined,
                                    size: 14,
                                    color: CryptoScheme.secondary,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    '$itemCount ${itemCount == 1 ? 'item' : 'items'}',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: CryptoScheme.secondary,
                                      letterSpacing: 0.2,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    // SYM Badge
                    if (symEarned > 0)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 10,
                        ),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [
                              CryptoScheme.symColor.withOpacity(0.3),
                              CryptoScheme.symColor.withOpacity(0.15),
                            ],
                          ),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: CryptoScheme.symColor.withOpacity(0.4),
                            width: 1,
                          ),
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.account_balance_wallet,
                              size: 18,
                              color: CryptoScheme.symColor,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${symEarned.toStringAsFixed(1)}',
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: CryptoScheme.symColor,
                                letterSpacing: 0.5,
                              ),
                            ),
                            const Text(
                              'SYM',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: CryptoScheme.symColor,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
                // Divider
                if (totalAmount != null) ...[
                  const SizedBox(height: 16),
                  Divider(
                    color: CryptoScheme.border,
                    height: 1,
                  ),
                  const SizedBox(height: 12),
                  // Amount Row - Crypto Style
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          CryptoScheme.primary.withOpacity(0.15),
                          CryptoScheme.primary.withOpacity(0.05),
                        ],
                      ),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: CryptoScheme.primary.withOpacity(0.3),
                        width: 1,
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(
                                color: CryptoScheme.primary.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Icon(
                                Icons.account_balance_wallet_outlined,
                                size: 16,
                                color: CryptoScheme.primary,
                              ),
                            ),
                            const SizedBox(width: 10),
                            const Text(
                              'Total Amount',
                              style: TextStyle(
                                fontSize: 14,
                                color: CryptoScheme.muted,
                                letterSpacing: 0.2,
                              ),
                            ),
                          ],
                        ),
                        Text(
                          '$currency ${totalAmount.toStringAsFixed(2)}',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: CryptoScheme.primary,
                            letterSpacing: 0.2,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
