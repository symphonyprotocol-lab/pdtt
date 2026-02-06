import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'dart:io';
import 'dart:math' as math;
import '../models/activity_model.dart';
import '../models/wallet_model.dart';
import '../services/receipt_service.dart';
import '../services/activity_service.dart';
import '../services/transfer_service.dart';
import '../theme/crypto_theme.dart';

enum ProcessingStep {
  idle,
  processingOCR,
  savingReceipt,
  updatingProgress,
  transferringTokens,
  completed,
  error,
}

class MerchantDetailPage extends StatefulWidget {
  final Activity activity;

  const MerchantDetailPage({super.key, required this.activity});

  @override
  State<MerchantDetailPage> createState() => _MerchantDetailPageState();
}

class _MerchantDetailPageState extends State<MerchantDetailPage>
    with TickerProviderStateMixin {
  final ImagePicker _picker = ImagePicker();
  File? _selectedImage;
  ProcessingStep _processingStep = ProcessingStep.idle;
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

  Future<void> _pickImage() async {
    try {
      // Show dialog to choose camera or gallery
      final ImageSource? source = await showDialog<ImageSource>(
        context: context,
        builder: (context) => AlertDialog(
          backgroundColor: CryptoScheme.border.withOpacity(0.3),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: CryptoScheme.border, width: 1),
          ),
          title: const Text(
            'Select Image Source',
            style: TextStyle(
              color: CryptoScheme.text,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(
                  Icons.camera_alt,
                  color: CryptoScheme.merchantColor,
                ),
                title: const Text(
                  'Camera',
                  style: TextStyle(color: CryptoScheme.text),
                ),
                onTap: () => Navigator.pop(context, ImageSource.camera),
              ),
              ListTile(
                leading: const Icon(
                  Icons.photo_library,
                  color: CryptoScheme.merchantColor,
                ),
                title: const Text(
                  'Gallery',
                  style: TextStyle(color: CryptoScheme.text),
                ),
                onTap: () => Navigator.pop(context, ImageSource.gallery),
              ),
            ],
          ),
        ),
      );

      if (source == null) return;

      final XFile? image = await _picker.pickImage(
        source: source,
        imageQuality: 85,
        maxWidth: 1920,
        maxHeight: 1080,
      );

      if (image != null) {
        setState(() {
          _selectedImage = File(image.path);
          _processingStep = ProcessingStep.processingOCR;
          _errorMessage = null;
        });

        await _processReceipt();
      }
    } catch (e) {
      setState(() {
        _processingStep = ProcessingStep.error;
        _errorMessage = 'Error picking image: $e';
      });
    }
  }

  Future<void> _processReceipt() async {
    final walletModel = Provider.of<WalletModel>(context, listen: false);
    if (!walletModel.isConnected || walletModel.address.isEmpty) {
      setState(() {
        _processingStep = ProcessingStep.error;
        _errorMessage = 'Please connect your wallet first';
      });
      return;
    }

    try {
      _progressController.forward();

      // Step 1: Process OCR
      setState(() {
        _processingStep = ProcessingStep.processingOCR;
      });
      final receiptData = await ReceiptService.processReceiptOCR(
        _selectedImage!,
      );

      // Step 2: Save receipt
      setState(() {
        _processingStep = ProcessingStep.savingReceipt;
      });
      await ReceiptService.saveReceipt(
        walletAddress: walletModel.address,
        receiptData: receiptData,
      );

      // Step 3: Update activity progress
      setState(() {
        _processingStep = ProcessingStep.updatingProgress;
      });
      await ActivityService.updateProgress(
        activityId: widget.activity.id,
        walletAddress: walletModel.address,
        increment: 1,
      );

      // Step 4: Transfer reward
      setState(() {
        _processingStep = ProcessingStep.transferringTokens;
      });

      _rewardAmount = widget.activity.rewardTokens;

      await TransferService.transferSymToken(
        toAddress: walletModel.address,
        amount: _rewardAmount,
      );

      // Step 5: Complete
      setState(() {
        _processingStep = ProcessingStep.completed;
      });

      // Show win animation immediately
      _winController.forward();

      // Refresh wallet balances in background
      walletModel.refreshBalances();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Success! You earned ${_rewardAmount.toStringAsFixed(2)} SYM tokens! 🎉',
              style: const TextStyle(color: CryptoScheme.text),
            ),
            backgroundColor: CryptoScheme.success,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } catch (e) {
      setState(() {
        _processingStep = ProcessingStep.error;
        _errorMessage = 'Error processing receipt: $e';
        debugPrint('Error processing receipt: $e');
      });
      _progressController.reset();
    }
  }

  String _getProcessingMessage() {
    switch (_processingStep) {
      case ProcessingStep.idle:
        return 'Upload Receipt';
      case ProcessingStep.processingOCR:
        return 'Processing OCR...';
      case ProcessingStep.savingReceipt:
        return 'Saving receipt...';
      case ProcessingStep.updatingProgress:
        return 'Updating activity progress...';
      case ProcessingStep.transferringTokens:
        return 'Transferring SYM tokens...';
      case ProcessingStep.completed:
        return 'Completed!';
      case ProcessingStep.error:
        return 'Upload Failed. Retry?';
    }
  }

  @override
  Widget build(BuildContext context) {
    final progress = widget.activity.progress;
    final progressPercentage = widget.activity.progressPercentage;
    final isCompleted = progress?.isCompleted ?? false;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Merchant Activity'),
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
                                        color: CryptoScheme.merchantColor
                                            .withOpacity(0.2),
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(
                                          color: CryptoScheme.merchantColor,
                                          width: 2,
                                        ),
                                      ),
                                      child: const Icon(
                                        Icons.store,
                                        color: CryptoScheme.merchantColor,
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
                                          const SizedBox(height: 4),
                                          Text(
                                            widget.activity.typeLabel
                                                .toUpperCase(),
                                            style: const TextStyle(
                                              fontSize: 14,
                                              color: CryptoScheme.merchantColor,
                                              fontWeight: FontWeight.w600,
                                              letterSpacing: 1,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 12,
                                        vertical: 8,
                                      ),
                                      decoration: BoxDecoration(
                                        color: CryptoScheme.symColor
                                            .withOpacity(0.2),
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(
                                          color: CryptoScheme.symColor,
                                          width: 1,
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
                                    fontSize: 16,
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
                                      'Uploaded: ${progress?.currentCount ?? 0}/${widget.activity.targetCount}',
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w500,
                                        color: CryptoScheme.text,
                                        letterSpacing: 0.2,
                                      ),
                                    ),
                                    Text(
                                      '${(progressPercentage * 100).toStringAsFixed(0)}%',
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w500,
                                        color: CryptoScheme.text,
                                        letterSpacing: 0.2,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                AnimatedBuilder(
                                  animation: _progressAnimation,
                                  builder: (context, child) {
                                    final animatedValue =
                                        _processingStep ==
                                            ProcessingStep.completed
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
                                        widthFactor:
                                            _processingStep !=
                                                ProcessingStep.idle
                                            ? animatedValue
                                            : progressPercentage,
                                        child: Container(
                                          decoration: BoxDecoration(
                                            color:
                                                _processingStep ==
                                                    ProcessingStep.completed
                                                ? CryptoScheme.success
                                                : isCompleted
                                                ? CryptoScheme.success
                                                : CryptoScheme.merchantColor,
                                            borderRadius: BorderRadius.circular(
                                              4,
                                            ),
                                          ),
                                        ),
                                      ),
                                    );
                                  },
                                ),
                                if (isCompleted) ...[
                                  const SizedBox(height: 12),
                                  Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: CryptoScheme.success.withOpacity(
                                        0.1,
                                      ),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(
                                        color: CryptoScheme.success,
                                        width: 1,
                                      ),
                                    ),
                                    child: const Row(
                                      children: [
                                        Icon(
                                          Icons.check_circle,
                                          color: CryptoScheme.success,
                                          size: 20,
                                        ),
                                        SizedBox(width: 8),
                                        Text(
                                          'Activity completed!',
                                          style: TextStyle(
                                            color: CryptoScheme.success,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 14,
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

                        /*
                        // Processing Status Card
                        if (_processingStep != ProcessingStep.idle &&
                            _processingStep != ProcessingStep.error) ...[
                          const SizedBox(height: 24),
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
                                children: [
                                  const CircularProgressIndicator(color: CryptoScheme.primary),
                                  const SizedBox(height: 16),
                                  Text(
                                    _getProcessingMessage(),
                                    style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w500,
                                      color: CryptoScheme.text,
                                      letterSpacing: 0.2,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                        */
                        // Error Message
                        if (_processingStep == ProcessingStep.error) ...[
                          const SizedBox(height: 24),
                          Container(
                            decoration: BoxDecoration(
                              color: CryptoScheme.error.withOpacity(0.1),
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

                        // Show captured image if available
                        if (_selectedImage != null) ...[
                          const SizedBox(height: 24),
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
                                    'Uploaded Receipt',
                                    style: TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                      color: CryptoScheme.text,
                                      letterSpacing: -0.5,
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(8),
                                    child: Image.file(
                                      _selectedImage!,
                                      height: 200,
                                      width: double.infinity,
                                      fit: BoxFit.cover,
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
            if (_processingStep == ProcessingStep.completed)
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
                                color: CryptoScheme.border.withOpacity(0.3),
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: CryptoScheme.symColor,
                                  width: 2,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: CryptoScheme.symColor.withOpacity(
                                      0.5,
                                    ),
                                    blurRadius: 20,
                                    spreadRadius: 10,
                                  ),
                                ],
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
            color: CryptoScheme.border.withOpacity(0.3),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.1),
                blurRadius: 10,
                offset: const Offset(0, -2),
              ),
            ],
          ),
          child: SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton.icon(
              onPressed:
                  (_processingStep == ProcessingStep.idle ||
                      _processingStep == ProcessingStep.error)
                  ? _pickImage
                  : null,
              icon:
                  _processingStep == ProcessingStep.idle ||
                      _processingStep == ProcessingStep.error
                  ? const Icon(Icons.upload_file, size: 24)
                  : const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(
                          CryptoScheme.text,
                        ),
                      ),
                    ),
              label: Text(
                _getProcessingMessage(),
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: CryptoScheme.text,
                  letterSpacing: 0.5,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: _processingStep == ProcessingStep.completed
                    ? CryptoScheme.success
                    : CryptoScheme.merchantColor,
                foregroundColor: CryptoScheme.text,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 0,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
