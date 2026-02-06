import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'dart:typed_data';
import 'package:convert/convert.dart';
import 'package:pointycastle/digests/sha3.dart';

class BalanceService {
  // TODO: Update with your Aptos network URL (testnet/mainnet)
  static const String aptosApiUrl = 'https://fullnode.testnet.aptoslabs.com/v1';

  // Module address for SYM token (from sym_token.move)
  // This should match the address where sym_token module is deployed
  static const String moduleAddress =
      '0x6d0747e1d4281cb3e0894949c7410bb7351dfe831c3b294d53245ad94dfc0dd3'; // Update with actual deployed address

  /// Get APTOS balance for an address
  static Future<double> getAptosBalance(String address) async {
    try {
      // Ensure address has 0x prefix
      final cleanAddress = address.startsWith('0x') ? address : '0x$address';

      // Method 1: Try using the view function (more reliable)
      try {
        final viewUrl = Uri.parse('$aptosApiUrl/view');
        final viewPayload = {
          'function': '0x1::coin::balance',
          'type_arguments': ['0x1::aptos_coin::AptosCoin'],
          'arguments': [cleanAddress],
        };

        final viewResponse = await http.post(
          viewUrl,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(viewPayload),
        );

        if (viewResponse.statusCode == 200) {
          final viewData = jsonDecode(viewResponse.body) as List<dynamic>;
          if (viewData.isNotEmpty) {
            final balance = viewData[0];
            if (balance != null) {
              // APTOS has 8 decimals
              final balanceStr = balance.toString();
              final balanceValue = int.parse(balanceStr) / 100000000;
              debugPrint('APTOS balance from view function: $balanceValue');
              return balanceValue;
            }
          }
        }
      } catch (viewError) {
        debugPrint(
          'View function failed, trying resource endpoint: $viewError',
        );
      }

      // Method 2: Fallback to resource endpoint
      // URL encode the resource type properly
      final resourceType = Uri.encodeComponent(
        '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>',
      );
      final url = Uri.parse(
        '$aptosApiUrl/accounts/$cleanAddress/resource/$resourceType',
      );

      final response = await http.get(url);
      debugPrint(
        'APTOS balance resource response status: ${response.statusCode}',
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        debugPrint('APTOS balance resource data: $data');
        final coin = data['data'] as Map<String, dynamic>?;
        if (coin != null) {
          final balance = coin['coin'] as Map<String, dynamic>?;
          if (balance != null) {
            final value = balance['value'] as String?;
            if (value != null) {
              // APTOS has 8 decimals
              final balanceValue = int.parse(value) / 100000000;
              debugPrint('APTOS balance from resource: $balanceValue');
              return balanceValue;
            }
          }
        }
      } else if (response.statusCode == 404) {
        // Resource not found means account has 0 balance or account doesn't exist yet
        // This is normal for new accounts - return 0.0
        debugPrint('APTOS CoinStore resource not found (404) - balance is 0');
        return 0.0;
      } else {
        debugPrint(
          'Unexpected status code when fetching APTOS balance: ${response.statusCode}',
        );
        debugPrint('Response: ${response.body}');
      }
      return 0.0;
    } catch (e) {
      debugPrint('Error fetching APTOS balance: $e');
      return 0.0;
    }
  }

  /// Calculate SYM token metadata address
  /// Based on: sha3_256(creator_address + "SYM" + 0xFE)
  static String calculateSymMetadataAddress(String creatorAddress) {
    try {
      // Remove 0x prefix if present
      String addr = creatorAddress.startsWith('0x')
          ? creatorAddress.substring(2)
          : creatorAddress;

      // Convert address to bytes
      final addrBytes = hex.decode(addr);

      // Convert "SYM" to bytes
      final seedBytes = utf8.encode('sym_token');

      // Add 0xFE byte
      final typeByte = Uint8List.fromList([0xFE]);

      // Combine: creator_addr + "SYM" + 0xFE
      final combined = Uint8List(
        addrBytes.length + seedBytes.length + typeByte.length,
      );
      combined.setRange(0, addrBytes.length, addrBytes);
      combined.setRange(
        addrBytes.length,
        addrBytes.length + seedBytes.length,
        seedBytes,
      );
      combined.setRange(
        addrBytes.length + seedBytes.length,
        combined.length,
        typeByte,
      );

      // Hash with SHA3-256
      final digest = SHA3Digest(256);
      final hash = digest.process(combined);

      // Convert to hex address
      return '0x${hex.encode(hash)}';
    } catch (e) {
      debugPrint('Error calculating SYM metadata address: $e');
      return '';
    }
  }

  /// Get SYM token balance for an address
  static Future<double> getSymBalance(String address) async {
    try {
      // Ensure address has 0x prefix
      final cleanAddress = address.startsWith('0x') ? address : '0x$address';

      // Calculate metadata address
      final metadataAddress =
          '0x3004a11047da296a5ecbea8c3b8cc1f14f2dee46a5be7a5d2f55e452743b6e3d'; //calculateSymMetadataAddress(moduleAddress);
      if (metadataAddress.isEmpty) {
        return 0.0;
      }

      // Call view function: 0x1::primary_fungible_store::balance
      final url = Uri.parse('$aptosApiUrl/view');
      final payload = {
        'function': '0x1::primary_fungible_store::balance',
        'type_arguments': ["0x1::object::ObjectCore"],
        'arguments': [cleanAddress, metadataAddress],
      };

      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(payload),
      );

      debugPrint('SYM balance view response status: ${response.statusCode}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as List<dynamic>;
        debugPrint('SYM balance view response data: $data');
        if (data.isNotEmpty) {
          final balance = data[0];
          if (balance != null) {
            // SYM token has 8 decimals
            final balanceStr = balance.toString();
            final balanceValue = int.parse(balanceStr) / 100000000;
            debugPrint('SYM balance from view function: $balanceValue');
            return balanceValue;
          }
        }
      } else if (response.statusCode == 400 || response.statusCode == 404) {
        // Account doesn't have SYM tokens or metadata doesn't exist
        debugPrint(
          'SYM balance not found (${response.statusCode}) - balance is 0',
        );
        return 0.0;
      } else {
        debugPrint(
          'Unexpected status code when fetching SYM balance: ${response.statusCode}',
        );
        debugPrint('Response: ${response.body}');
      }
      return 0.0;
    } catch (e) {
      debugPrint('Error fetching SYM balance: $e');
      return 0.0;
    }
  }
}
