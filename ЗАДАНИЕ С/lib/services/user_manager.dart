import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import 'api_service.dart';

class UserManager extends ChangeNotifier {
  static final UserManager _instance = UserManager._internal();

  factory UserManager() {
    return _instance;
  }

  UserManager._internal();

  User? _currentUser;
  List<String> _favoriteStartupIds = [];
  List<String> _favoriteVacancyIds = [];
  List<String> _favoriteEventIds = [];

  User? get currentUser => _currentUser;
  bool get isLoggedIn => _currentUser != null;

  List<String> get favoriteStartupIds => _favoriteStartupIds;
  List<String> get favoriteVacancyIds => _favoriteVacancyIds;
  List<String> get favoriteEventIds => _favoriteEventIds;

  Future<void> loadUser() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userJson = prefs.getString('user_data');
      if (userJson != null) {
        _currentUser = User.fromJson(json.decode(userJson));
        debugPrint('User loaded from storage: ${_currentUser?.name}');

        // Fetch favorites from server
        if (_currentUser != null) {
          await _syncFavoritesFromServer();
        }
      } else {
        // Load local favorites if no user logged in
        _favoriteStartupIds = prefs.getStringList('fav_startups') ?? [];
        _favoriteVacancyIds = prefs.getStringList('fav_vacancies') ?? [];
        _favoriteEventIds = prefs.getStringList('fav_events') ?? [];
      }

