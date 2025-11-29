import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_service.dart';
import '../services/user_manager.dart';
import '../services/language_service.dart';
import '../utils/translations.dart';
import '../models/startup.dart';
import '../models/vacancy.dart';
import '../models/event.dart';
import 'event_details_screen.dart';

class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({super.key});

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  final ApiService _apiService = ApiService();

  @override
  Widget build(BuildContext context) {
    final lang = LanguageService().currentLocale.languageCode;
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          title: Text(
            AppTranslations.get('favorites_title', lang),
            style: const TextStyle(
              color: Color(0xFF1E293B),
              fontWeight: FontWeight.w800,
            ),
          ),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded,
                color: Color(0xFF1E293B)),
            onPressed: () => Navigator.pop(context),
          ),
          bottom: TabBar(
            labelColor: const Color(0xFF7C3AED),
            unselectedLabelColor: Colors.grey.shade500,
            indicatorColor: const Color(0xFF7C3AED),
            labelStyle:
                const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
            tabs: [
              Tab(text: AppTranslations.get('fav_startups', lang)),
              Tab(text: AppTranslations.get('fav_vacancies', lang)),
              Tab(text: AppTranslations.get('fav_events', lang)),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _buildStartupsList(),
            _buildVacanciesList(),
            _buildEventsList(),
          ],
        ),
      ),
    );
  }

  Widget _buildStartupsList() {
    return FutureBuilder<List<Startup>>(
      future: _apiService.getStartups(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Center(
              child: CircularProgressIndicator(color: Color(0xFF7C3AED)));
        }
        return AnimatedBuilder(
          animation: UserManager(),
          builder: (context, child) {
            final favorites = snapshot.data!
                .where((s) => UserManager().isFavoriteStartup(s.id))
                .toList();

            if (favorites.isEmpty) {
              return _buildEmptyState();
            }

            return ListView.builder(
              padding: const EdgeInsets.all(20),
              itemCount: favorites.length,
              itemBuilder: (context, index) =>
                  _buildStartupCard(favorites[index]),
            );
          },
        );
      },
    );
  }

  Widget _buildVacanciesList() {
    return FutureBuilder<List<Vacancy>>(
      future: _apiService.getVacancies(''),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Center(
              child: CircularProgressIndicator(color: Color(0xFF7C3AED)));
        }
        return AnimatedBuilder(
          animation: UserManager(),
          builder: (context, child) {
            final favorites = snapshot.data!
                .where((v) => UserManager().isFavoriteVacancy(v.id))
                .toList();

            if (favorites.isEmpty) {
              return _buildEmptyState();
            }

            return ListView.builder(
              padding: const EdgeInsets.all(20),
              itemCount: favorites.length,
              itemBuilder: (context, index) =>
                  _buildVacancyCard(favorites[index]),
            );
          },
        );
      },
    );
  }

  Widget _buildEventsList() {
    return FutureBuilder<List<Event>>(
      future: _apiService.getEvents(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Center(
              child: CircularProgressIndicator(color: Color(0xFF7C3AED)));
        }
        return AnimatedBuilder(
          animation: UserManager(),
          builder: (context, child) {
            final favorites = snapshot.data!
                .where((e) => UserManager().isFavoriteEvent(e.id))
                .toList();

            if (favorites.isEmpty) {
              return _buildEmptyState();
            }

            return ListView.builder(
              padding: const EdgeInsets.all(20),
              itemCount: favorites.length,
              itemBuilder: (context, index) =>
                  _buildEventCard(favorites[index]),
            );
          },
        );
      },
    );
  }

  Widget _buildEmptyState() {
    final lang = LanguageService().currentLocale.languageCode;
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.favorite_border_rounded,
              size: 64, color: Colors.grey.shade300),
          const SizedBox(height: 16),
          Text(
            AppTranslations.get('no_favorites', lang),
            style: TextStyle(
              fontSize: 16,
              color: Colors.grey.shade500,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  // Copied Card Builders (Simplified for brevity if needed, but keeping full for consistency)

  Widget _buildStartupCard(Startup startup) {
    return GestureDetector(
      onTap: () async {
        if (startup.websiteUrl.isNotEmpty) {
          final Uri url = Uri.parse(startup.websiteUrl);
          final scaffoldMessenger = ScaffoldMessenger.of(context);
          final bool launched = await launchUrl(url);

          if (!launched) {
            scaffoldMessenger.showSnackBar(
              SnackBar(
                content: Text(
                    '${AppTranslations.get('error_launch_url', LanguageService().currentLocale.languageCode)} $url'),
              ),
            );
          }
        }
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF7C3AED).withValues(alpha: 0.08),
              blurRadius: 24,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF7C3AED), Color(0xFF9D5CFF)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Center(
                      child: Text(
                        startup.logoUrl.isNotEmpty
                            ? startup.logoUrl[0].toUpperCase()
                            : 'S',
                        style: const TextStyle(
                          fontSize: 32,
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          startup.name,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF1E293B),
                            letterSpacing: -0.5,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            _buildTag(
                                text: startup.category,
                                color: const Color(0xFF7C3AED)),
                            _buildTag(text: startup.stage, color: Colors.green),
                          ],
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.favorite_rounded, color: Colors.red),
                    onPressed: () =>
                        UserManager().toggleFavoriteStartup(startup.id),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Text(
                startup.description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 15,
                  color: Colors.grey.shade600,
                  height: 1.6,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildVacancyCard(Vacancy vacancy) {
    return GestureDetector(
      onTap: () async {
        final Uri url = Uri.parse(vacancy.url);
        final scaffoldMessenger = ScaffoldMessenger.of(context);
        final bool launched = await launchUrl(
          url,
          mode: LaunchMode.externalApplication,
        );

        if (!launched) {
          scaffoldMessenger.showSnackBar(
            SnackBar(
              content: Text(
                  '${AppTranslations.get('error_launch_url', LanguageService().currentLocale.languageCode)} $url'),
            ),
          );
        }
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF7C3AED).withValues(alpha: 0.08),
              blurRadius: 24,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          vacancy.title,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF1E293B),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          vacancy.employer,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.favorite_rounded, color: Colors.red),
                    onPressed: () =>
                        UserManager().toggleFavoriteVacancy(vacancy.id),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _buildTag(
                      icon: Icons.location_on_rounded, text: vacancy.location),
                  _buildTag(
                    icon: Icons.monetization_on_rounded,
                    text: vacancy.salary,
                    color: const Color(0xFF7C3AED),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEventCard(Event event) {
    final lang = LanguageService().currentLocale.languageCode;
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => EventDetailsScreen(event: event),
          ),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF7C3AED).withValues(alpha: 0.08),
              blurRadius: 24,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 140,
              decoration: BoxDecoration(
                color: const Color(0xFF7C3AED).withValues(alpha: 0.1),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(24),
                  topRight: Radius.circular(24),
                ),
              ),
              child: Stack(
                children: [
                  if (event.imageUrl.isNotEmpty)
                    ClipRRect(
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(24),
                        topRight: Radius.circular(24),
                      ),
                      child: Image.network(
                        event.imageUrl,
                        width: double.infinity,
                        height: double.infinity,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) =>
                            const Center(
                                child: Icon(Icons.event,
                                    size: 50, color: Color(0xFF7C3AED))),
                      ),
                    ),
                  Positioned(
                    top: 12,
                    right: 12,
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.9),
                        shape: BoxShape.circle,
                      ),
                      child: IconButton(
                        icon: const Icon(Icons.favorite_rounded,
                            color: Colors.red),
                        onPressed: () =>
                            UserManager().toggleFavoriteEvent(event.id),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    event.title,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF1E293B),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Icon(Icons.calendar_today_rounded,
                          size: 16, color: const Color(0xFF7C3AED)),
                      const SizedBox(width: 8),
                      Text(
                        DateFormat('dd MMM, HH:mm', lang)
                            .format(event.dateTime),
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTag({String? text, IconData? icon, Color? color}) {
    final contentColor = color ?? Colors.grey.shade600;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: contentColor.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 16, color: contentColor),
            const SizedBox(width: 6),
          ],
          Flexible(
            child: Text(
              text ?? '',
              style: TextStyle(
                fontSize: 13,
                color: contentColor,
                fontWeight: FontWeight.w600,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
