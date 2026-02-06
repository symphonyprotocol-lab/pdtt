import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/notification_model.dart' as models;
import '../models/wallet_model.dart';
import '../services/notification_service.dart';
import '../theme/crypto_theme.dart';

class MessagePage extends StatefulWidget {
  const MessagePage({super.key});

  @override
  State<MessagePage> createState() => _MessagePageState();
}

class _MessagePageState extends State<MessagePage> {
  List<models.Notification> _notifications = [];
  bool _isLoading = false;
  String? _error;
  String? _lastLoadedAddress;
  bool _isLoadingScheduled = false;
  DateTime? _lastVisibleTime;

  @override
  void initState() {
    super.initState();
    // Set initial loading state to false, will be set to true when we actually load
    _isLoading = false;
  }

  void _checkAndLoadNotifications(
    String walletAddress, {
    bool forceReload = false,
  }) {
    // Load if wallet address changed, not loaded yet, or forced reload
    if ((_lastLoadedAddress != walletAddress || forceReload) &&
        walletAddress.isNotEmpty) {
      _lastLoadedAddress = walletAddress;
      _isLoadingScheduled = false;
      _loadNotifications();
    }
  }

  Future<void> _loadNotifications() async {
    final walletModel = Provider.of<WalletModel>(context, listen: false);
    if (!walletModel.isConnected || walletModel.address.isEmpty) {
      setState(() {
        _isLoading = false;
        _error = 'Please connect your wallet first';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final notifications = await NotificationService.getNotifications(
        walletAddress: walletModel.address,
      );

      setState(() {
        _notifications = notifications;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load notifications: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _markAsRead(models.Notification notification) async {
    if (notification.read) return;

    try {
      await NotificationService.markAsRead(notificationId: notification.id);
      // Reload notifications to get updated read status
      _loadNotifications();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to mark as read: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<WalletModel>(
      builder: (context, walletModel, child) {
        // Check if page just became visible (tab switched to this page)
        final now = DateTime.now();
        final shouldReload =
            _lastVisibleTime != null &&
            now.difference(_lastVisibleTime!) > const Duration(seconds: 1);

        // Check and load notifications when wallet is connected
        if (walletModel.isConnected && walletModel.address.isNotEmpty) {
          // Load if address changed or not loaded yet
          final addressChanged = _lastLoadedAddress != walletModel.address;
          // Only reload on tab switch if we already have data for this address
          final shouldReloadOnTabSwitch =
              shouldReload &&
              _lastLoadedAddress == walletModel.address &&
              _notifications.isNotEmpty;

          final needsLoad = addressChanged || shouldReloadOnTabSwitch;

          if (needsLoad && !_isLoadingScheduled) {
            _isLoadingScheduled = true;
            // Update visibility time
            _lastVisibleTime = now;
            // Use post frame callback to avoid calling setState during build
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted) {
                final forceReload = shouldReloadOnTabSwitch;
                _checkAndLoadNotifications(
                  walletModel.address,
                  forceReload: forceReload,
                );
              } else {
                _isLoadingScheduled = false;
              }
            });
          } else if (!shouldReload && _lastVisibleTime == null) {
            // Mark as visible for the first time
            _lastVisibleTime = now;
          }
        } else {
          // Reset when wallet disconnects
          if (_lastLoadedAddress != null) {
            _lastLoadedAddress = null;
            // Use post frame callback to avoid calling setState during build
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted) {
                setState(() {
                  _notifications = [];
                  _error = null;
                  _isLoading = false;
                });
              }
            });
          }
        }

        if (!walletModel.isConnected) {
          return Scaffold(
            backgroundColor: CryptoScheme.background,
            appBar: AppBar(
              title: const Text('Messages'),
              automaticallyImplyLeading: false,
            ),
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
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
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: CryptoScheme.text,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Please connect your wallet to view notifications',
                    style: const TextStyle(
                      fontSize: 16,
                      color: CryptoScheme.muted,
                    ),
                  ),
                ],
              ),
            ),
          );
        }

        return Scaffold(
          backgroundColor: CryptoScheme.background,
          appBar: AppBar(
            title: const Text('Messages'),
            automaticallyImplyLeading: false,
          ),
          body: _isLoading
              ? Center(
                  child: CircularProgressIndicator(
                    valueColor: AlwaysStoppedAnimation<Color>(CryptoScheme.primary),
                  ),
                )
              : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: CryptoScheme.border,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.error_outline,
                          size: 48,
                          color: CryptoScheme.error,
                        ),
                      ),
                      const SizedBox(height: 24),
                      Text(
                        _error!,
                        style: const TextStyle(
                          color: CryptoScheme.text,
                          fontSize: 16,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 24),
                      ElevatedButton(
                        onPressed: _loadNotifications,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: CryptoScheme.primary,
                          foregroundColor: CryptoScheme.background,
                        ),
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadNotifications,
                  color: CryptoScheme.primary,
                  backgroundColor: CryptoScheme.background,
                  child: _notifications.isEmpty
                      ? ListView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          children: [
                            SizedBox(
                              height: MediaQuery.of(context).size.height * 0.6,
                              child: Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(24),
                                      decoration: BoxDecoration(
                                        color: CryptoScheme.border,
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(
                                        Icons.inbox,
                                        size: 48,
                                        color: CryptoScheme.muted,
                                      ),
                                    ),
                                    const SizedBox(height: 24),
                                    const Text(
                                      'No notifications',
                                      style: TextStyle(
                                        fontSize: 16,
                                        color: CryptoScheme.muted,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        )
                      : ListView.builder(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.all(16),
                          itemCount: _notifications.length,
                          itemBuilder: (context, index) {
                            return _buildNotificationCard(
                              _notifications[index],
                            );
                          },
                        ),
                ),
        );
      },
    );
  }

  Widget _buildNotificationCard(models.Notification notification) {
    final isUnread = !notification.read;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: isUnread
            ? CryptoScheme.info.withOpacity(0.2)
            : CryptoScheme.border.withOpacity(0.3),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isUnread ? CryptoScheme.info : CryptoScheme.border,
          width: isUnread ? 2 : 1,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _markAsRead(notification),
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: CryptoScheme.info.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: CryptoScheme.info,
                          width: 1.5,
                        ),
                      ),
                      child: const Icon(
                        Icons.notifications,
                        color: CryptoScheme.info,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  notification.title,
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: isUnread
                                        ? FontWeight.bold
                                        : FontWeight.w600,
                                    color: CryptoScheme.text,
                                    letterSpacing: -0.3,
                                  ),
                                ),
                              ),
                              if (isUnread)
                                Container(
                                  width: 10,
                                  height: 10,
                                  decoration: const BoxDecoration(
                                    color: CryptoScheme.info,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            notification.timeAgo,
                            style: const TextStyle(
                              fontSize: 12,
                              color: CryptoScheme.muted,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  notification.content,
                  style: const TextStyle(
                    fontSize: 14,
                    color: CryptoScheme.text,
                    height: 1.5,
                  ),
                ),
                if (notification.userAccepted) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: CryptoScheme.success.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: CryptoScheme.success,
                        width: 1,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.check_circle,
                          size: 16,
                          color: CryptoScheme.success,
                        ),
                        const SizedBox(width: 6),
                        const Text(
                          'Accepted',
                          style: TextStyle(
                            fontSize: 12,
                            color: CryptoScheme.success,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.5,
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
