import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_service.dart';
import '../services/user_manager.dart';
import '../utils/translations.dart';
import '../services/language_service.dart';
import 'create_startup_screen.dart';
import 'create_team_screen.dart';
import 'create_event_screen.dart';
import 'create_vacancy_screen.dart';

class MyContentScreen extends StatefulWidget {
  const MyContentScreen({super.key});

  @override
  State<MyContentScreen> createState() => _MyContentScreenState();
}

class _MyContentScreenState extends State<MyContentScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final ApiService _apiService = ApiService();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final lang = LanguageService().currentLocale.languageCode;
    final user = UserManager().currentUser;
    if (user == null) {
      return Scaffold(
        body: Center(child: Text(AppTranslations.get('please_login', lang))),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Text(
          AppTranslations.get('my_content_title', lang),
          style: GoogleFonts.inter(
            color: const Color(0xFF1E293B),
            fontWeight: FontWeight.bold,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Color(0xFF1E293B)),
          onPressed: () => Navigator.pop(context),
        ),
        bottom: TabBar(
          controller: _tabController,
          labelColor: const Color(0xFF7C3AED),
          unselectedLabelColor: Colors.grey.shade500,
          indicatorColor: const Color(0xFF7C3AED),
          labelStyle:
              GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 13),
          tabs: [
            Tab(text: AppTranslations.get('tab_startups', lang)),
            Tab(text: AppTranslations.get('tab_teams', lang)),
            Tab(text: AppTranslations.get('tab_events', lang)),
            Tab(text: AppTranslations.get('tab_vacancies', lang)),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildStartupsList(user.id, lang),
          _buildTeamsList(user.id, lang),
          _buildEventsList(user.id, lang),
          _buildVacanciesList(user.id, lang),
        ],
      ),
    );
  }

  Widget _buildStartupsList(int userId, String lang) {
    return FutureBuilder<List<dynamic>>(
      future: _apiService.getUserStartups(userId),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Center(
            child: CircularProgressIndicator(color: Color(0xFF7C3AED)),
          );
        }

        final startups = snapshot.data!;
        if (startups.isEmpty) {
          return _buildEmptyState(
            icon: Icons.rocket_launch,
            title: AppTranslations.get('no_startups', lang),
            subtitle: AppTranslations.get('create_first_startup', lang),
            lang: lang,
            onTap: () async {
              final result = await Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const CreateStartupScreen(),
                ),
              );
              if (result == true && mounted) {
                setState(() {});
              }
            },
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(20),
          itemCount: startups.length,
          itemBuilder: (context, index) {
            final startup = startups[index];
            return _buildContentCard(
              title: startup['name'] ?? '',
              subtitle: startup['category'] ?? '',
              isApproved: startup['is_approved'] == 1,
              lang: lang,
              onEdit: () async {
                final result = await Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => CreateStartupScreen(
                      existingStartup: startup,
                      startupId: startup['id'],
                    ),
                  ),
                );
                if (result == true && mounted) {
                  setState(() {});
                }
              },
              onDelete: () async {
                final success = await _apiService.deleteStartup(
                  userId,
                  startup['id'],
                );
                if (success) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content:
                          Text(AppTranslations.get('deleted_success', lang)),
                      backgroundColor: Colors.green,
                    ),
                  );
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(AppTranslations.get('delete_error', lang)),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              },
            );
          },
        );
      },
    );
  }

  Widget _buildTeamsList(int userId, String lang) {
    return FutureBuilder<List<dynamic>>(
      future: _apiService.getUserTeams(userId),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Center(
            child: CircularProgressIndicator(color: Color(0xFF7C3AED)),
          );
        }

        final teams = snapshot.data!;
        if (teams.isEmpty) {
          return _buildEmptyState(
            icon: Icons.people,
            title: AppTranslations.get('no_teams', lang),
            subtitle: AppTranslations.get('create_first_team', lang),
            lang: lang,
            onTap: () async {
              final result = await Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const CreateTeamScreen(),
                ),
              );
              if (result == true && mounted) {
                setState(() {});
              }
            },
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(20),
          itemCount: teams.length,
          itemBuilder: (context, index) {
            final team = teams[index];
            return _buildContentCard(
              title: team['name'] ?? '',
              subtitle: team['location'] ?? '',
              isApproved: team['is_approved'] == 1,
              lang: lang,
              onEdit: () async {
                final result = await Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => CreateTeamScreen(
                      existingTeam: team,
                      teamId: team['id'],
                    ),
                  ),
                );
                if (result == true && mounted) {
                  setState(() {});
                }
              },
              onDelete: () async {
                final success = await _apiService.deleteTeam(
                  userId,
                  team['id'],
                );
                if (success) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content:
                          Text(AppTranslations.get('deleted_success', lang)),
                      backgroundColor: Colors.green,
                    ),
                  );
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(AppTranslations.get('delete_error', lang)),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              },
            );
          },
        );
      },
    );
  }

  Widget _buildEventsList(int userId, String lang) {
    return FutureBuilder<List<dynamic>>(
      future: _apiService.getUserEvents(userId),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Center(
            child: CircularProgressIndicator(color: Color(0xFF7C3AED)),
          );
        }

        final events = snapshot.data!;
        if (events.isEmpty) {
          return _buildEmptyState(
            icon: Icons.event,
            title: AppTranslations.get('no_events', lang),
            subtitle: AppTranslations.get('create_first_event', lang),
            lang: lang,
            onTap: () async {
              final result = await Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const CreateEventScreen(),
                ),
              );
              if (result == true && mounted) {
                setState(() {});
              }
            },
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(20),
          itemCount: events.length,
          itemBuilder: (context, index) {
            final event = events[index];
            return _buildContentCard(
              title: event['title'] ?? '',
              subtitle: event['location'] ?? '',
              isApproved: event['is_approved'] == 1,
              lang: lang,
              onEdit: () async {
                final result = await Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => CreateEventScreen(
                      existingEvent: event,
                      eventId: event['id'],
                    ),
                  ),
                );
                if (result == true && mounted) {
                  setState(() {});
                }
              },
              onDelete: () async {
                final success = await _apiService.deleteEvent(
                  userId,
                  event['id'],
                );
                if (success) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content:
                          Text(AppTranslations.get('deleted_success', lang)),
                      backgroundColor: Colors.green,
                    ),
                  );
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(AppTranslations.get('delete_error', lang)),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              },
            );
          },
        );
      },
    );
  }

  Widget _buildVacanciesList(int userId, String lang) {
    return FutureBuilder<List<dynamic>>(
      future: _apiService.getUserVacancies(userId),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Center(
            child: CircularProgressIndicator(color: Color(0xFF7C3AED)),
          );
        }

        final vacancies = snapshot.data!;
        if (vacancies.isEmpty) {
          return _buildEmptyState(
            icon: Icons.work,
            title: AppTranslations.get('no_vacancies', lang),
            subtitle: AppTranslations.get('create_first_vacancy', lang),
            lang: lang,
            onTap: () async {
              final result = await Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const CreateVacancyScreen(),
                ),
              );
              if (result == true && mounted) {
                setState(() {});
              }
            },
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(20),
          itemCount: vacancies.length,
          itemBuilder: (context, index) {
            final vacancy = vacancies[index];
            return _buildContentCard(
              title: vacancy['title'] ?? '',
              subtitle: vacancy['employer'] ?? '',
              isApproved: vacancy['is_approved'] == 1,
              lang: lang,
              onEdit: () async {
                final result = await Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => CreateVacancyScreen(
                      existingVacancy: vacancy,
                      vacancyId: vacancy['id'],
                    ),
                  ),
                );
                if (result == true && mounted) {
                  setState(() {});
                }
              },
              onDelete: () async {
                final success = await _apiService.deleteVacancy(
                  userId,
                  vacancy['id'],
                );
                if (success) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content:
                          Text(AppTranslations.get('deleted_success', lang)),
                      backgroundColor: Colors.green,
                    ),
                  );
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(AppTranslations.get('delete_error', lang)),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              },
            );
          },
        );
      },
    );
  }

  Widget _buildEmptyState({
    required IconData icon,
    required String title,
    required String subtitle,
    required String lang,
    required VoidCallback onTap,
  }) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 64, color: Colors.grey.shade300),
          const SizedBox(height: 16),
          Text(
            title,
            style: GoogleFonts.inter(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.grey.shade700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            style: GoogleFonts.inter(
              fontSize: 14,
              color: Colors.grey.shade500,
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: onTap,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF7C3AED),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            icon: const Icon(Icons.add),
            label: Text(AppTranslations.get('create_btn', lang)),
          ),
        ],
      ),
    );
  }

  Widget _buildContentCard({
    required String title,
    required String subtitle,
    required bool isApproved,
    required String lang,
    required VoidCallback onEdit,
    required Future<void> Function() onDelete,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: GoogleFonts.inter(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF1E293B),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        subtitle,
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: isApproved
                        ? Colors.green.withValues(alpha: 0.1)
                        : Colors.orange.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    isApproved
                        ? AppTranslations.get('status_approved', lang)
                        : AppTranslations.get('status_moderation', lang),
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: isApproved ? Colors.green : Colors.orange,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton.icon(
                  onPressed: onEdit,
                  icon: const Icon(Icons.edit, size: 18),
                  label: Text(AppTranslations.get('edit_btn', lang)),
                  style: TextButton.styleFrom(
                    foregroundColor: const Color(0xFF7C3AED),
                  ),
                ),
                const SizedBox(width: 8),
                TextButton.icon(
                  onPressed: () async {
                    final confirm = await showDialog<bool>(
                      context: context,
                      builder: (context) => AlertDialog(
                        title: Text(
                            AppTranslations.get('delete_confirm_title', lang)),
                        content: Text(
                            AppTranslations.get('delete_confirm_msg', lang)),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(context, false),
                            child:
                                Text(AppTranslations.get('cancel_btn', lang)),
                          ),
                          TextButton(
                            onPressed: () => Navigator.pop(context, true),
                            style: TextButton.styleFrom(
                              foregroundColor: Colors.red,
                            ),
                            child:
                                Text(AppTranslations.get('delete_btn', lang)),
                          ),
                        ],
                      ),
                    );

                    if (confirm == true) {
                      await onDelete();
                      if (mounted) setState(() {});
                    }
                  },
                  icon: const Icon(Icons.delete, size: 18),
                  label: Text(AppTranslations.get('delete_btn', lang)),
                  style: TextButton.styleFrom(
                    foregroundColor: Colors.red,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
