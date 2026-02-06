import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../models/wallet_model.dart';
import '../theme/crypto_theme.dart';

class WalletPage extends StatelessWidget {
  const WalletPage({super.key});

  String _formatAddress(String address) {
    if (address.length <= 10) return address;
    return '${address.substring(0, 6)}...${address.substring(address.length - 4)}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: CryptoScheme.background,
      appBar: AppBar(
        title: const Text('Wallet'),
        automaticallyImplyLeading: false,
      ),
      body: Consumer<WalletModel>(
        builder: (context, walletModel, child) {
          if (walletModel.isConnecting) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(
                    valueColor: AlwaysStoppedAnimation<Color>(CryptoScheme.primary),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Connecting to wallet...',
                    style: TextStyle(color: CryptoScheme.text),
                  ),
                ],
              ),
            );
          }

          if (walletModel.isConnected && walletModel.address.isNotEmpty) {
            return Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 32),
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: CryptoScheme.border,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.account_balance_wallet,
                      size: 48,
                      color: CryptoScheme.primary,
                    ),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'Wallet Connected',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: CryptoScheme.text,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 32),
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
                      padding: const EdgeInsets.all(20.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Address',
                            style: TextStyle(
                              fontSize: 12,
                              color: CryptoScheme.muted,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: SelectableText(
                                  walletModel.address,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontFamily: 'monospace',
                                    color: CryptoScheme.text,
                                  ),
                                ),
                              ),
                              IconButton(
                                icon: const Icon(Icons.copy, color: CryptoScheme.primary),
                                onPressed: () async {
                                  await Clipboard.setData(
                                    ClipboardData(text: walletModel.address),
                                  );
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: const Text(
                                          'Address copied to clipboard',
                                        ),
                                        backgroundColor: CryptoScheme.primary,
                                      ),
                                    );
                                  }
                                },
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _formatAddress(walletModel.address),
                            style: const TextStyle(
                              fontSize: 12,
                              color: CryptoScheme.muted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  // Token Balances
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          decoration: BoxDecoration(
                            color: CryptoScheme.border.withOpacity(0.3),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: CryptoScheme.border,
                              width: 1,
                            ),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(20.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(8),
                                      decoration: BoxDecoration(
                                        color: CryptoScheme.aptosColor.withOpacity(0.2),
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border.all(
                                          color: CryptoScheme.aptosColor,
                                          width: 1.5,
                                        ),
                                      ),
                                      child: const Icon(
                                        Icons.account_balance_wallet,
                                        size: 20,
                                        color: CryptoScheme.aptosColor,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    const Text(
                                      'APTOS',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: CryptoScheme.muted,
                                        fontWeight: FontWeight.w600,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                walletModel.isLoadingBalances
                                    ? SizedBox(
                                        height: 20,
                                        width: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          valueColor: AlwaysStoppedAnimation<Color>(
                                            CryptoScheme.aptosColor,
                                          ),
                                        ),
                                      )
                                    : Text(
                                        '${walletModel.aptosBalance.toStringAsFixed(4)} APT',
                                        style: const TextStyle(
                                          fontSize: 18,
                                          fontWeight: FontWeight.bold,
                                          color: CryptoScheme.text,
                                          letterSpacing: 0.5,
                                        ),
                                      ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Container(
                          decoration: BoxDecoration(
                            color: CryptoScheme.border.withOpacity(0.3),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: CryptoScheme.border,
                              width: 1,
                            ),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(20.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(8),
                                      decoration: BoxDecoration(
                                        color: CryptoScheme.symColor.withOpacity(0.2),
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border.all(
                                          color: CryptoScheme.symColor,
                                          width: 1.5,
                                        ),
                                      ),
                                      child: const Icon(
                                        Icons.account_balance_wallet,
                                        size: 20,
                                        color: CryptoScheme.symColor,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    const Text(
                                      'SYM',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: CryptoScheme.muted,
                                        fontWeight: FontWeight.w600,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                walletModel.isLoadingBalances
                                    ? SizedBox(
                                        height: 20,
                                        width: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          valueColor: AlwaysStoppedAnimation<Color>(
                                            CryptoScheme.symColor,
                                          ),
                                        ),
                                      )
                                    : Text(
                                        '${walletModel.symBalance.toStringAsFixed(2)} SYM',
                                        style: const TextStyle(
                                          fontSize: 18,
                                          fontWeight: FontWeight.bold,
                                          color: CryptoScheme.symColor,
                                          letterSpacing: 0.5,
                                        ),
                                      ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  // Refresh button
                  TextButton.icon(
                    onPressed: walletModel.isLoadingBalances
                        ? null
                        : () => walletModel.refreshBalances(),
                    icon: const Icon(Icons.refresh),
                    label: const Text('Refresh Balances'),
                    style: TextButton.styleFrom(
                      foregroundColor: CryptoScheme.primary,
                    ),
                  ),
                  const Spacer(),
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 16.0),
                    child: SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: () async {
                          await walletModel.disconnect();
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: const Text('Wallet disconnected'),
                                backgroundColor: CryptoScheme.error,
                              ),
                            );
                          }
                        },
                        icon: const Icon(Icons.logout),
                        label: const Text('Disconnect Wallet'),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          backgroundColor: CryptoScheme.error,
                          foregroundColor: CryptoScheme.text,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            );
          }

          // Not connected state
          return Container(
            padding: const EdgeInsets.all(16.0),
            width: double.infinity,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: CryptoScheme.border,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.account_balance_wallet_outlined,
                    size: 48,
                    color: CryptoScheme.primary,
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'Connect Your Wallet',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: CryptoScheme.text,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Connect with Petra wallet to get started',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 16,
                    color: CryptoScheme.muted,
                  ),
                ),
                const SizedBox(height: 32),
                if (walletModel.error != null) ...[
                  Container(
                    padding: const EdgeInsets.all(16),
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: CryptoScheme.error.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: CryptoScheme.error,
                        width: 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.error_outline,
                          color: CryptoScheme.error,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            walletModel.error!,
                            style: const TextStyle(
                              color: CryptoScheme.error,
                              fontSize: 14,
                            ),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => walletModel.clearError(),
                          color: CryptoScheme.error,
                        ),
                      ],
                    ),
                  ),
                ],
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: walletModel.isConnecting
                        ? null
                        : () async {
                            await walletModel.connect();
                          },
                    icon: const Icon(Icons.link),
                    label: const Text('Connect with Petra'),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 32,
                        vertical: 16,
                      ),
                      textStyle: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
