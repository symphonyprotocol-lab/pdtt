class Receipt {
  final String id;
  final String walletAddress;
  final String sourceImageUrl;
  final Map<String, dynamic> receiptData;
  final DateTime createdAt;
  final double? totalSymEarned; // Total SYM earned from this receipt

  Receipt({
    required this.id,
    required this.walletAddress,
    required this.sourceImageUrl,
    required this.receiptData,
    required this.createdAt,
    this.totalSymEarned,
  });

  factory Receipt.fromJson(Map<String, dynamic> json) {
    return Receipt(
      id: json['id'] as String,
      walletAddress: json['walletAddress'] as String? ?? json['wallet_address'] as String,
      sourceImageUrl: json['sourceImageUrl'] as String? ?? json['source_image_url'] as String,
      receiptData: json['receiptData'] as Map<String, dynamic>? ?? json['receipt_data'] as Map<String, dynamic>,
      createdAt: DateTime.parse(json['createdAt'] as String? ?? json['created_at'] as String),
      totalSymEarned: json['totalSymEarned'] as double?,
    );
  }

  // Helper getters for receipt data
  String? get storeName {
    return receiptData['store']?['name'] as String? ??
        receiptData['store']?['company'] as String?;
  }

  String? get receiptDate {
    return receiptData['invoice']?['date'] as String?;
  }

  String? get receiptTime {
    return receiptData['invoice']?['time'] as String?;
  }

  double? get totalAmount {
    return (receiptData['invoice']?['summary']?['total'] as num?)?.toDouble();
  }

  String get currency {
    return receiptData['meta']?['currency'] as String? ?? 'MYR';
  }

  List<dynamic> get items {
    return receiptData['invoice']?['items'] as List<dynamic>? ?? [];
  }

  Map<String, dynamic>? get summary {
    return receiptData['invoice']?['summary'] as Map<String, dynamic>?;
  }
}

class SymEarningHistory {
  final String id;
  final String receiptId;
  final String activityId;
  final String activityType;
  final String activityTitle;
  final double amount;
  final DateTime earnedAt;
  final String? transactionHash;

  SymEarningHistory({
    required this.id,
    required this.receiptId,
    required this.activityId,
    required this.activityType,
    required this.activityTitle,
    required this.amount,
    required this.earnedAt,
    this.transactionHash,
  });

  factory SymEarningHistory.fromJson(Map<String, dynamic> json) {
    return SymEarningHistory(
      id: json['id'] as String,
      receiptId: json['receiptId'] as String? ?? json['receipt_id'] as String,
      activityId: json['activityId'] as String? ?? json['activity_id'] as String,
      activityType: json['activityType'] as String? ?? json['activity_type'] as String,
      activityTitle: json['activityTitle'] as String? ?? json['activity_title'] as String,
      amount: (json['amount'] as num).toDouble(),
      earnedAt: DateTime.parse(json['earnedAt'] as String? ?? json['earned_at'] as String),
      transactionHash: json['transactionHash'] as String? ?? json['transaction_hash'] as String?,
    );
  }
}

