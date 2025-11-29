import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_service.dart';
import '../services/user_manager.dart';
import '../utils/translations.dart';
import '../services/language_service.dart';
import '../utils/file_upload_helper.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _emailController;
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _isLoading = false;
  dynamic _avatarFile;
  bool _showPasswordSection = false;

  @override
  void initState() {
    super.initState();
    final user = UserManager().currentUser;
    _nameController = TextEditingController(text: user?.name ?? '');
    _emailController = TextEditingController(text: user?.email ?? '');
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _pickAvatar() async {
    final file = await FileUploadHelper.pickImage();
    if (file != null) {
      setState(() => _avatarFile = file);
    }
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    final user = UserManager().currentUser;
    if (user == null) return;

    final lang = LanguageService().currentLocale.languageCode;
    final name = _nameController.text.trim();
    bool allSuccess = true;

    // Update name
    final nameSuccess = await ApiService().updateProfile(user.id, name);
    if (!nameSuccess) allSuccess = false;

    // Update avatar if changed
    if (_avatarFile != null) {
      final avatarSuccess =
          await ApiService().updateAvatar(user.id, _avatarFile);
      if (!avatarSuccess) allSuccess = false;
    }

    // Update password if provided
    if (_currentPasswordController.text.isNotEmpty &&
        _newPasswordController.text.isNotEmpty) {
      final passwordSuccess = await ApiService().updatePassword(
        user.id,
        _currentPasswordController.text,
        _newPasswordController.text,
      );
      if (!passwordSuccess) allSuccess = false;
    }

    if (mounted) {
      setState(() => _isLoading = false);
      if (allSuccess) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content:
                  Text(AppTranslations.get('profile_update_success', lang)),
              backgroundColor: Colors.green,
            ),
          );
          // Return true to trigger profile screen refresh
          // Note: Avatar will show after app restart since we don't have getUserById endpoint
          Navigator.pop(context, true);
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(AppTranslations.get('profile_update_error',
                LanguageService().currentLocale.languageCode)),
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
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text(
          AppTranslations.get('edit_profile_title', lang),
          style: GoogleFonts.inter(
            color: const Color(0xFF1F2937),
            fontWeight: FontWeight.bold,
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Color(0xFF7C3AED)),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Avatar Section
              Center(
                child: Column(
                  children: [
                    GestureDetector(
                      onTap: _pickAvatar,
                      child: Container(
                        width: 100,
                        height: 100,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: const Color(0xFFF3F4F6),
                          border: Border.all(
                            color: const Color(0xFF7C3AED),
                            width: 3,
                          ),
                        ),
                        child: _avatarFile != null
                            ? ClipOval(
                                child: _avatarFile is Uint8List
                                    ? Image.memory(_avatarFile!,
                                        fit: BoxFit.cover)
                                    : Image.file(_avatarFile!,
                                        fit: BoxFit.cover),
                              )
                            : const Icon(
                                Icons.person,
                                size: 50,
                                color: Color(0xFF9CA3AF),
                              ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextButton.icon(
                      onPressed: _pickAvatar,
                      icon: const Icon(Icons.camera_alt, size: 18),
                      label: Text(AppTranslations.get('change_avatar', lang)),
                      style: TextButton.styleFrom(
                        foregroundColor: const Color(0xFF7C3AED),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              // Name Field
              _buildLabel(AppTranslations.get('name_label', lang)),
              const SizedBox(height: 8),
              TextFormField(
                controller: _nameController,
                decoration: _buildInputDecoration(
                    AppTranslations.get('enter_name', lang)),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return AppTranslations.get('enter_name', lang);
                  }
                  return null;
                },
              ),
              const SizedBox(height: 32),
              // Password Section
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    AppTranslations.get('change_password', lang),
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF374151),
                    ),
                  ),
                  IconButton(
                    icon: Icon(
                      _showPasswordSection
                          ? Icons.expand_less
                          : Icons.expand_more,
                    ),
                    onPressed: () {
                      setState(() {
                        _showPasswordSection = !_showPasswordSection;
                      });
                    },
                  ),
                ],
              ),
              if (_showPasswordSection) ...[
                const SizedBox(height: 16),
                _buildLabel(AppTranslations.get('current_password', lang)),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _currentPasswordController,
                  obscureText: true,
                  decoration: _buildInputDecoration(
                      AppTranslations.get('enter_current_password', lang)),
                ),
                const SizedBox(height: 16),
                _buildLabel(AppTranslations.get('new_password', lang)),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _newPasswordController,
                  obscureText: true,
                  decoration: _buildInputDecoration(
                      AppTranslations.get('enter_new_password', lang)),
                  validator: (value) {
                    if (_currentPasswordController.text.isNotEmpty &&
                        (value == null || value.length < 6)) {
                      return AppTranslations.get('password_min_length', lang);
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                _buildLabel(AppTranslations.get('confirm_password', lang)),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _confirmPasswordController,
                  obscureText: true,
                  decoration: _buildInputDecoration(
                      AppTranslations.get('repeat_new_password', lang)),
                  validator: (value) {
                    if (_newPasswordController.text.isNotEmpty &&
                        value != _newPasswordController.text) {
                      return AppTranslations.get('password_mismatch', lang);
                    }
                    return null;
                  },
                ),
              ],
              const SizedBox(height: 40),
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _saveProfile,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF7C3AED),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    elevation: 0,
                  ),
                  child: _isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : Text(
                          AppTranslations.get('save_btn', lang),
                          style: GoogleFonts.inter(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Text(
      text,
      style: GoogleFonts.inter(
        fontSize: 14,
        fontWeight: FontWeight.w500,
        color: const Color(0xFF374151),
      ),
    );
  }

  InputDecoration _buildInputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: GoogleFonts.inter(color: const Color(0xFF9CA3AF)),
      filled: true,
      fillColor: const Color(0xFFF9FAFB),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF7C3AED), width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    );
  }
}
