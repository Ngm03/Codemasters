import 'package:flutter/material.dart';
import 'package:aqmola_start/services/admin_service.dart';
import 'package:aqmola_start/utils/translations.dart';
import 'package:aqmola_start/services/language_service.dart';

class AdminContentScreen extends StatefulWidget {
  final String contentType;
  final String title;

  const AdminContentScreen({
    super.key,
    required this.contentType,
    required this.title,
  });

  @override
  State<AdminContentScreen> createState() => _AdminContentScreenState();
}

class _AdminContentScreenState extends State<AdminContentScreen> {
  final AdminService _adminService = AdminService();
  List<dynamic> _items = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadContent();
  }

  Future<void> _loadContent() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final items = await _adminService.getPendingContent(widget.contentType);
      setState(() {
        _items = items;
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

  Future<void> _approveItem(int id) async {
    final lang = LanguageService().currentLocale.languageCode;
    try {
      await _adminService.approveContent(widget.contentType, id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(AppTranslations.get('approved_msg', lang))),
        );
      }
      _loadContent();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content:
                  Text('${AppTranslations.get('error_generic', lang)}: $e')),
        );
      }
    }
  }

  Future<void> _rejectItem(int id) async {
    final lang = LanguageService().currentLocale.languageCode;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('${AppTranslations.get('reject_action', lang)}?'),
        content: Text(AppTranslations.get('delete_confirm_msg', lang)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(AppTranslations.get('cancel_btn', lang)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text(AppTranslations.get('reject_action', lang)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await _adminService.rejectContent(widget.contentType, id);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(AppTranslations.get('rejected_msg', lang))),
          );
        }
        _loadContent();
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
                content:
                    Text('${AppTranslations.get('error_generic', lang)}: $e')),
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
            title: Text(
                '${AppTranslations.get('pending_title', lang)}: ${AppTranslations.get(widget.title, lang)}'),
            backgroundColor: Colors.deepPurple,
            foregroundColor: Colors.white,
          ),
          body: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? Center(
                      child: Text(
                          '${AppTranslations.get('error_generic', lang)}: $_error'))
                  : _items.isEmpty
                      ? Center(
                          child: Text(AppTranslations.get('no_pending', lang)))
                      : ListView.builder(
                          itemCount: _items.length,
                          itemBuilder: (context, index) {
                            final item = _items[index];
                            final title =
                                item['name'] ?? item['title'] ?? '---';
                            final description = item['description'] ?? '';
                            final creator = item['creator_name'] ?? '---';

                            return Card(
                              margin: const EdgeInsets.all(8.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  ListTile(
                                    title: Text(title,
                                        style: const TextStyle(
                                            fontWeight: FontWeight.bold)),
                                    subtitle: Text(
                                        '${AppTranslations.get('author_label', lang)}: $creator\n$description'),
                                    isThreeLine: true,
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.all(8.0),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.end,
                                      children: [
                                        TextButton.icon(
                                          onPressed: () =>
                                              _rejectItem(item['id']),
                                          icon: const Icon(Icons.close,
                                              color: Colors.red),
                                          label: Text(
                                              AppTranslations.get(
                                                  'reject_action', lang),
                                              style: const TextStyle(
                                                  color: Colors.red)),
                                        ),
                                        const SizedBox(width: 8),
                                        ElevatedButton.icon(
                                          onPressed: () =>
                                              _approveItem(item['id']),
                                          icon: const Icon(Icons.check),
                                          label: Text(AppTranslations.get(
                                              'approve_action', lang)),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: Colors.green,
                                            foregroundColor: Colors.white,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
        );
      },
    );
  }
}
