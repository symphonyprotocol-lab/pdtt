import 'package:provider/provider.dart';
import 'package:provider/single_child_widget.dart';
import '../models/wallet_model.dart';

class WalletProvider {
  static List<SingleChildWidget> providers = [
    ChangeNotifierProvider(create: (_) => WalletModel()),
  ];
}
