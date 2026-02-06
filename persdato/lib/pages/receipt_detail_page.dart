import 'package:flutter/material.dart';
import '../models/receipt_model.dart';
import '../services/receipt_collection_service.dart';
import '../theme/crypto_theme.dart';

class ReceiptDetailPage extends StatefulWidget {
  final Receipt receipt;

  const ReceiptDetailPage({super.key, required this.receipt});

  @override
  State<ReceiptDetailPage> createState() => _ReceiptDetailPageState();
}

class _ReceiptDetailPageState extends State<ReceiptDetailPage> {
  List<SymEarningHistory> _earningHistory = [];
  bool _isLoadingHistory = false;

  @override
  void initState() {
    super.initState();
    _loadEarningHistory();
  }

  Future<void> _loadEarningHistory() async {
    setState(() {
      _isLoadingHistory = true;
    });

    try {
      final history = await ReceiptCollectionService.getSymEarningHistory(
        widget.receipt.id,
      );
      setState(() {
        _earningHistory = history;
        _isLoadingHistory = false;
      });
    } catch (e) {
      setState(() {
        _isLoadingHistory = false;
      });
      // Silently fail - history is optional
    }
  }

  String _formatDateTime(DateTime date) {
    return '${date.day}/${date.month}/${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final receipt = widget.receipt;
    final store = receipt.receiptData['store'] as Map<String, dynamic>?;
    final invoice = receipt.receiptData['invoice'] as Map<String, dynamic>?;
    final summary = invoice?['summary'] as Map<String, dynamic>?;
    final items = invoice?['items'] as List<dynamic>? ?? [];
    final payment = invoice?['payment'] as Map<String, dynamic>?;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Receipt Details'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Receipt Header
            Container(
              decoration: BoxDecoration(
                color: CryptoScheme.border.withOpacity(0.3),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: CryptoScheme.border,
                  width: 1,
                ),
              ),
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
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
                            size: 32,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                receipt.storeName ?? 'Unknown Store',
                                style: const TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                  color: CryptoScheme.text,
                                  letterSpacing: -0.5,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                _formatDateTime(receipt.createdAt),
                                style: const TextStyle(
                                  fontSize: 14,
                                  color: CryptoScheme.muted,
                                  letterSpacing: 0.2,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (receipt.totalSymEarned != null &&
                            receipt.totalSymEarned! > 0)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
                            decoration: BoxDecoration(
                              color: CryptoScheme.symColor.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: CryptoScheme.symColor,
                                width: 1,
                              ),
                            ),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(
                                  Icons.account_balance_wallet,
                                  size: 20,
                                  color: CryptoScheme.symColor,
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${receipt.totalSymEarned!.toStringAsFixed(1)} SYM',
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: CryptoScheme.symColor,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Store Information
            if (store != null) ...[
              _buildSection(
                title: 'Store Information',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (store['name'] != null)
                      _buildInfoRow('Name', store['name'] as String),
                    if (store['company'] != null)
                      _buildInfoRow('Company', store['company'] as String),
                    if (store['address'] != null)
                      _buildInfoRow('Address', store['address'] as String),
                    if (store['phone'] != null)
                      _buildInfoRow('Phone', store['phone'] as String),
                    if (store['email'] != null)
                      _buildInfoRow('Email', store['email'] as String),
                  ],
                ),
              ),
              const SizedBox(height: 24),
            ],

