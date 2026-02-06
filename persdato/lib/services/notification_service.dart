import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/notification_model.dart' as models;
import '../utils/constants.dart';

class NotificationService {
  static const String baseUrl = API_BASE_URL;

  static Future<List<models.Notification>> getNotifications({
    required String walletAddress,
  }) async {
    try {
      final uri = Uri.parse('$baseUrl/api/notifications/$walletAddress');

      final response = await http.get(uri);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final notificationsList = data['notifications'] as List<dynamic>;
        return notificationsList
            .map(
              (json) =>
                  models.Notification.fromJson(json as Map<String, dynamic>),
            )
            .toList();
      } else {
        throw Exception('Failed to load notifications: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error fetching notifications: $e');
    }
  }

  static Future<models.Notification> markAsDelivered({
    required String notificationId,
  }) async {
    try {
      final uri = Uri.parse(
        '$baseUrl/api/notifications/$notificationId/deliver',
      );

      final response = await http.put(uri);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return models.Notification.fromJson(data);
      } else {
        throw Exception(
          'Failed to mark notification as delivered: ${response.statusCode}',
        );
      }
    } catch (e) {
      throw Exception('Error marking notification as delivered: $e');
    }
  }

  static Future<models.Notification> markAsRead({
    required String notificationId,
  }) async {
    try {
      final uri = Uri.parse('$baseUrl/api/notifications/$notificationId/read');

      final response = await http.put(uri);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return models.Notification.fromJson(data);
      } else {
        throw Exception(
          'Failed to mark notification as read: ${response.statusCode}',
        );
      }
    } catch (e) {
      throw Exception('Error marking notification as read: $e');
    }
  }
}
