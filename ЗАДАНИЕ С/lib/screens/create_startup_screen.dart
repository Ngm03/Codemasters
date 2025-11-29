import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_service.dart';
import '../services/user_manager.dart';
import '../utils/file_upload_helper.dart';
import '../utils/translations.dart';
import '../services/language_service.dart';

class CreateStartupScreen extends StatefulWidget {
  final Map<String, dynamic>? existingStartup;
  final int? startupId;

  const CreateStartupScreen({
    super.key,
    this.existingStartup,
    this.startupId,
  });

  @override
  State<CreateStartupScreen> createState() => _CreateStartupScreenState();
}

class _CreateStartupScreenState extends State<CreateStartupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _websiteController = TextEditingController();

  String _selectedCategory = 'Технологии';
  String _selectedStage = 'Идея';
  dynamic _logoFile; // Can be File or Uint8List
  bool _isLoading = false;
  final ApiService _apiService = ApiService();

  final List<String> _categories = [
    'Технологии',
    'Финтех',
    'Здравоохранение',
    'Образование',
    'E-commerce',
    'Другое',
  ];

  final List<String> _stages = [
    'Идея',
    'MVP',
    'Рост',
    'Масштабирование',
  ];

  @override
  void initState() {
    super.initState();
    if (widget.existingStartup != null) {
      _nameController.text = widget.existingStartup!['name'] ?? '';
      _descriptionController.text =
          widget.existingStartup!['description'] ?? '';
      _websiteController.text = widget.existingStartup!['website_url'] ?? '';
      _selectedCategory = widget.existingStartup!['category'] ?? 'Технологии';
      _selectedStage = widget.existingStartup!['stage'] ?? 'Идея';
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _websiteController.dispose();
    super.dispose();
  }

  Future<void> _pickLogo() async {
    final lang = LanguageService().currentLocale.languageCode;
    final file = await FileUploadHelper.pickImage();
    if (file != null) {
      // On web, file is Uint8List; on mobile/desktop, it's File
      if (file is File) {
        if (FileUploadHelper.isValidFileSize(file)) {
          setState(() => _logoFile = file);
        } else {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(AppTranslations.get('image_upload_limit', lang)),
                backgroundColor: Colors.red,
              ),
            );
          }
        }
      } else if (file is Uint8List) {
        // On web, validate size differently
        final mb = file.length / (1024 * 1024);
        if (mb <= 5) {
          setState(() => _logoFile = file);
        } else {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(AppTranslations.get('image_upload_limit', lang)),
                backgroundColor: Colors.red,
              ),
            );
          }
        }
      }
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final user = UserManager().currentUser;
    if (user == null) return;

    final lang = LanguageService().currentLocale.languageCode;
    setState(() => _isLoading = true);

    try {
      final bool success;
      if (widget.startupId != null) {
        // Update existing startup
        success = await _apiService.updateStartup(
          userId: user.id,
          startupId: widget.startupId!,
          name: _nameController.text,
          description: _descriptionController.text,
          category: _selectedCategory,
          stage: _selectedStage,
          websiteUrl: _websiteController.text,
          logoFile: _logoFile,
        );
      } else {
        // Create new startup
        success = await _apiService.createStartup(
          userId: user.id,
          name: _nameController.text,
          description: _descriptionController.text,
          category: _selectedCategory,
          stage: _selectedStage,
          websiteUrl: _websiteController.text,
          logoFile: _logoFile,
        );
      }

      if (mounted) {
        setState(() => _isLoading = false);
        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(widget.startupId != null
                  ? AppTranslations.get('success_update', lang)
                  : AppTranslations.get('success_create', lang)),
              backgroundColor: Colors.green,
            ),
          );
          Navigator.pop(context, true);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(widget.startupId != null
                  ? AppTranslations.get('error_update', lang)
                  : AppTranslations.get('error_create', lang)),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${AppTranslations.get('error_generic', lang)}: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = LanguageService().currentLocale.languageCode;
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Color(0xFF1E293B)),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          widget.startupId != null
              ? AppTranslations.get('startup_edit_title', lang)
              : AppTranslations.get('startup_create_title', lang),
          style: GoogleFonts.inter(
            color: const Color(0xFF1E293B),
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            // Logo Picker
            Center(
              child: GestureDetector(
                onTap: _pickLogo,
                child: Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.grey.shade300, width: 2),
                  ),
                  child: _logoFile != null
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(18),
                          child: _logoFile is Uint8List
                              ? Image.memory(_logoFile!, fit: BoxFit.cover)
                              : Image.file(_logoFile!, fit: BoxFit.cover),
                        )
                      : Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.add_photo_alternate,
                                size: 40, color: Colors.grey.shade400),
                            const SizedBox(height: 8),
                            Text(
                              AppTranslations.get('startup_logo_add', lang),
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                color: Colors.grey.shade600,
                              ),
                            ),
                          ],
                        ),
                ),
              ),
            ),
            const SizedBox(height: 32),

            // Name Field
            Text(
              '${AppTranslations.get('name', lang)} *',
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF1E293B),
              ),
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: _nameController,
              decoration: InputDecoration(
                hintText: AppTranslations.get('startup_name_hint', lang),
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey.shade300),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey.shade300),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide:
                      const BorderSide(color: Color(0xFF7C3AED), width: 2),
                ),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return AppTranslations.get('field_required', lang);
                }
                return null;
              },
            ),
            const SizedBox(height: 20),

            // Description Field
            Text(
              AppTranslations.get('description', lang),
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF1E293B),
              ),
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: _descriptionController,
              maxLines: 4,
              decoration: InputDecoration(
                hintText: AppTranslations.get('startup_desc_hint', lang),
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey.shade300),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey.shade300),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide:
                      const BorderSide(color: Color(0xFF7C3AED), width: 2),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Category Dropdown
            Text(
              AppTranslations.get('category', lang),
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF1E293B),
              ),
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              value: _selectedCategory,
              decoration: InputDecoration(
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey.shade300),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey.shade300),
                ),
              ),
              items: _categories.map((category) {
                return DropdownMenuItem(
                  value: category,
                  child: Text(category),
                );
              }).toList(),
              onChanged: (value) {
                if (value != null) {
                  setState(() => _selectedCategory = value);
                }
              },
            ),
            const SizedBox(height: 20),

            // Stage Dropdown
            Text(
              AppTranslations.get('stage', lang),
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF1E293B),
              ),
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              value: _selectedStage,
              decoration: InputDecoration(
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey.shade300),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey.shade300),
                ),
              ),
              items: _stages.map((stage) {
                return DropdownMenuItem(
                  value: stage,
                  child: Text(stage),
                );
              }).toList(),
              onChanged: (value) {
                if (value != null) {
                  setState(() => _selectedStage = value);
                }
              },
            ),
            const SizedBox(height: 20),

            // Website Field
            Text(
              AppTranslations.get('website', lang),
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF1E293B),
              ),
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: _websiteController,
              decoration: InputDecoration(
                hintText: 'https://example.com',
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey.shade300),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey.shade300),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide:
                      const BorderSide(color: Color(0xFF7C3AED), width: 2),
                ),
              ),
            ),
            const SizedBox(height: 32),

            // Submit Button
            SizedBox(
              height: 56,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF7C3AED),
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: _isLoading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : Text(
                        widget.startupId != null
                            ? AppTranslations.get('update', lang)
                            : AppTranslations.get('create', lang),
                        style: GoogleFonts.inter(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              AppTranslations.get('moderation_warning', lang),
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                fontSize: 12,
                color: Colors.grey.shade600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
