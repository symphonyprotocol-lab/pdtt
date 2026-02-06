import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:app_links/app_links.dart';
import 'pages/activity_page.dart';
import 'pages/collection_page.dart';
import 'pages/message_page.dart';
import 'pages/wallet_page.dart';
import 'widgets/bottom_nav_bar.dart';
import 'providers/wallet_provider.dart';
import 'models/wallet_model.dart';
import 'services/petra_service.dart';
import 'theme/crypto_theme.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  final _appLinks = AppLinks();
  StreamSubscription<Uri>? _linkSubscription;
  final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

  @override
  void initState() {
    super.initState();
    // Delay initialization to ensure plugin is ready
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initDeepLinks();
    });
  }

  Future<void> _initDeepLinks() async {
    // Wait a bit to ensure plugin is registered
    await Future.delayed(const Duration(milliseconds: 300));

    try {
      // Handle initial link if app was opened via deep link
      try {
        final uri = await _appLinks.getInitialLink();
        if (uri != null) {
          _handleDeepLink(uri);
        }
      } catch (e) {
        debugPrint('Error getting initial link (plugin may not be ready): $e');
        // This is okay - plugin might not be registered yet
        // The stream listener will catch links when app is running
      }

      // Listen for deep links while app is running
      try {
        _linkSubscription = _appLinks.uriLinkStream.listen(
          (uri) => _handleDeepLink(uri),
          onError: (err) {
            debugPrint('Deep link stream error: $err');
          },
        );
      } catch (e) {
        debugPrint('Error setting up deep link stream: $e');
      }
    } catch (e) {
      debugPrint('Error initializing deep links: $e');
    }
  }

  void _handleDeepLink(Uri uri) {
    debugPrint('=== Received deep link ===');
    debugPrint('Full URI: $uri');
    debugPrint('Scheme: ${uri.scheme}');
    debugPrint('Host: ${uri.host}');
    debugPrint('Path: ${uri.path}');
    debugPrint('Query: ${uri.query}');
    debugPrint('Query parameters: ${uri.queryParameters}');

    final response = PetraService.parseResponse(uri.toString());
    if (response == null) {
      debugPrint('Failed to parse response from URI');
      return;
    }

    debugPrint('Parsed response: $response');

    // Get wallet model from the navigator context
    final context = navigatorKey.currentContext;
    if (context == null) {
      debugPrint('Context not available, retrying...');
      // If context is not available yet, wait a bit and try again
      Future.delayed(const Duration(milliseconds: 500), () {
        _handleDeepLink(uri);
      });
      return;
    }

    final walletModel = Provider.of<WalletModel>(context, listen: false);

    final path = response['path'] ?? '';
    final responseType = response['response'] ?? '';
    final data = response['data'];

    debugPrint(
      'Path: $path, Response: $responseType, Has data: ${data != null && data.isNotEmpty}',
    );

    // Handle both /api/v1/connect and /v1/connect paths
    if (path == '/api/v1/connect' ||
        path == '/v1/connect' ||
        path.contains('connect')) {
      debugPrint('Handling connect response...');
      walletModel.handleConnectResponse(responseType, data);
    } else if (path == '/api/v1/disconnect' ||
        path == '/v1/disconnect' ||
        path.contains('disconnect')) {
      debugPrint('Handling disconnect response...');
      walletModel.disconnect();
    } else {
      debugPrint('Unknown path: $path');
    }
  }

  @override
  void dispose() {
    _linkSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: WalletProvider.providers,
      child: MaterialApp(
        navigatorKey: navigatorKey,
        title: 'Persdato',
        theme: CryptoTheme.darkTheme,
        home: const MainScreen(),
        debugShowCheckedModeBanner: false,
      ),
    );
  }
}

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _currentIndex = 0;

  final List<Widget> _pages = const [
    ActivityPage(),
    CollectionPage(),
    MessagePage(),
    WalletPage(),
  ];

  void _onTabTapped(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _currentIndex, children: _pages),
      bottomNavigationBar: BottomNavBar(
        currentIndex: _currentIndex,
        onTap: _onTabTapped,
      ),
    );
  }
}
