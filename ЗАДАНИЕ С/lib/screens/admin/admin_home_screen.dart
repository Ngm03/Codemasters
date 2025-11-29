import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:aqmola_start/screens/admin/admin_users_screen.dart';
import 'package:aqmola_start/screens/admin/admin_content_screen.dart';
import 'package:aqmola_start/utils/translations.dart';
import 'package:aqmola_start/services/language_service.dart';

class AdminHomeScreen extends StatelessWidget {
  const AdminHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: LanguageService(),
      builder: (context, child) {
        final lang = LanguageService().currentLocale.languageCode;
        return Scaffold(
          appBar: AppBar(
            title: Text(AppTranslations.get('admin_panel', lang)),
            backgroundColor: Colors.deepPurple,
            foregroundColor: Colors.white,
          ),
          body: ListView(
            padding: const EdgeInsets.all(16.0),
            children: [
              _buildAdminCard(
                context,
                title: AppTranslations.get('admin_users', lang),
                iconPath: 'assets/icons/users.svg',
                fallbackIcon: Icons.people,
                color: Colors.blue,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (context) => const AdminUsersScreen()),
                  );
                },
              ),
              const SizedBox(height: 16),
              Text(
                AppTranslations.get('admin_content', lang),
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              _buildAdminCard(
                context,
                title: AppTranslations.get('startups', lang),
                iconPath: 'assets/icons/startups.svg',
                fallbackIcon: Icons.rocket_launch,
                color: Colors.orange,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const AdminContentScreen(
                        contentType: 'startups',
                        title: 'startups',
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: 8),
              _buildAdminCard(
                context,
                title: AppTranslations.get('teams', lang),
                iconPath: 'assets/icons/teams.svg',
                fallbackIcon: Icons.groups,
                color: Colors.green,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const AdminContentScreen(
                        contentType: 'teams',
                        title: 'teams',
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: 8),
              _buildAdminCard(
                context,
                title: AppTranslations.get('events', lang),
                iconPath: 'assets/icons/events.svg',
                fallbackIcon: Icons.event,
                color: Colors.purple,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const AdminContentScreen(
                        contentType: 'events',
                        title: 'events',
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: 8),
              _buildAdminCard(
                context,
                title: AppTranslations.get('vacancies', lang),
                iconPath: 'assets/icons/vacancies.svg',
                fallbackIcon: Icons.work,
                color: Colors.teal,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const AdminContentScreen(
                        contentType: 'vacancies',
                        title: 'vacancies',
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildAdminCard(
    BuildContext context, {
    required String title,
    required String iconPath,
    required IconData fallbackIcon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: SvgPicture.asset(
                  iconPath,
                  colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
                  width: 30,
                  height: 30,
                  placeholderBuilder: (BuildContext context) =>
                      Icon(fallbackIcon, color: color, size: 30),
                ),
              ),
              const SizedBox(width: 16),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey),
            ],
          ),
        ),
      ),
    );
  }
}
