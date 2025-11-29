import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/user_manager.dart';
import '../services/language_service.dart';
import '../utils/translations.dart';
import 'edit_profile_screen.dart';
import 'favorites_screen.dart';
import 'my_content_screen.dart';
import 'login_screen.dart';
import 'admin/admin_home_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Future<void> _launchWhatsApp() async {
    final Uri url =
        Uri.parse('https://wa.me/77071234567'); // Placeholder number
    if (!await launchUrl(url, mode: LaunchMode.externalApplication)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(
                  '${AppTranslations.get('error_launch_url', LanguageService().currentLocale.languageCode)} $url')),
        );
      }
    }
  }

  void _showLanguageSelector(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildLanguageOption(context, 'Русский', 'ru'),
              _buildLanguageOption(context, 'Қазақша', 'kk'),
              _buildLanguageOption(context, 'English', 'en'),
            ],
          ),
        );
      },
    );
  }

  Widget _buildLanguageOption(BuildContext context, String name, String code) {
    final isSelected = LanguageService().currentLocale.languageCode == code;
    return ListTile(
      title: Text(
        name,
        style: GoogleFonts.inter(
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          color: isSelected ? const Color(0xFF7C3AED) : Colors.black87,
        ),
      ),
      trailing:
          isSelected ? const Icon(Icons.check, color: Color(0xFF7C3AED)) : null,
      onTap: () {
        LanguageService().setLanguage(code);
        Navigator.pop(context);
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final lang = LanguageService().currentLocale.languageCode;
    final user = UserManager().currentUser;
    final name = user?.name ?? AppTranslations.get('guest_name', lang);
    final email = user?.email ?? AppTranslations.get('guest_email', lang);
    final avatarName = name.isNotEmpty ? name.replaceAll(' ', '+') : 'Guest';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SingleChildScrollView(
        child: Column(
          children: [
            _buildHeader(context, name, email, avatarName, lang),
            const SizedBox(height: 24),
            _buildMenu(context, lang),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, String name, String email,
      String avatarName, String lang) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(24, 60, 24, 32),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(32)),
        boxShadow: [
          BoxShadow(
            color: Color(0x05000000),
            blurRadius: 20,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: const LinearGradient(
                colors: [Color(0xFF7C3AED), Color(0xFFC084FC)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF7C3AED).withValues(alpha: 0.3),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: UserManager().currentUser?.avatarUrl != null
                ? ClipOval(
                    child: Image.network(
                      'https://nonapparent-granophyric-laylah.ngrok-free.dev${UserManager().currentUser!.avatarUrl}',
                      fit: BoxFit.cover,
                      width: 100,
                      height: 100,
                      errorBuilder: (context, error, stackTrace) {
                        return Center(
                          child: Text(
                            avatarName.isNotEmpty
                                ? avatarName[0].toUpperCase()
                                : 'G',
                            style: GoogleFonts.inter(
                              fontSize: 40,
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        );
                      },
                    ),
                  )
                : Center(
                    child: Text(
                      avatarName.isNotEmpty ? avatarName[0].toUpperCase() : 'G',
                      style: GoogleFonts.inter(
                        fontSize: 40,
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
          ),
          const SizedBox(height: 16),
          Text(
            name,
            style: GoogleFonts.inter(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: const Color(0xFF1F2937),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            email,
            style: GoogleFonts.inter(
              fontSize: 16,
              color: const Color(0xFF6B7280),
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFF7C3AED).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              AppTranslations.get('developer_badge', lang),
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF7C3AED),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMenu(BuildContext context, String lang) {
    final user = UserManager().currentUser;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          if (user?.isAdmin == true) ...[
            _buildMenuItem(
              icon: Icons.admin_panel_settings_rounded,
              title: AppTranslations.get('admin_panel', lang),
              iconColor: const Color(0xFFDC2626),
              textColor: const Color(0xFFDC2626),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (context) => const AdminHomeScreen()),
                );
              },
            ),
            const SizedBox(height: 12),
          ],
          _buildMenuItem(
            icon: Icons.person_outline_rounded,
            title: AppTranslations.get('profile_edit', lang),
            onTap: () async {
              final result = await Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (context) => const EditProfileScreen()),
              );
              if (result == true && mounted) {
                // Force reload user data from storage
                setState(() {});
              }
            },
          ),
          const SizedBox(height: 12),
          _buildMenuItem(
            icon: Icons.favorite_border_rounded,
            title: AppTranslations.get('profile_favorites', lang),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (context) => const FavoritesScreen()),
              );
            },
          ),
          const SizedBox(height: 12),
          _buildMenuItem(
            icon: Icons.dashboard_customize_rounded,
            title: AppTranslations.get('my_content_title', lang),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (context) => const MyContentScreen()),
              );
            },
          ),
          const SizedBox(height: 12),
          _buildMenuItem(
            icon: Icons.language_rounded,
            title: AppTranslations.get('profile_language', lang),
            onTap: () => _showLanguageSelector(context),
            trailing: Text(
              lang.toUpperCase(),
              style: GoogleFonts.inter(
                color: const Color(0xFF7C3AED),
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const SizedBox(height: 12),
          _buildMenuItem(
            icon: Icons.help_outline_rounded,
            title: AppTranslations.get('profile_help', lang),
            onTap: _launchWhatsApp,
          ),
          const SizedBox(height: 24),
          _buildMenuItem(
            icon: Icons.logout_rounded,
            title: AppTranslations.get('profile_logout', lang),
            textColor: const Color(0xFFEF4444),
            iconColor: const Color(0xFFEF4444),
            onTap: () {
              UserManager().clearUser();
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(builder: (context) => const LoginScreen()),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildMenuItem({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
    Color? textColor,
    Color? iconColor,
    Widget? trailing,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: Color(0x05000000),
            blurRadius: 4,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: ListTile(
        onTap: onTap,
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color:
                (iconColor ?? const Color(0xFF7C3AED)).withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(
            icon,
            color: iconColor ?? const Color(0xFF7C3AED),
            size: 20,
          ),
        ),
        title: Text(
          title,
          style: GoogleFonts.inter(
            fontSize: 16,
            fontWeight: FontWeight.w500,
            color: textColor ?? const Color(0xFF1F2937),
          ),
        ),
        trailing: trailing ??
            const Icon(
              Icons.chevron_right_rounded,
              color: Color(0xFF9CA3AF),
            ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
    );
  }
}
