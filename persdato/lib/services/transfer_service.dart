import 'dart:convert';
import 'package:http/http.dart' as http;
import '../utils/constants.dart';

class TransferService {
  static const String baseUrl = API_BASE_URL;

  /// Transfer SYM tokens to a wallet address
  static Future<Map<String, dynamic>> transferSymToken({
    required String toAddress,
    required double amount,
  }) async {
    try {
      final uri = Uri.parse('$baseUrl/api/transfer-sym-token');

      final response = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'to_address': toAddress, 'amount': amount}),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        // Try to parse error message
        try {
          final error = jsonDecode(response.body) as Map<String, dynamic>;
          final detail =
              error['detail'] ??
              error['message'] ??
              'Failed to transfer SYM tokens';
          throw Exception('$detail (Status: ${response.statusCode})');
        } catch (e) {
          // If JSON parsing fails, use the raw response body
          throw Exception(
            'Failed to transfer SYM tokens: ${response.body} (Status: ${response.statusCode})',
          );
        }
      }
    } catch (e) {
      throw Exception('Error transferring SYM tokens: $e');
    }
  }
}
