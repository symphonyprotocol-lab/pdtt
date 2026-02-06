import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/petra_service.dart';
import '../services/balance_service.dart';

class WalletModel extends ChangeNotifier {
  String _address = '';
  bool _isConnected = false;
  bool _isConnecting = false;
  String? _error;

  Uint8List? _secretKey;
  Uint8List? _publicKey;
  Uint8List? _sharedSecretKey; // Stored for future transaction signing

  double _aptosBalance = 0.0;
  double _symBalance = 0.0;
  bool _isLoadingBalances = false;

  String get address => _address;
  bool get isConnected => _isConnected;
  bool get isConnecting => _isConnecting;
  String? get error => _error;
  double get aptosBalance => _aptosBalance;
  double get symBalance => _symBalance;
  bool get isLoadingBalances => _isLoadingBalances;

  Future<void> connect() async {
    try {
      _isConnecting = true;
      _error = null;
      notifyListeners();

      debugPrint('Starting Petra connection...');

      // Generate key pair
      final keyPair = PetraService.generateKeyPair();
      _secretKey = keyPair['secretKey']!;
      _publicKey = keyPair['publicKey']!;
      debugPrint('Generated key pair');

      // Create connect deep link
      final publicKeyHex = '0x${PetraService.bytesToHex(_publicKey!)}';
      final redirectLink = '${PetraService.dappLinkBase}/connect';
      final connectUrl = PetraService.createConnectLink(
        publicKeyHex,
        redirectLink,
      );

      debugPrint('Connect URL: $connectUrl');

      // Open Petra wallet
      final uri = Uri.parse(connectUrl);
      final launched = await launchUrl(
        uri,
        mode: LaunchMode.externalApplication,
      );
      if (!launched) {
        throw Exception('Failed to open Petra wallet');
      }

      debugPrint('Petra wallet opened, waiting for response...');

      // Set a timeout - if no response in 60 seconds, show error
      Future.delayed(const Duration(seconds: 60), () {
        if (_isConnecting && !_isConnected) {
          debugPrint('Connection timeout - no response from Petra');
          _error = 'Connection timeout. Please try again.';
          _isConnecting = false;
          notifyListeners();
        }
      });

      // The response will be handled by the deep link handler
      // We'll wait for the response in handleDeepLink
    } catch (e) {
      debugPrint('Error in connect: $e');
      _error = 'Connection failed: ${e.toString()}';
      _isConnected = false;
      _address = '';
      _isConnecting = false;
      notifyListeners();
    }
  }

  void handleConnectResponse(String? response, String? data) {
    debugPrint(
      'handleConnectResponse called: response=$response, hasData=${data != null && data.isNotEmpty}',
    );

    try {
      if (response == 'rejected') {
        debugPrint('Connection rejected by user');
        _error = 'Connection was rejected by user';
        _isConnected = false;
        _address = '';
        _isConnecting = false;
        notifyListeners();
        return;
      }

      if (response == 'approved') {
        debugPrint('Connection approved, processing...');

        if (data == null || data.isEmpty) {
          debugPrint('No data in response');
          _error = 'No data received from Petra';
          _isConnected = false;
          _address = '';
          _isConnecting = false;
          notifyListeners();
          return;
        }

        if (_secretKey == null) {
          debugPrint('Secret key is null');
          _error = 'Secret key not found. Please try connecting again.';
          _isConnected = false;
          _address = '';
          _isConnecting = false;
          notifyListeners();
          return;
        }

        try {
          // Parse the response data
          final decodedData = jsonDecode(PetraService.base64Decode(data));
          debugPrint('Decoded data keys: ${decodedData.keys}');

          final petraPublicEncryptedKey =
              decodedData['petraPublicEncryptedKey'] as String?;

          if (petraPublicEncryptedKey == null) {
            debugPrint('petraPublicEncryptedKey not found in response');
            _error = 'Invalid response from Petra: missing public key';
            _isConnected = false;
            _address = '';
            _isConnecting = false;
            notifyListeners();
            return;
          }

          // Convert hex string to bytes (remove 0x prefix if present)
          final petraPublicKeyHex = petraPublicEncryptedKey.startsWith('0x')
              ? petraPublicEncryptedKey.substring(2)
              : petraPublicEncryptedKey;
          final petraPublicKey = PetraService.hexToBytes(petraPublicKeyHex);

          // Generate shared secret
          _sharedSecretKey = PetraService.generateSharedSecret(
            _secretKey!,
            petraPublicKey,
          );

          // Extract address from response if available
          // Note: Petra may include address in the response
          if (decodedData.containsKey('address')) {
            _address = decodedData['address'] as String;
          } else {
            // For now, use a placeholder - in production, Petra should provide this
            _address =
                '0x${PetraService.bytesToHex(_publicKey!.sublist(0, 16))}...';
          }

          debugPrint('Connection successful, address: $_address');
          _isConnected = true;
          _error = null;
          _isConnecting = false;
          notifyListeners();
          
          // Fetch balances after successful connection
          _loadBalances();
        } catch (e, stackTrace) {
          debugPrint('Error parsing response data: $e');
          debugPrint('Stack trace: $stackTrace');
          _error = 'Failed to parse response: ${e.toString()}';
          _isConnected = false;
          _address = '';
          _isConnecting = false;
          notifyListeners();
        }
      } else {
        debugPrint('Unknown response type: $response');
        _error = 'Unknown response from Petra: $response';
        _isConnected = false;
        _address = '';
        _isConnecting = false;
        notifyListeners();
      }
    } catch (e, stackTrace) {
      debugPrint('Error in handleConnectResponse: $e');
      debugPrint('Stack trace: $stackTrace');
      _error = 'Failed to process connection response: ${e.toString()}';
      _isConnected = false;
      _address = '';
      _isConnecting = false;
      notifyListeners();
    }
  }

  Future<void> disconnect() async {
    try {
      if (_publicKey == null) {
        _address = '';
        _isConnected = false;
        _error = null;
        notifyListeners();
        return;
      }

      // Create disconnect deep link
      final publicKeyHex = '0x${PetraService.bytesToHex(_publicKey!)}';
      final redirectLink = '${PetraService.dappLinkBase}/disconnect';
      final disconnectUrl = PetraService.createDisconnectLink(
        publicKeyHex,
        redirectLink,
      );

      // Open Petra wallet for disconnect
      final uri = Uri.parse(disconnectUrl);
      await launchUrl(uri, mode: LaunchMode.externalApplication);

      // Clear local state
      _address = '';
      _isConnected = false;
      _error = null;
      _secretKey = null;
      _publicKey = null;
      _sharedSecretKey = null;
      _aptosBalance = 0.0;
      _symBalance = 0.0;
      notifyListeners();
    } catch (e) {
      _error = 'Disconnect failed: ${e.toString()}';
      notifyListeners();
    }
  }

  void setAddress(String address) {
    _address = address;
    _isConnected = address.isNotEmpty;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  /// Load APTOS and SYM token balances
  Future<void> _loadBalances() async {
    if (_address.isEmpty) return;

    _isLoadingBalances = true;
    notifyListeners();

    try {
      final aptosBalance = await BalanceService.getAptosBalance(_address);
      final symBalance = await BalanceService.getSymBalance(_address);

      _aptosBalance = aptosBalance;
      _symBalance = symBalance;
    } catch (e) {
      debugPrint('Error loading balances: $e');
      // Don't set error, just keep balances at 0
    } finally {
      _isLoadingBalances = false;
      notifyListeners();
    }
  }

  /// Refresh balances manually
  Future<void> refreshBalances() async {
    await _loadBalances();
  }
}
