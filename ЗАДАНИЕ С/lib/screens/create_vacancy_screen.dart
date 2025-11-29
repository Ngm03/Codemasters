import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_service.dart';
import '../services/user_manager.dart';
import '../utils/translations.dart';
import '../services/language_service.dart';

class CreateVacancyScreen extends StatefulWidget {
  final Map<String, dynamic>? existingVacancy;
  final int? vacancyId;

  const CreateVacancyScreen({super.key, this.existingVacancy, this.vacancyId});

  @override
  State<CreateVacancyScreen> createState() => _CreateVacancyScreenState();
}

class _CreateVacancyScreenState extends State<CreateVacancyScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _employerController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _locationController = TextEditingController();
  final _salaryController = TextEditingController();
  final _urlController = TextEditingController();

  String _selectedExperience = 'Без опыта';
  bool _isLoading = false;
  final ApiService _apiService = ApiService();

  final List<String> _experienceLevels = [
    'Без опыта',
    'От 1 года до 3 лет',
    'От 3 до 6 лет',
    'Более 6 лет',
  ];

  @override
  void initState() {
    super.initState();
    if (widget.existingVacancy != null) {
      _titleController.text = widget.existingVacancy!['title'] ?? '';
      _employerController.text = widget.existingVacancy!['employer'] ?? '';
      _descriptionController.text =
          widget.existingVacancy!['description'] ?? '';
      _locationController.text = widget.existingVacancy!['location'] ?? '';
      _salaryController.text = widget.existingVacancy!['salary'] ?? '';
      _urlController.text = widget.existingVacancy!['url'] ?? '';
      _selectedExperience =
          widget.existingVacancy!['experience'] ?? 'Без опыта';
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _employerController.dispose();
    _descriptionController.dispose();
    _locationController.dispose();
    _salaryController.dispose();
    _urlController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final user = UserManager().currentUser;
    if (user == null) return;

    final lang = LanguageService().currentLocale.languageCode;
    setState(() => _isLoading = true);

    try {
      final bool success;
      if (widget.vacancyId != null) {
        success = await _apiService.updateVacancy(
          userId: user.id,
          vacancyId: widget.vacancyId!,
          title: _titleController.text,
          employer: _employerController.text,
          description: _descriptionController.text,
          location: _locationController.text,
          salary: _salaryController.text,
          experience: _selectedExperience,
          url: _urlController.text,
        );
      } else {
        success = await _apiService.createVacancy(
          userId: user.id,
          title: _titleController.text,
          employer: _employerController.text,
          description: _descriptionController.text,
          location: _locationController.text,
          salary: _salaryController.text,
          experience: _selectedExperience,
          url: _urlController.text,
        );
      }

      if (mounted) {
        setState(() => _isLoading = false);
        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(widget.vacancyId != null
                  ? AppTranslations.get('success_update', lang)
                  : AppTranslations.get('success_create', lang)),
              backgroundColor: Colors.green,
            ),
          );
          Navigator.pop(context, true);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(widget.vacancyId != null
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
          widget.vacancyId != null
              ? AppTranslations.get('vacancy_edit_title', lang)
              : AppTranslations.get('vacancy_create_title', lang),
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
            Text(
              '${AppTranslations.get('vacancy_role', lang)} *',
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF1E293B),
              ),
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: _titleController,
              decoration: InputDecoration(
                hintText: 'Например: Flutter разработчик',
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
            Text(
              '${AppTranslations.get('vacancy_employer', lang)} *',
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF1E293B),
              ),
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: _employerController,
              decoration: InputDecoration(
                hintText: 'Название компании',
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
              maxLines: 5,
              decoration: InputDecoration(
                hintText: 'Опишите требования и обязанности',
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
            Text(
              AppTranslations.get('location', lang),
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF1E293B),
              ),
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: _locationController,
              decoration: InputDecoration(
                hintText: 'Город, страна или удаленно',
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
            Text(
              AppTranslations.get('vacancy_salary', lang),
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF1E293B),
              ),
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: _salaryController,
              decoration: InputDecoration(
                hintText: 'Например: 500000 - 800000 KZT',
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
            Text(
              AppTranslations.get('vacancy_experience', lang),
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF1E293B),
              ),
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              value: _selectedExperience,
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
              items: _experienceLevels.map((level) {
                return DropdownMenuItem(
                  value: level,
                  child: Text(level),
                );
              }).toList(),
              onChanged: (value) {
                if (value != null) {
                  setState(() => _selectedExperience = value);
                }
              },
            ),
            const SizedBox(height: 20),
            Text(
              AppTranslations.get('vacancy_url', lang),
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF1E293B),
              ),
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: _urlController,
              decoration: InputDecoration(
                hintText: 'https://example.com/vacancy',
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
                        widget.vacancyId != null
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
