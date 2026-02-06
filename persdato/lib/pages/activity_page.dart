import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/activity_model.dart';
import '../models/wallet_model.dart';
import '../services/activity_service.dart';
import 'daily_scan_detail_page.dart';
import 'model_developer_detail_page.dart';
import 'merchant_detail_page.dart';

class ActivityPage extends StatefulWidget {
  const ActivityPage({super.key});

  @override
  State<ActivityPage> createState() => _ActivityPageState();
}

class _ActivityPageState extends State<ActivityPage> {
  List<Activity> _dailyActivities = [];
  List<Activity> _merchantActivities = [];
  List<Activity> _modelDeveloperActivities = [];
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

  void _checkAndLoadActivities(
    String walletAddress, {
    bool forceReload = false,
  }) {
    // Load if wallet address changed, not loaded yet, or forced reload
    if ((_lastLoadedAddress != walletAddress || forceReload) &&
        walletAddress.isNotEmpty) {
      _lastLoadedAddress = walletAddress;
      _isLoadingScheduled = false;
      _loadActivities();
    }
  }

  Future<void> _loadActivities() async {
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
      final activities = await ActivityService.getActivities(
        walletAddress: walletModel.address,
      );

      setState(() {
        _dailyActivities = activities.where((a) => a.type == 'daily').toList();
        _merchantActivities = activities
            .where((a) => a.type == 'merchant')
            .toList();
        _modelDeveloperActivities = activities
            .where((a) => a.type == 'model_developer')
            .toList();
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load activities: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _claimReward(Activity activity) async {
    final walletModel = Provider.of<WalletModel>(context, listen: false);
    try {
      final result = await ActivityService.claimReward(
        activityId: activity.id,
        walletAddress: walletModel.address,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Reward claimed! ${result['rewardTokens']} SYM tokens',
            ),
            backgroundColor: Colors.green,
          ),
        );
        _loadActivities(); // Refresh activities
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to claim reward: $e'),
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

        // Check and load activities when wallet is connected
        if (walletModel.isConnected && walletModel.address.isNotEmpty) {
          // Load if address changed or not loaded yet
          final addressChanged = _lastLoadedAddress != walletModel.address;
          // Only reload on tab switch if we already have data for this address
          final shouldReloadOnTabSwitch =
              shouldReload &&
              _lastLoadedAddress == walletModel.address &&
              (_dailyActivities.isNotEmpty ||
                  _merchantActivities.isNotEmpty ||
                  _modelDeveloperActivities.isNotEmpty);

          final needsLoad = addressChanged || shouldReloadOnTabSwitch;

          if (needsLoad && !_isLoadingScheduled) {
            _isLoadingScheduled = true;
            // Update visibility time
            _lastVisibleTime = now;
            // Use post frame callback to avoid calling setState during build
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted) {
                final forceReload = shouldReloadOnTabSwitch;
                _checkAndLoadActivities(
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
                  _dailyActivities = [];
                  _merchantActivities = [];
                  _modelDeveloperActivities = [];
                  _error = null;
                  _isLoading = false;
                });
              }
            });
          }
        }

        // Crypto color palette
        const Color cryptoBg = Color(0xFF0F172A); // Dark slate
        const Color cryptoText = Color(0xFFF8FAFC); // Light slate
        const Color cryptoPrimary = Color(0xFFF59E0B); // Amber
        const Color cryptoBorder = Color(0xFF334155); // Slate border
        const Color cryptoMuted = Color(0xFF64748B); // Muted text

        if (!walletModel.isConnected) {
          return Scaffold(
            backgroundColor: cryptoBg,
            appBar: AppBar(
              title: const Text(
                'Activities',
                style: TextStyle(
                  color: cryptoText,
                  fontWeight: FontWeight.w600,
                  fontSize: 20,
                ),
              ),
              automaticallyImplyLeading: false,
              backgroundColor: cryptoBg,
              elevation: 0,
            ),
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: cryptoBorder,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.account_balance_wallet_outlined,
                      size: 48,
                      color: cryptoPrimary,
                    ),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'Connect Your Wallet',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: cryptoText,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Please connect your wallet to view activities',
                    style: TextStyle(
                      fontSize: 16,
                      color: cryptoMuted,
                    ),
                  ),
                ],
              ),
            ),
          );
        }

        return Scaffold(
          backgroundColor: cryptoBg,
          appBar: AppBar(
            title: const Text(
              'Activities',
              style: TextStyle(
                color: cryptoText,
                fontWeight: FontWeight.w600,
                fontSize: 20,
              ),
            ),
            automaticallyImplyLeading: false,
            backgroundColor: cryptoBg,
            elevation: 0,
          ),
          body: _isLoading
              ? Center(
                  child: CircularProgressIndicator(
                    valueColor: AlwaysStoppedAnimation<Color>(cryptoPrimary),
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
                          color: cryptoBorder,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.error_outline,
                          size: 48,
                          color: Colors.red,
                        ),
                      ),
                      const SizedBox(height: 24),
                      Text(
                        _error!,
                        style: const TextStyle(
                          color: cryptoText,
                          fontSize: 16,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 24),
                      ElevatedButton(
                        onPressed: _loadActivities,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: cryptoPrimary,
                          foregroundColor: cryptoBg,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 32,
                            vertical: 16,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        child: const Text(
                          'Retry',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 16,
                          ),
                        ),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadActivities,
                  color: cryptoPrimary,
                  backgroundColor: cryptoBg,
                  child: _buildCategorizedScrollView(),
                ),
        );
      },
    );
  }

  Widget _buildCategorizedScrollView() {
    final List<Widget> sections = [];

    // Daily Activities Section
    /*sections.add(
      _buildCategoryHeader(
        title: 'Daily Activities',
        icon: Icons.today,
        color: Colors.blue,
        count: _dailyActivities.length,
      ),
    );*/
    if (_dailyActivities.isEmpty) {
      sections.add(_buildEmptySection('No daily activities available'));
    } else {
      for (var activity in _dailyActivities) {
        sections.add(_buildActivityCard(activity));
      }
    }

    // Merchant Activities Section
    /*sections.add(
      _buildCategoryHeader(
        title: 'Merchant Activities',
        icon: Icons.store,
        color: Colors.orange,
        count: _merchantActivities.length,
      ),
    );*/
    if (_merchantActivities.isEmpty) {
      sections.add(_buildEmptySection('No merchant activities available'));
    } else {
      for (var activity in _merchantActivities) {
        sections.add(_buildActivityCard(activity));
      }
    }

    // Model Developer Activities Section
    /*sections.add(
      _buildCategoryHeader(
        title: 'Model Developer Activities',
        icon: Icons.developer_mode,
        color: Colors.purple,
        count: _modelDeveloperActivities.length,
      ),
    );*/
    if (_modelDeveloperActivities.isEmpty) {
      sections.add(
        _buildEmptySection('No model developer activities available'),
      );
    } else {
      for (var activity in _modelDeveloperActivities) {
        sections.add(_buildActivityCard(activity));
      }
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: sections,
    );
  }

  Widget _buildEmptySection(String message) {
    const Color cryptoBorder = Color(0xFF334155);
    const Color cryptoMuted = Color(0xFF64748B);
    
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: cryptoBorder.withOpacity(0.3),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: cryptoBorder,
          width: 1,
        ),
      ),
      child: Center(
        child: Text(
          message,
          style: const TextStyle(
            fontSize: 14,
            color: cryptoMuted,
          ),
        ),
      ),
    );
  }

  Widget _buildActivityCard(Activity activity) {
    // Crypto color palette
    const Color cryptoBg = Color(0xFF0F172A);
    const Color cryptoText = Color(0xFFF8FAFC);
    const Color cryptoPrimary = Color(0xFFF59E0B); // Amber/Gold - SYM token color
    const Color cryptoBorder = Color(0xFF334155);
    const Color cryptoMuted = Color(0xFF64748B);
    
    // Activity-specific colors
    const Color merchantColor = Color(0xFF3B82F6); // Blue for merchant
    const Color modelDevColor = Color(0xFF10B981); // Green/Emerald for model developer
    
    final progress = activity.progress;
    final progressPercentage = activity.progressPercentage;
    final isCompleted = progress?.isCompleted ?? false;
    final rewardClaimed = progress?.rewardClaimed ?? false;

    // Check if this is a daily scan activity
    final isDailyScan = activity.type == 'daily' &&
        activity.title.toLowerCase().contains('scan');
    
    // Check if this is a merchant activity
    final isMerchant = activity.type == 'merchant';
    
    // Check if this is a model developer activity
    final isModelDeveloper = activity.type == 'model_developer';

    Color typeColor;
    IconData typeIcon;
    switch (activity.type) {
      case 'daily':
        typeColor = cryptoPrimary; // Amber/Gold - matches SYM token color
        typeIcon = Icons.today;
        break;
      case 'merchant':
        typeColor = merchantColor; // Blue for merchant
        typeIcon = Icons.store;
        break;
      case 'model_developer':
        typeColor = modelDevColor; // Green/Emerald for model developer
        typeIcon = Icons.developer_mode;
        break;
      default:
        typeColor = cryptoMuted;
        typeIcon = Icons.help_outline;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: cryptoBorder.withOpacity(0.3),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: cryptoBorder,
          width: 1,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: isDailyScan
              ? () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (context) => DailyScanDetailPage(
                        activity: activity,
                      ),
                    ),
                  );
                }
              : isMerchant
                  ? () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (context) => MerchantDetailPage(
                            activity: activity,
                          ),
                        ),
                      );
                    }
                  : isModelDeveloper
                      ? () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (context) => ModelDeveloperDetailPage(
                                activity: activity,
                              ),
                            ),
                          );
                        }
                      : null,
          borderRadius: BorderRadius.circular(12),
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
                        color: typeColor.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: typeColor,
                          width: 2,
                        ),
                      ),
                      child: Icon(
                        typeIcon,
                        color: typeColor,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            activity.title,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: cryptoText,
                              letterSpacing: -0.5,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: typeColor.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              activity.typeLabel.toUpperCase(),
                              style: TextStyle(
                                fontSize: 10,
                                color: typeColor,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: cryptoPrimary.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: cryptoPrimary,
                          width: 1.5,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.account_balance_wallet,
                            size: 18,
                            color: cryptoPrimary,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            '${activity.rewardTokens.toStringAsFixed(1)} SYM',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: cryptoPrimary,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  activity.description,
                  style: const TextStyle(
                    fontSize: 14,
                    color: cryptoMuted,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 20),
                // Progress section
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Progress',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: cryptoMuted,
                            letterSpacing: 0.5,
                          ),
                        ),
                        Text(
                          '${progress?.currentCount ?? 0}/${activity.targetCount} • ${(progressPercentage * 100).toStringAsFixed(0)}%',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: isCompleted ? cryptoPrimary : cryptoMuted,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Container(
                      height: 8,
                      decoration: BoxDecoration(
                        color: cryptoBorder,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: FractionallySizedBox(
                        alignment: Alignment.centerLeft,
                        widthFactor: progressPercentage,
                        child: Container(
                          decoration: BoxDecoration(
                            color: isCompleted ? cryptoPrimary : typeColor,
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                // Action button
                if (isCompleted && !rewardClaimed)
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => _claimReward(activity),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: cryptoPrimary,
                        foregroundColor: cryptoBg,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        elevation: 0,
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.check_circle, size: 20),
                          SizedBox(width: 8),
                          Text(
                            'Claim Reward',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                else if (isCompleted && rewardClaimed)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: cryptoBorder.withOpacity(0.5),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: cryptoBorder,
                        width: 1,
                      ),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.check_circle,
                          color: cryptoPrimary,
                          size: 20,
                        ),
                        SizedBox(width: 8),
                        Text(
                          'Reward Claimed',
                          style: TextStyle(
                            color: cryptoMuted,
                            fontWeight: FontWeight.w600,
                            fontSize: 16,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
