class Activity {
  final String id;
  final String type; // 'daily', 'merchant', 'model_developer'
  final String title;
  final String description;
  final double rewardTokens;
  final int targetCount;
  final Map<String, dynamic>? activityData;
  final String? merchantWalletAddress;
  final String? campaignId;
  final String? modelId;
  final String? modelDeveloperWalletAddress;
  final bool isActive;
  final DateTime? startDate;
  final DateTime? endDate;
  final DateTime createdAt;
  final ActivityProgress? progress;

  Activity({
    required this.id,
    required this.type,
    required this.title,
    required this.description,
    required this.rewardTokens,
    required this.targetCount,
    this.activityData,
    this.merchantWalletAddress,
    this.campaignId,
    this.modelId,
    this.modelDeveloperWalletAddress,
    required this.isActive,
    this.startDate,
    this.endDate,
    required this.createdAt,
    this.progress,
  });

  factory Activity.fromJson(Map<String, dynamic> json) {
    return Activity(
      id: json['id'] as String,
      type: json['type'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      rewardTokens: (json['rewardTokens'] as num).toDouble(),
      targetCount: json['targetCount'] as int,
      activityData: json['activityData'] as Map<String, dynamic>?,
      merchantWalletAddress: json['merchantWalletAddress'] as String?,
      campaignId: json['campaignId'] as String?,
      modelId: json['modelId'] as String?,
      modelDeveloperWalletAddress:
          json['modelDeveloperWalletAddress'] as String?,
      isActive: json['isActive'] as bool,
      startDate: json['startDate'] != null
          ? DateTime.parse(json['startDate'] as String)
          : null,
      endDate: json['endDate'] != null
          ? DateTime.parse(json['endDate'] as String)
          : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
      progress: json['progress'] != null
          ? ActivityProgress.fromJson(json['progress'] as Map<String, dynamic>)
          : null,
    );
  }

  String get typeLabel {
    switch (type) {
      case 'daily':
        return 'Daily Activity';
      case 'merchant':
        return 'Merchant Activity';
      case 'model_developer':
        return 'Model Developer Activity';
      default:
        return 'Activity';
    }
  }

  double get progressPercentage {
    if (progress == null) return 0.0;
    return (progress!.currentCount / targetCount).clamp(0.0, 1.0);
  }

  bool get canClaim {
    return progress != null &&
        progress!.isCompleted &&
        !progress!.rewardClaimed;
  }
}

class ActivityProgress {
  final String id;
  final String walletAddress;
  final String activityId;
  final int currentCount;
  final int targetCount;
  final bool isCompleted;
  final bool rewardClaimed;
  final DateTime? completedAt;
  final DateTime createdAt;

  ActivityProgress({
    required this.id,
    required this.walletAddress,
    required this.activityId,
    required this.currentCount,
    required this.targetCount,
    required this.isCompleted,
    required this.rewardClaimed,
    this.completedAt,
    required this.createdAt,
  });

  factory ActivityProgress.fromJson(Map<String, dynamic> json) {
    return ActivityProgress(
      id: json['id'] as String,
      walletAddress: json['walletAddress'] as String,
      activityId: json['activityId'] as String,
      currentCount: json['currentCount'] as int,
      targetCount: json['targetCount'] as int,
      isCompleted: json['isCompleted'] as bool,
      rewardClaimed: json['rewardClaimed'] as bool,
      completedAt: json['completedAt'] != null
          ? DateTime.parse(json['completedAt'] as String)
          : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}
