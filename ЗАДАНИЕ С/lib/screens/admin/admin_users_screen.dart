import 'package:flutter/material.dart';
import 'package:aqmola_start/models/user.dart';
import 'package:aqmola_start/services/admin_service.dart';
import 'package:aqmola_start/utils/translations.dart';
import 'package:aqmola_start/services/language_service.dart';

class AdminUsersScreen extends StatefulWidget {
  const AdminUsersScreen({super.key});

  @override
  State<AdminUsersScreen> createState() => _AdminUsersScreenState();
}

class _AdminUsersScreenState extends State<AdminUsersScreen> {
  final AdminService _adminService = AdminService();
  List<User> _users = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadUsers();
  }

  Future<void> _loadUsers() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final users = await _adminService.getUsers();
      setState(() {
        _users = users;
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _deleteUser(User user) async {
    final lang = LanguageService().currentLocale.languageCode;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(AppTranslations.get('delete_confirm_title', lang)),
        content: Text(
            '${AppTranslations.get('delete_confirm_msg', lang)} (${user.name})'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(AppTranslations.get('cancel_btn', lang)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text(AppTranslations.get('delete_btn', lang)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await _adminService.deleteUser(user.id);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Пользователь удален')),
          );
        }
        _loadUsers();
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Ошибка удаления: $e')),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: LanguageService(),
      builder: (context, child) {
        final lang = LanguageService().currentLocale.languageCode;
        return Scaffold(
          appBar: AppBar(
            title: Text(AppTranslations.get('admin_users', lang)),
            backgroundColor: Colors.deepPurple,
            foregroundColor: Colors.white,
          ),
          body: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? Center(
                      child: Text(
                          '${AppTranslations.get('error_generic', lang)}: $_error'))
                  : ListView.builder(
                      itemCount: _users.length,
                      itemBuilder: (context, index) {
                        final user = _users[index];
                        return ListTile(
                          leading: CircleAvatar(
                            backgroundImage: user.avatarUrl != null
                                ? NetworkImage(user.avatarUrl!
                                        .startsWith('http')
                                    ? user.avatarUrl!
                                    : 'https://nonapparent-granophyric-laylah.ngrok-free.dev${user.avatarUrl}')
                                : null,
                            child: user.avatarUrl == null
                                ? Text(user.name.isNotEmpty
                                    ? user.name[0].toUpperCase()
                                    : '?')
                                : null,
                          ),
                          title: Text(user.name),
                          subtitle:
                              Text('${user.email}\n${user.role.displayName}'),
                          isThreeLine: true,
                          trailing: IconButton(
                            icon: const Icon(Icons.delete, color: Colors.red),
                            onPressed: () => _deleteUser(user),
                          ),
                        );
                      },
                    ),
        );
      },
    );
  }
}
