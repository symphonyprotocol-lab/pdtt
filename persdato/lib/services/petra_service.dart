import 'dart:convert';
import 'dart:typed_data';
import 'dart:math';
import 'package:pointycastle/export.dart';
import 'package:convert/convert.dart';

class PetraService {
  static const String petraLinkBase = 'petra://api/v1';
  static const String dappLinkBase = 'persdato://api/v1';
  static const Map<String, String> appInfo = {
    'domain': 'https://persdato.app',
    'name': 'Persdato',
  };

  // Generate a key pair for encryption
  // Note: This is a simplified version. For production, use proper X25519 implementation
  static Map<String, Uint8List> generateKeyPair() {
    final random = Random.secure();
    final secretKey = Uint8List(32);
    final publicKey = Uint8List(32);

    // Generate random secret key
    for (int i = 0; i < 32; i++) {
      secretKey[i] = random.nextInt(256);
    }

    // For simplicity, derive public key from secret (in production, use proper X25519)
    // This is a placeholder - Petra will handle the actual key exchange
    final digest = SHA256Digest();
    publicKey.setAll(0, digest.process(secretKey).sublist(0, 32));

    return {'secretKey': secretKey, 'publicKey': publicKey};
  }

  // Convert bytes to hex string
  static String bytesToHex(Uint8List bytes) {
    return hex.encode(bytes);
  }

  // Convert hex string to bytes
  static Uint8List hexToBytes(String hexString) {
    return Uint8List.fromList(hex.decode(hexString));
  }

  // Base64 encode
  static String base64Encode(String data) {
    return base64.encode(utf8.encode(data));
  }

  // Base64 decode
  static String base64Decode(String data) {
    return utf8.decode(base64.decode(data));
  }

  // Generate shared secret
  // Note: This is a simplified version. In production, use proper X25519 key agreement
  static Uint8List generateSharedSecret(
    Uint8List privateKey,
    Uint8List publicKey,
  ) {
    // Combine private and public keys to derive shared secret
    // In production, this should use proper X25519 key agreement
    final combined = Uint8List(privateKey.length + publicKey.length);
    combined.setRange(0, privateKey.length, privateKey);
    combined.setRange(privateKey.length, combined.length, publicKey);

    // Use SHA256 to derive a shared secret
    final digest = SHA256Digest();
    return digest.process(combined);
  }

  // Encrypt using shared secret (simplified - using AES for encryption)
  static String encrypt(String plaintext, Uint8List sharedSecret) {
    try {
      // Derive a 32-byte key from shared secret
      final key = sharedSecret.length >= 32
          ? sharedSecret.sublist(0, 32)
          : Uint8List.fromList([
              ...sharedSecret,
              ...List.filled(32 - sharedSecret.length, 0),
            ]);

      // Generate random IV
      final random = Random.secure();
      final iv = Uint8List(16);
      for (int i = 0; i < 16; i++) {
        iv[i] = random.nextInt(256);
      }

      final cipher = PaddedBlockCipher('AES/CBC/PKCS7');
      final params = PaddedBlockCipherParameters(
        ParametersWithIV(KeyParameter(key), iv),
        null,
      );
      cipher.init(true, params);

      final encrypted = cipher.process(utf8.encode(plaintext));
      // Prepend IV to encrypted data
      final result = Uint8List(iv.length + encrypted.length);
      result.setRange(0, iv.length, iv);
      result.setRange(iv.length, result.length, encrypted);
      return bytesToHex(result);
    } catch (e) {
      throw Exception('Encryption failed: $e');
    }
  }

  // Decrypt using shared secret
  static String decrypt(String ciphertext, Uint8List sharedSecret) {
    try {
      final key = sharedSecret.length >= 32
          ? sharedSecret.sublist(0, 32)
          : Uint8List.fromList([
              ...sharedSecret,
              ...List.filled(32 - sharedSecret.length, 0),
            ]);

      final encrypted = hexToBytes(ciphertext);
      if (encrypted.length < 16) {
        throw Exception('Invalid ciphertext');
      }

      // Extract IV and encrypted data
      final iv = encrypted.sublist(0, 16);
      final data = encrypted.sublist(16);

      final cipher = PaddedBlockCipher('AES/CBC/PKCS7');
      final params = PaddedBlockCipherParameters(
        ParametersWithIV(KeyParameter(key), iv),
        null,
      );
      cipher.init(false, params);

      final decrypted = cipher.process(data);
      return utf8.decode(decrypted);
    } catch (e) {
      throw Exception('Decryption failed: $e');
    }
  }

  // Create connect deep link
  static String createConnectLink(String publicKeyHex, String redirectLink) {
    final data = {
      'appInfo': appInfo,
      'redirectLink': redirectLink,
      'dappEncryptionPublicKey': publicKeyHex,
    };
    final encodedData = base64Encode(jsonEncode(data));
    return '$petraLinkBase/connect?data=$encodedData';
  }

  // Create disconnect deep link
  static String createDisconnectLink(String publicKeyHex, String redirectLink) {
    final data = {
      'appInfo': appInfo,
      'redirectLink': redirectLink,
      'dappEncryptionPublicKey': publicKeyHex,
    };
    final encodedData = base64Encode(jsonEncode(data));
    return '$petraLinkBase/disconnect?data=$encodedData';
  }

  // Parse Petra response
  static Map<String, String>? parseResponse(String url) {
    try {
      final uri = Uri.parse(url);

      // Check if it's our deep link scheme
      if (uri.scheme != 'persdato') {
        return null;
      }

      // Allow both 'api' host and empty host (persdato://api/v1/... or persdato:///api/v1/...)
      if (uri.host.isNotEmpty && uri.host != 'api') {
        return null;
      }

      final response = uri.queryParameters['response'];
      final data = uri.queryParameters['data'];

      if (response == null) {
        return null;
      }

      return {'response': response, 'data': data ?? '', 'path': uri.path};
    } catch (e) {
      return null;
    }
  }
}
