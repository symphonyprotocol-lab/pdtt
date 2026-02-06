class Notification {
  final String id;
  final String campaignId;
  final String targetUserAddress;
  final String title;
  final String content;
  final Map<String, dynamic> voucherDetail;
  final bool delivered;
  final bool read;
  final bool userAccepted;
  final DateTime createdAt;
  final DateTime? deliveredAt;
  final DateTime? readAt;
  final DateTime? acceptedAt;

  Notification({
    required this.id,
    required this.campaignId,
    required this.targetUserAddress,
    required this.title,
    required this.content,
    required this.voucherDetail,
    required this.delivered,
    required this.read,
    required this.userAccepted,
    required this.createdAt,
    this.deliveredAt,
    this.readAt,
    this.acceptedAt,
  });

  factory Notification.fromJson(Map<String, dynamic> json) {
    return Notification(
      id: json['id'] as String,
      campaignId:
          json['campaignId'] as String? ?? json['campaign_id'] as String,
      targetUserAddress:
          json['targetUserAddress'] as String? ??
          json['target_user_address'] as String,
      title: json['title'] as String,
      content: json['content'] as String,
      voucherDetail:
          json['voucherDetail'] as Map<String, dynamic>? ??
          json['voucher_detail'] as Map<String, dynamic>? ??
          {},
      delivered: json['delivered'] as bool? ?? false,
      read: json['read'] as bool? ?? false,
      userAccepted:
          json['userAccepted'] as bool? ??
          json['user_accepted'] as bool? ??
          false,
      createdAt: DateTime.parse(
        json['createdAt'] as String? ?? json['created_at'] as String,
      ),
      deliveredAt: json['deliveredAt'] != null || json['delivered_at'] != null
          ? DateTime.parse(
              (json['deliveredAt'] ?? json['delivered_at']) as String,
            )
          : null,
      readAt: json['readAt'] != null || json['read_at'] != null
          ? DateTime.parse((json['readAt'] ?? json['read_at']) as String)
          : null,
      acceptedAt: json['acceptedAt'] != null || json['accepted_at'] != null
          ? DateTime.parse(
              (json['acceptedAt'] ?? json['accepted_at']) as String,
            )
          : null,
    );
  }

  String get timeAgo {
    final now = DateTime.now();
    final difference = now.difference(createdAt);

    if (difference.inDays > 0) {
      return '${difference.inDays} day${difference.inDays > 1 ? 's' : ''} ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours} hour${difference.inHours > 1 ? 's' : ''} ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes} minute${difference.inMinutes > 1 ? 's' : ''} ago';
    } else {
      return 'Just now';
    }
  }
}
