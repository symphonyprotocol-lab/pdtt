import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'dart:math' as math;
import '../models/activity_model.dart';
import '../models/wallet_model.dart';
import '../services/activity_service.dart';
import '../services/transfer_service.dart';
import '../theme/crypto_theme.dart';

enum JoinStep { idle, updatingProgress, transferringTokens, completed, error }

class ModelDeveloperDetailPage extends StatefulWidget {
  final Activity activity;

  const ModelDeveloperDetailPage({super.key, required this.activity});

  @override
  State<ModelDeveloperDetailPage> createState() =>
      _ModelDeveloperDetailPageState();
}

class _ModelDeveloperDetailPageState extends State<ModelDeveloperDetailPage>
    with TickerProviderStateMixin {
  JoinStep _joinStep = JoinStep.idle;
  String? _errorMessage;
  double _rewardAmount = 0.0;

  late AnimationController _progressController;
  late AnimationController _winController;
  late Animation<double> _progressAnimation;
  late Animation<double> _winScaleAnimation;
  late Animation<double> _winRotationAnimation;

  @override
  void initState() {
    super.initState();
    _progressController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );
    _winController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    );

    _progressAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _progressController, curve: Curves.easeInOut),
    );

    _winScaleAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _winController, curve: Curves.elasticOut),
    );

    _winRotationAnimation = Tween<double>(
      begin: 0.0,
      end: 2 * math.pi,
    ).animate(CurvedAnimation(parent: _winController, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _progressController.dispose();
    _winController.dispose();
    super.dispose();
  }

  Future<void> _joinActivity() async {
    final walletModel = Provider.of<WalletModel>(context, listen: false);
    if (!walletModel.isConnected || walletModel.address.isEmpty) {
      setState(() {
        _joinStep = JoinStep.error;
        _errorMessage = 'Please connect your wallet first';
      });
      return;
    }

    try {
      _progressController.forward();

      // Step 1: Update activity progress
      setState(() {
        _joinStep = JoinStep.updatingProgress;
      });
      await ActivityService.updateProgress(
        activityId: widget.activity.id,
        walletAddress: walletModel.address,
        increment: 1,
      );

      // Step 2: Transfer SYM tokens
      setState(() {
        _joinStep = JoinStep.transferringTokens;
      });

      // Use the activity's reward tokens amount
      _rewardAmount = widget.activity.rewardTokens;

      // Transfer SYM tokens
      await TransferService.transferSymToken(
        toAddress: walletModel.address,
        amount: _rewardAmount,
      );

      // Step 3: Complete
      setState(() {
        _joinStep = JoinStep.completed;
      });

      // Show win animation immediately
      _winController.forward();

      // Refresh wallet balances in background
      walletModel.refreshBalances();

      // Show success message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Success! You earned ${_rewardAmount.toStringAsFixed(2)} SYM tokens! 🎉',
            ),
            backgroundColor: CryptoScheme.success,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } catch (e) {
      setState(() {
        _joinStep = JoinStep.error;
        _errorMessage = 'Error joining activity: $e';
        debugPrint('Error joining activity: $e');
      });
      _progressController.reset();
    }
  }

  String _getJoinButtonText() {
    switch (_joinStep) {
      case JoinStep.idle:
        return 'Join';
      case JoinStep.updatingProgress:
        return 'Joining...';
      case JoinStep.transferringTokens:
        return 'Processing...';
      case JoinStep.completed:
        return 'Joined!';
      case JoinStep.error:
        return 'Try Again';
    }
  }

  @override
  Widget build(BuildContext context) {
    final progress = widget.activity.progress;
    final progressPercentage = widget.activity.progressPercentage;
    final isCompleted = progress?.isCompleted ?? false;
    final hasJoined = progress != null && progress.currentCount > 0;

    return Scaffold(
      backgroundColor: CryptoScheme.background,
      appBar: AppBar(
        title: const Text('Model Developer Activity'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SafeArea(
        child: Stack(
          children: [
            Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Activity Header
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
                                        color: CryptoScheme.modelDevColor.withOpacity(0.2),
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(
                                          color: CryptoScheme.modelDevColor,
                                          width: 2,
                                        ),
                                      ),
                                      child: const Icon(
                                        Icons.developer_mode,
                                        color: CryptoScheme.modelDevColor,
                                        size: 32,
                                      ),
                                    ),
                                    const SizedBox(width: 16),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            widget.activity.title,
                                            style: const TextStyle(
                                              fontSize: 24,
                                              fontWeight: FontWeight.bold,
                                              color: CryptoScheme.text,
                                              letterSpacing: -0.5,
                                            ),
                                          ),
                                          const SizedBox(height: 6),
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 8,
                                              vertical: 4,
                                            ),
                                            decoration: BoxDecoration(
                                              color: CryptoScheme.modelDevColor.withOpacity(0.2),
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                            child: Text(
                                              widget.activity.typeLabel.toUpperCase(),
                                              style: const TextStyle(
                                                fontSize: 10,
                                                color: CryptoScheme.modelDevColor,
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
                                        color: CryptoScheme.symColor.withOpacity(0.2),
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border.all(
                                          color: CryptoScheme.symColor,
                                          width: 1.5,
                                        ),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          const Icon(
                                            Icons.account_balance_wallet,
                                            size: 18,
                                            color: CryptoScheme.symColor,
                                          ),
                                          const SizedBox(width: 6),
                                          Text(
                                            '${widget.activity.rewardTokens.toStringAsFixed(1)} SYM',
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
                                const SizedBox(height: 16),
                                Text(
                                  widget.activity.description,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    color: CryptoScheme.muted,
                                    height: 1.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Progress Section
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
                                const Text(
                                  'Progress',
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                    color: CryptoScheme.text,
                                    letterSpacing: -0.5,
                                  ),
                                ),
                                const SizedBox(height: 16),
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      'Participants: ${progress?.currentCount ?? 0}/${widget.activity.targetCount}',
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: CryptoScheme.muted,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                    Text(
                                      '${(progressPercentage * 100).toStringAsFixed(0)}%',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: isCompleted
                                            ? CryptoScheme.success
                                            : CryptoScheme.modelDevColor,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                AnimatedBuilder(
                                  animation: _progressAnimation,
                                  builder: (context, child) {
                                    final animatedValue =
                                        _joinStep == JoinStep.completed
                                        ? 1.0
                                        : _progressAnimation.value;
                                    return Container(
                                      height: 8,
                                      decoration: BoxDecoration(
                                        color: CryptoScheme.border,
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: FractionallySizedBox(
                                        alignment: Alignment.centerLeft,
                                        widthFactor: _joinStep != JoinStep.idle
                                            ? animatedValue
                                            : progressPercentage,
                                        child: Container(
                                          decoration: BoxDecoration(
                                            color: _joinStep == JoinStep.completed
                                                ? CryptoScheme.success
                                                : isCompleted
                                                    ? CryptoScheme.success
                                                    : CryptoScheme.modelDevColor,
                                            borderRadius: BorderRadius.circular(4),
                                          ),
                                        ),
                                      ),
                                    );
                                  },
                                ),
                                if (hasJoined) ...[
                                  const SizedBox(height: 12),
                                  Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: CryptoScheme.modelDevColor.withOpacity(0.2),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(
                                        color: CryptoScheme.modelDevColor,
                                        width: 1,
                                      ),
                                    ),
                                    child: const Row(
                                      children: [
                                        Icon(
                                          Icons.check_circle,
                                          color: CryptoScheme.modelDevColor,
                                          size: 20,
                                        ),
                                        SizedBox(width: 8),
                                        Text(
                                          'You have joined this activity!',
                                          style: TextStyle(
                                            color: CryptoScheme.modelDevColor,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 14,
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
                        const SizedBox(height: 24),

                        // Reward Information
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Reward Information',
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 12),
                                _buildInfoRow(
                                  icon: Icons.attach_money,
                                  label: 'Reward Amount',
                                  value:
                                      '${widget.activity.rewardTokens.toStringAsFixed(1)} SYM tokens',
                                ),
                                const SizedBox(height: 8),
                                _buildInfoRow(
                                  icon: Icons.people,
                                  label: 'Target Participants',
                                  value: '${widget.activity.targetCount} users',
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Activity Details
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
                                const Text(
                                  'About This Activity',
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                    color: CryptoScheme.text,
                                    letterSpacing: -0.5,
                                  ),
                                ),
                                const SizedBox(height: 12),
                                _buildInstructionStep(
                                  number: 1,
                                  text: 'Click the "Join" button below',
                                ),
                                const SizedBox(height: 8),
                                _buildInstructionStep(
                                  number: 2,
                                  text: 'Your participation will be recorded',
                                ),
                                const SizedBox(height: 8),
                                _buildInstructionStep(
                                  number: 3,
                                  text:
                                      'Receive ${widget.activity.rewardTokens.toStringAsFixed(1)} SYM tokens as reward',
                                ),
                              ],
                            ),
                          ),
                        ),

                        // Processing Status Card
                        if (_joinStep != JoinStep.idle &&
                            _joinStep != JoinStep.error &&
                            _joinStep != JoinStep.completed) ...[
                          const SizedBox(height: 24),
                          Container(
                            decoration: BoxDecoration(
                              color: CryptoScheme.modelDevColor.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: CryptoScheme.modelDevColor,
                                width: 1,
                              ),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(20),
                              child: Column(
                                children: [
                                  CircularProgressIndicator(
                                    valueColor: AlwaysStoppedAnimation<Color>(
                                      CryptoScheme.modelDevColor,
                                    ),
                                  ),
                                  const SizedBox(height: 16),
                                  Text(
                                    _joinStep == JoinStep.updatingProgress
                                        ? 'Updating progress...'
                                        : 'Transferring tokens...',
                                    style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                      color: CryptoScheme.text,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],

                        // Error Message
                        if (_joinStep == JoinStep.error) ...[
                          const SizedBox(height: 24),
                          Container(
                            decoration: BoxDecoration(
                              color: CryptoScheme.error.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: CryptoScheme.error,
                                width: 1,
                              ),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(20),
                              child: Row(
                                children: [
                                  const Icon(
                                    Icons.error,
                                    color: CryptoScheme.error,
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      _errorMessage ?? 'An error occurred',
                                      style: const TextStyle(
                                        color: CryptoScheme.error,
                                        fontSize: 14,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],

                        const SizedBox(height: 100),
                      ],
                    ),
                  ),
                ),
              ],
            ),

            // Win Animation Overlay
            if (_joinStep == JoinStep.completed)
              AnimatedBuilder(
                animation: _winController,
                builder: (context, child) {
                  return IgnorePointer(
                    child: Container(
                      color: CryptoScheme.background.withOpacity(0.9),
                      child: Center(
                        child: Transform.scale(
                          scale: _winScaleAnimation.value,
                          child: Transform.rotate(
                            angle: _winRotationAnimation.value * 0.1,
                            child: Container(
                              padding: const EdgeInsets.all(32),
                              decoration: BoxDecoration(
                                color: CryptoScheme.border.withOpacity(0.5),
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: CryptoScheme.symColor,
                                  width: 2,
                                ),
                              ),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(
                                    Icons.celebration,
                                    size: 64,
                                    color: CryptoScheme.symColor,
                                  ),
                                  const SizedBox(height: 16),
                                  Text(
                                    '${_rewardAmount.toStringAsFixed(2)} SYM',
                                    style: const TextStyle(
                                      fontSize: 32,
                                      fontWeight: FontWeight.bold,
                                      color: CryptoScheme.symColor,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  const Text(
                                    'Tokens Earned!',
                                    style: TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.w600,
                                      color: CryptoScheme.text,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: CryptoScheme.background,
            border: const Border(
              top: BorderSide(
                color: CryptoScheme.border,
                width: 1,
              ),
            ),
          ),
          child: SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton.icon(
              onPressed:
                  (_joinStep == JoinStep.idle || _joinStep == JoinStep.error)
                  ? _joinActivity
                  : null,
              icon: _joinStep == JoinStep.idle || _joinStep == JoinStep.error
                  ? const Icon(Icons.person_add, size: 24)
                  : _joinStep == JoinStep.completed
                  ? const Icon(Icons.check_circle, size: 24)
                  : const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(CryptoScheme.background),
                      ),
                    ),
              label: Text(
                _getJoinButtonText(),
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: _joinStep == JoinStep.completed
                    ? CryptoScheme.success
                    : hasJoined
                    ? CryptoScheme.muted
                    : CryptoScheme.modelDevColor,
                foregroundColor: CryptoScheme.background,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                elevation: 0,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInfoRow({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Row(
      children: [
        Icon(icon, size: 20, color: CryptoScheme.muted),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 12,
                  color: CryptoScheme.muted,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: CryptoScheme.text,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildInstructionStep({required int number, required String text}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 24,
          height: 24,
          decoration: const BoxDecoration(
            color: CryptoScheme.modelDevColor,
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Text(
              '$number',
              style: const TextStyle(
                color: CryptoScheme.text,
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(
              fontSize: 14,
              height: 1.5,
              color: CryptoScheme.text,
            ),
          ),
        ),
      ],
    );
  }
}