            // Invoice Information
            if (invoice != null) ...[
              _buildSection(
                title: 'Invoice Information',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (invoice['invoice_no'] != null)
                      _buildInfoRow('Invoice No', invoice['invoice_no'] as String),
                    if (invoice['order_no'] != null)
                      _buildInfoRow('Order No', invoice['order_no'] as String),
                    if (invoice['date'] != null)
                      _buildInfoRow('Date', invoice['date'] as String),
                    if (invoice['time'] != null)
                      _buildInfoRow('Time', invoice['time'] as String),
                    if (invoice['cashier'] != null)
                      _buildInfoRow('Cashier', invoice['cashier'] as String),
                  ],
                ),
              ),
              const SizedBox(height: 24),
            ],

            // Items
            if (items.isNotEmpty) ...[
              _buildSection(
                title: 'Items (${items.length})',
                child: Column(
                  children: items.asMap().entries.map((entry) {
                    final index = entry.key;
                    final item = entry.value as Map<String, dynamic>;
                    return Container(
                      margin: EdgeInsets.only(
                        bottom: index < items.length - 1 ? 12 : 0,
                      ),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: CryptoScheme.secondary.withOpacity(0.08),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: CryptoScheme.secondary.withOpacity(0.2),
                          width: 1,
                        ),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: CryptoScheme.secondary.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(
                              Icons.inventory_2_outlined,
                              size: 18,
                              color: CryptoScheme.secondary,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item['description'] as String? ?? 'Unknown Item',
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: CryptoScheme.text,
                                    letterSpacing: 0.2,
                                  ),
                                ),
                                if (item['quantity'] != null &&
                                    item['unit_price'] != null) ...[
                                  const SizedBox(height: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 4,
                                    ),
                                    decoration: BoxDecoration(
                                      color: CryptoScheme.border.withOpacity(0.3),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      '${item['quantity']} x ${item['unit_price']} ${receipt.currency}',
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: CryptoScheme.muted,
                                        letterSpacing: 0.2,
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          if (item['amount'] != null)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                  colors: [
                                    CryptoScheme.primary.withOpacity(0.2),
                                    CryptoScheme.primary.withOpacity(0.1),
                                  ],
                                ),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: CryptoScheme.primary.withOpacity(0.3),
                                  width: 1,
                                ),
                              ),
                              child: Text(
                                '${item['amount']} ${receipt.currency}',
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: CryptoScheme.primary,
                                  letterSpacing: 0.2,
                                ),
                              ),
                            ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 24),
            ],

            // Summary
            if (summary != null) ...[
              _buildSection(
                title: 'Summary',
                child: Column(
                  children: [
                    if (summary['subtotal'] != null)
                      _buildSummaryRow(
                        'Subtotal',
                        '${summary['subtotal']} ${receipt.currency}',
                      ),
                    if (summary['discount_total'] != null)
                      _buildSummaryRow(
                        'Discount',
                        '-${summary['discount_total']} ${receipt.currency}',
                        isDiscount: true,
                      ),
                    if (summary['tax'] != null)
                      _buildSummaryRow(
                        'Tax',
                        '${summary['tax']} ${receipt.currency}',
                      ),
                    if (summary['total'] != null)
                      Container(
                        margin: const EdgeInsets.only(top: 12),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [
                              CryptoScheme.primary.withOpacity(0.2),
                              CryptoScheme.primary.withOpacity(0.1),
                            ],
                          ),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: CryptoScheme.primary.withOpacity(0.4),
                            width: 1.5,
                          ),
                        ),
                        child: _buildSummaryRow(
                          'Total',
                          '${summary['total']} ${receipt.currency}',
                          isTotal: true,
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
            ],

            // Payment Information
            if (payment != null) ...[
              _buildSection(
                title: 'Payment',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (payment['method'] != null)
                      _buildInfoRow('Method', payment['method'] as String),
                    if (payment['amount_paid'] != null)
                      _buildInfoRow(
                        'Amount Paid',
                        '${payment['amount_paid']} ${receipt.currency}',
                      ),
                    if (payment['change'] != null)
                      _buildInfoRow(
                        'Change',
                        '${payment['change']} ${receipt.currency}',
                      ),
                    if (payment['transaction_id'] != null)
                      _buildInfoRow(
                        'Transaction ID',
                        payment['transaction_id'] as String,
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
            ],

            // SYM Earning History
            _buildSection(
              title: 'SYM Earning History',
              child: _isLoadingHistory
                  ? const Center(
                      child: Padding(
                        padding: EdgeInsets.all(20),
                        child: CircularProgressIndicator(
                          color: CryptoScheme.primary,
                        ),
                      ),
                    )
                  : _earningHistory.isEmpty
                      ? Padding(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            children: [
                              const Icon(
                                Icons.history,
                                size: 48,
                                color: CryptoScheme.muted,
                              ),
                              const SizedBox(height: 12),
                              const Text(
                                'No earning history available',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: CryptoScheme.muted,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Total earned: ${receipt.totalSymEarned?.toStringAsFixed(1) ?? "0.0"} SYM',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: CryptoScheme.symColor,
                                ),
                              ),
                            ],
                          ),
                        )
                      : Column(
                          children: [
                            ..._earningHistory.map((history) {
                              return Container(
                                padding: const EdgeInsets.symmetric(
                                  vertical: 12,
                                  horizontal: 16,
                                ),
                                margin: const EdgeInsets.only(bottom: 12),
                                decoration: BoxDecoration(
                                  color: CryptoScheme.border.withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: CryptoScheme.border,
                                    width: 1,
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(8),
                                      decoration: BoxDecoration(
                                        color: CryptoScheme.symColor.withOpacity(0.2),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: const Icon(
                                        Icons.account_balance_wallet,
                                        size: 20,
                                        color: CryptoScheme.symColor,
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            history.activityTitle,
                                            style: const TextStyle(
                                              fontSize: 14,
                                              fontWeight: FontWeight.w600,
                                              color: CryptoScheme.text,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            _formatDateTime(history.earnedAt),
                                            style: const TextStyle(
                                              fontSize: 12,
                                              color: CryptoScheme.muted,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Text(
                                          '+${history.amount.toStringAsFixed(1)} SYM',
                                          style: const TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.bold,
                                            color: CryptoScheme.symColor,
                                          ),
                                        ),
                                        if (history.transactionHash != null) ...[
                                          const SizedBox(height: 4),
                                          Text(
                                            'View TX',
                                            style: TextStyle(
                                              fontSize: 10,
                                              color: CryptoScheme.primary,
                                              decoration:
                                                  TextDecoration.underline,
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ],
                                ),
                              );
                            }),
                            const SizedBox(height: 12),
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: CryptoScheme.symColor.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: CryptoScheme.symColor,
                                  width: 1,
                                ),
                              ),
                              child: Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text(
                                    'Total Earned',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: CryptoScheme.text,
                                    ),
                                  ),
                                  Text(
                                    '${receipt.totalSymEarned?.toStringAsFixed(1) ?? "0.0"} SYM',
                                    style: const TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                      color: CryptoScheme.symColor,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildSection({
    required String title,
    required Widget child,
  }) {
    return Container(
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
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 4,
                  height: 20,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        CryptoScheme.merchantColor,
                        CryptoScheme.secondary,
                      ],
                    ),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: CryptoScheme.text,
                    letterSpacing: -0.5,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            child,
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 14,
                color: CryptoScheme.muted,
                letterSpacing: 0.2,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: CryptoScheme.text,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(
    String label,
    String value, {
    bool isDiscount = false,
    bool isTotal = false,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: isTotal ? 16 : 14,
              fontWeight: isTotal ? FontWeight.bold : FontWeight.w500,
              color: CryptoScheme.text,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: isTotal ? 18 : 14,
              fontWeight: FontWeight.bold,
              color: isDiscount
                  ? CryptoScheme.error
                  : isTotal
                      ? CryptoScheme.primary
                      : CryptoScheme.text,
            ),
          ),
        ],
      ),
    );
  }
}

