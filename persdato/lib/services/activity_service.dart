import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/activity_model.dart';
import '../utils/constants.dart';

class ActivityService {
  // TODO: Update this with your actual backend URL
  static const String baseUrl = API_BASE_URL;

  static Future<List<Activity>> getActivities({
    required String walletAddress,
    String? type,
  }) async {
    try {
      final queryParams = {
        'walletAddress': walletAddress,
        if (type != null) 'type': type,
      };

      final uri = Uri.parse(
        '$baseUrl/api/activities',
      ).replace(queryParameters: queryParams);

      final response = await http.get(uri);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final activitiesList = data['activities'] as List<dynamic>;
        return activitiesList
            .map((json) => Activity.fromJson(json as Map<String, dynamic>))
            .toList();
      } else {
        throw Exception('Failed to load activities: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error fetching activities: $e');
    }
  }

  static Future<ActivityProgress> updateProgress({
    required String activityId,
    required String walletAddress,
    int increment = 1,
  }) async {
    try {
      final queryParams = {
        'walletAddress': walletAddress,
        'increment': increment.toString(),
      };

      final uri = Uri.parse(
        '$baseUrl/api/activities/$activityId/progress',
      ).replace(queryParameters: queryParams);

      final response = await http.post(uri);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return ActivityProgress.fromJson(data);
      } else {
        throw Exception('Failed to update progress: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error updating progress: $e');
    }
  }

  static Future<Map<String, dynamic>> claimReward({
    required String activityId,
    required String walletAddress,
  }) async {
    try {
      final queryParams = {'walletAddress': walletAddress};

      final uri = Uri.parse(
        '$baseUrl/api/activities/$activityId/claim',
      ).replace(queryParameters: queryParams);

      final response = await http.post(uri);

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        final error = jsonDecode(response.body) as Map<String, dynamic>;
        throw Exception(error['detail'] ?? 'Failed to claim reward');
      }
    } catch (e) {
      throw Exception('Error claiming reward: $e');
    }
  }
}
