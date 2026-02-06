import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/receipt_model.dart';
import '../utils/constants.dart';

class ReceiptCollectionService {
  static const String baseUrl = API_BASE_URL;

  /// Get all receipts for a wallet address
  static Future<List<Receipt>> getReceipts(String walletAddress) async {
    try {
      final uri = Uri.parse('$baseUrl/api/receipts/$walletAddress');

      final response = await http.get(uri);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final receiptsList = data['receipts'] as List<dynamic>;
        
        // For now, we'll calculate SYM earned based on receipt data
        // In the future, this should come from a dedicated API endpoint
        return receiptsList.map((json) {
          final receipt = Receipt.fromJson(json as Map<String, dynamic>);
          // Calculate SYM earned based on receipt quality (similar to daily scan)
          final symEarned = _calculateSymEarned(receipt.receiptData);
          return Receipt(
            id: receipt.id,
            walletAddress: receipt.walletAddress,
            sourceImageUrl: receipt.sourceImageUrl,
            receiptData: receipt.receiptData,
            createdAt: receipt.createdAt,
            totalSymEarned: symEarned,
          );
        }).toList();
      } else {
        throw Exception('Failed to load receipts: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error fetching receipts: $e');
    }
  }

  /// Get SYM earning history for a specific receipt
  /// Note: This is a placeholder. In production, this should come from a backend API
  /// that tracks SYM transfers linked to receipts
  static Future<List<SymEarningHistory>> getSymEarningHistory(String receiptId) async {
    try {
      // TODO: Implement backend API endpoint for SYM earning history
      // For now, return empty list or mock data
      // The backend should track which receipts were used for which activities
      // and how much SYM was earned from each
      
      // Placeholder: This would be replaced with actual API call
      // final uri = Uri.parse('$baseUrl/api/receipts/$receiptId/sym-history');
      // final response = await http.get(uri);
      // ...
      
      return [];
    } catch (e) {
      throw Exception('Error fetching SYM earning history: $e');
    }
  }

  /// Calculate SYM earned based on receipt data quality
  /// This matches the logic from daily_scan_detail_page.dart
  static double _calculateSymEarned(Map<String, dynamic> receiptData) {
    int qualityScore = 0;

    // Check store information
    if (receiptData['store'] != null) {
      qualityScore += 1;
    }

    // Check invoice information
    if (receiptData['invoice'] != null) {
      qualityScore += 1;
      final invoice = receiptData['invoice'];
      if (invoice['items'] != null && (invoice['items'] as List).isNotEmpty) {
        qualityScore += 1;
      }
      if (invoice['summary'] != null) {
        qualityScore += 1;
      }
    }

    // Map quality score to reward (1-5 SYM)
    // Score 0-1: 1 SYM, 2: 2 SYM, 3: 3 SYM, 4: 4 SYM, 5+: 5 SYM
    return (qualityScore < 2 ? 1.0 : qualityScore > 5 ? 5.0 : qualityScore.toDouble());
  }
}