      notifyListeners();
    } catch (e) {
      debugPrint('Error loading user: $e');
    }
  }

  Future<void> _syncFavoritesFromServer() async {
    if (_currentUser == null) return;

    try {
      final prefs = await SharedPreferences.getInstance();

      // Get local favorites for migration
      final localStartups = prefs.getStringList('fav_startups') ?? [];
      final localVacancies = prefs.getStringList('fav_vacancies') ?? [];
      final localEvents = prefs.getStringList('fav_events') ?? [];

      // Fetch from server
      final apiService = ApiService();
      final serverFavorites =
          await apiService.getUserFavorites(_currentUser!.id);

      // Merge local favorites to server (migration)
      for (var id in localStartups) {
        if (!serverFavorites['startups']!.contains(id)) {
          await apiService.addFavorite(_currentUser!.id, 'startup', id);
        }
      }
      for (var id in localVacancies) {
        if (!serverFavorites['vacancies']!.contains(id)) {
          await apiService.addFavorite(_currentUser!.id, 'vacancy', id);
        }
      }
      for (var id in localEvents) {
        if (!serverFavorites['events']!.contains(id)) {
          await apiService.addFavorite(_currentUser!.id, 'event', id);
        }
      }

      // Fetch updated favorites from server
      final updatedFavorites =
          await apiService.getUserFavorites(_currentUser!.id);

      _favoriteStartupIds = updatedFavorites['startups'] ?? [];
      _favoriteVacancyIds = updatedFavorites['vacancies'] ?? [];
      _favoriteEventIds = updatedFavorites['events'] ?? [];

      // Clear local storage after migration
      await prefs.remove('fav_startups');
      await prefs.remove('fav_vacancies');
      await prefs.remove('fav_events');

      debugPrint('Favorites synced from server');
    } catch (e) {
      debugPrint('Error syncing favorites: $e');
      // Fallback to local storage on error
      final prefs = await SharedPreferences.getInstance();
      _favoriteStartupIds = prefs.getStringList('fav_startups') ?? [];
      _favoriteVacancyIds = prefs.getStringList('fav_vacancies') ?? [];
      _favoriteEventIds = prefs.getStringList('fav_events') ?? [];
    }
  }

  Future<void> setUser(User user) async {
    _currentUser = user;
    debugPrint('User logged in: ${user.name} (${user.email})');
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
          'user_data',
          json.encode({
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'created_at': user.createdAt,
            'resume_path': user.resumePath,
            'portfolio_links': user.portfolioLinks,
            'avatar_url': user.avatarUrl,
            'user_role': user.role.name,
            'bio': user.bio,
            'company': user.company,
            'position': user.position,
            'is_admin': user.isAdmin,
          }));
      notifyListeners();
    } catch (e) {
      debugPrint('Error saving user: $e');
    }
  }

  Future<void> clearUser() async {
    _currentUser = null;
    _favoriteStartupIds = [];
    _favoriteVacancyIds = [];
    _favoriteEventIds = [];
    debugPrint('User logged out');
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('user_data');
      await prefs.remove('fav_startups');
      await prefs.remove('fav_vacancies');
      await prefs.remove('fav_events');
      notifyListeners();
    } catch (e) {
      debugPrint('Error clearing user: $e');
    }
  }

  Future<void> updateUser({
    String? name,
    String? resumePath,
    List<String>? portfolioLinks,
    String? avatarUrl,
  }) async {
    if (_currentUser == null) return;

    final updatedUser = User(
      id: _currentUser!.id,
      name: name ?? _currentUser!.name,
      email: _currentUser!.email,
      createdAt: _currentUser!.createdAt,
      resumePath: resumePath ?? _currentUser!.resumePath,
      portfolioLinks: portfolioLinks ?? _currentUser!.portfolioLinks,
      avatarUrl: avatarUrl ?? _currentUser!.avatarUrl,
      role: _currentUser!.role,
      bio: _currentUser!.bio,
      company: _currentUser!.company,
      position: _currentUser!.position,
      isAdmin: _currentUser!.isAdmin,
    );

    await setUser(updatedUser);
  }

  // Favorites Logic

  bool isFavoriteStartup(String id) => _favoriteStartupIds.contains(id);
  bool isFavoriteVacancy(String id) => _favoriteVacancyIds.contains(id);
  bool isFavoriteEvent(String id) => _favoriteEventIds.contains(id);

  Future<void> toggleFavoriteStartup(String id) async {
    final isAdding = !_favoriteStartupIds.contains(id);

    if (isAdding) {
      _favoriteStartupIds.add(id);
    } else {
      _favoriteStartupIds.remove(id);
    }
    notifyListeners();

    // Sync with server if user is logged in
    if (_currentUser != null) {
      final apiService = ApiService();
      if (isAdding) {
        await apiService.addFavorite(_currentUser!.id, 'startup', id);
      } else {
        await apiService.removeFavorite(_currentUser!.id, 'startup', id);
      }
    } else {
      // Save locally if not logged in
      final prefs = await SharedPreferences.getInstance();
      await prefs.setStringList('fav_startups', _favoriteStartupIds);
    }
  }

  Future<void> toggleFavoriteVacancy(String id) async {
    final isAdding = !_favoriteVacancyIds.contains(id);

    if (isAdding) {
      _favoriteVacancyIds.add(id);
    } else {
      _favoriteVacancyIds.remove(id);
    }
    notifyListeners();

    // Sync with server if user is logged in
    if (_currentUser != null) {
      final apiService = ApiService();
      if (isAdding) {
        await apiService.addFavorite(_currentUser!.id, 'vacancy', id);
      } else {
        await apiService.removeFavorite(_currentUser!.id, 'vacancy', id);
      }
    } else {
      // Save locally if not logged in
      final prefs = await SharedPreferences.getInstance();
      await prefs.setStringList('fav_vacancies', _favoriteVacancyIds);
    }
  }

  Future<void> toggleFavoriteEvent(String id) async {
    final isAdding = !_favoriteEventIds.contains(id);

    if (isAdding) {
      _favoriteEventIds.add(id);
    } else {
      _favoriteEventIds.remove(id);
    }
    notifyListeners();

    // Sync with server if user is logged in
    if (_currentUser != null) {
      final apiService = ApiService();
      if (isAdding) {
        await apiService.addFavorite(_currentUser!.id, 'event', id);
      } else {
        await apiService.removeFavorite(_currentUser!.id, 'event', id);
      }
    } else {
      // Save locally if not logged in
      final prefs = await SharedPreferences.getInstance();
      await prefs.setStringList('fav_events', _favoriteEventIds);
    }
  }
}
