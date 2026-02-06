import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../utils/constants.dart';

class ReceiptService {
  static const String baseUrl = API_BASE_URL;

  /// Process receipt image using OCR
  static Future<Map<String, dynamic>> processReceiptOCR(File imageFile) async {
    try {
      final uri = Uri.parse('$baseUrl/api/receipt/ocr');

      // Determine content type from file extension
      // Default to JPEG as that's what cameras typically produce
      String contentType = 'image/jpeg';
      final pathParts = imageFile.path.split('.');
      if (pathParts.length > 1) {
        final extension = pathParts.last.toLowerCase();
        switch (extension) {
          case 'png':
            contentType = 'image/png';
            break;
          case 'jpg':
          case 'jpeg':
            contentType = 'image/jpeg';
            break;
          case 'webp':
            contentType = 'image/webp';
            break;
          case 'gif':
            contentType = 'image/gif';
            break;
          default:
            // If extension is unknown, default to JPEG (most common for cameras)
            contentType = 'image/jpeg';
        }
      }
      // If no extension, default to JPEG (camera images are usually JPEG)

      final request = http.MultipartRequest('POST', uri);
      request.files.add(
        await http.MultipartFile.fromPath(
          'file',
          imageFile.path,
          filename: imageFile.path.split('/').last,
          contentType: http.MediaType.parse(contentType),
        ),
      );

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        final error = jsonDecode(response.body) as Map<String, dynamic>;
        throw Exception(error['detail'] ?? 'Failed to process receipt OCR');
      }
    } catch (e) {
      throw Exception('Error processing receipt OCR: $e');
    }
  }

  /// Save receipt to database
  static Future<Map<String, dynamic>> saveReceipt({
    required String walletAddress,
    required Map<String, dynamic> receiptData,
    String? imageUrl,
  }) async {
    try {
      final uri = Uri.parse('$baseUrl/api/receipts/save');

      final response = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'walletAddress': walletAddress,
          'receiptData': receiptData,
          'imageUrl': imageUrl,
        }),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        final error = jsonDecode(response.body) as Map<String, dynamic>;
        throw Exception(error['detail'] ?? 'Failed to save receipt');
      }
    } catch (e) {
      throw Exception('Error saving receipt: $e');
    }
  }
}
