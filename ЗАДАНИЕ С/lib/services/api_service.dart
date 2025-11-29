import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import '../models/startup.dart';
import '../models/team.dart';
import '../models/vacancy.dart';
import '../models/event.dart';
import '../models/user.dart';
import 'user_manager.dart';

class ApiService {
  static const String baseUrl =
      'https://nonapparent-granophyric-laylah.ngrok-free.dev/api';

  Map<String, String> get _headers {
    final headers = {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    };
    final user = UserManager().currentUser;
    if (user != null) {
      headers['x-user-id'] = user.id.toString();
    }
    return headers;
  }

  Future<http.Response> get(String endpoint) async {
    return await http.get(Uri.parse('$baseUrl$endpoint'), headers: _headers);
  }

  Future<http.Response> post(String endpoint, Map<String, dynamic> body) async {
    return await http.post(
      Uri.parse('$baseUrl$endpoint'),
      headers: _headers,
      body: json.encode(body),
    );
  }

  Future<http.Response> delete(String endpoint) async {
    return await http.delete(Uri.parse('$baseUrl$endpoint'), headers: _headers);
  }

  List<dynamic> _parseResponse(String body) {
    final decoded = json.decode(body);
    if (decoded is List) {
      return decoded;
    } else if (decoded is Map && decoded.containsKey('items')) {
      return decoded['items'] as List;
    } else if (decoded is Map && decoded.containsKey('results')) {
      return decoded['results'] as List;
    } else if (decoded is Map && decoded.containsKey('data')) {
      return decoded['data'] as List;
    }
    return [];
  }

  Future<List<Startup>> getStartups() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/startups'),
        headers: _headers,
      );
      debugPrint('Startups Response: ${response.statusCode}');
      if (response.statusCode == 200) {
        final List<dynamic> data = _parseResponse(response.body);
        return data.map((json) => Startup.fromJson(json)).toList();
      }
      debugPrint('Startups API Error: ${response.statusCode} ${response.body}');
      return [];
    } catch (e) {
      debugPrint('Error fetching startups: $e');
      return [];
    }
  }

  Future<List<Team>> getTeams() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/teams'),
        headers: _headers,
      );
      debugPrint('Teams Response: ${response.statusCode}');
      if (response.statusCode == 200) {
        final List<dynamic> data = _parseResponse(response.body);
        return data.map((json) => Team.fromJson(json)).toList();
      }
      debugPrint('Teams API Error: ${response.statusCode} ${response.body}');
      return [];
    } catch (e) {
      debugPrint('Error fetching teams: $e');
      return [];
    }
  }

  Future<List<Vacancy>> getVacancies(String query) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/specialists'),
        headers: _headers,
      );
      debugPrint('Vacancies Response: ${response.statusCode}');
      if (response.statusCode == 200) {
        final List<dynamic> data = _parseResponse(response.body);
        return data.map((json) => Vacancy.fromJson(json)).toList();
      }
      debugPrint(
        'Vacancies API Error: ${response.statusCode} ${response.body}',
      );
      return [];
    } catch (e) {
      debugPrint('Error fetching specialists: $e');
      return [];
    }
  }

  Future<List<Event>> getEvents() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/events'),
        headers: _headers,
      );
      debugPrint('Events Response: ${response.statusCode}');
      if (response.statusCode == 200) {
        final List<dynamic> data = _parseResponse(response.body);
        return data.map((json) => Event.fromJson(json)).toList();
      }
      debugPrint('Events API Error: ${response.statusCode} ${response.body}');
      return [];
    } catch (e) {
      debugPrint('Error fetching events: $e');
      return [];
    }
  }

  Future<String> chatWithAI(
    String message,
    List<Map<String, String>> history,
  ) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/chat'),
        headers: _headers,
        body: json.encode({'message': message, 'history': history}),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['response'] ?? 'No response';
      }
      return 'Error: ${response.statusCode}';
    } catch (e) {
      return 'Connection error: $e';
    }
  }

  Future<bool> login(String email, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/login'),
        headers: _headers,
        body: json.encode({'email': email, 'password': password}),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['user'] != null) {
          final user = User.fromJson(data['user']);
          UserManager().setUser(user);
        }
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('Login error: $e');
      return false;
    }
  }

  Future<bool> register(String name, String email, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/users'),
        headers: _headers,
        body: json.encode({'name': name, 'email': email, 'password': password}),
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        // Auto-login after registration if the API returns the user or id
        // For now, we'll just return true and let the user login
        // Or we could manually set the user if we trust the input
        final data = json.decode(response.body);
        if (data['id'] != null) {
          // Create a temporary user object since we know the details
          final user = User(id: data['id'], name: name, email: email);
          UserManager().setUser(user);
        }
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('Registration error: $e');
      return false;
    }
  }

  Future<List<dynamic>> getUsers() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/users'),
        headers: _headers,
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching users: $e');
      return [];
    }
  }

  Future<bool> updateProfile(int id, String name) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/users/$id'),
        headers: _headers,
        body: json.encode({'name': name}),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['user'] != null) {
          // Update local user manager
          // Note: createdAt might be missing in response, so we keep the old one or handle it in UserManager
          return true;
        }
      }
      debugPrint(
          'Update profile error: ${response.statusCode} ${response.body}');
      return false;
    } catch (e) {
      debugPrint('Error updating profile: $e');
      return false;
    }
  }

  Future<User?> getUserById(int userId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/users/$userId'),
        headers: _headers,
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return User.fromJson(data);
      }
      debugPrint('Get user error: ${response.statusCode}');
      return null;
    } catch (e) {
      debugPrint('Error getting user: $e');
      return null;
    }
  }

  Future<bool> updateAvatar(int userId, dynamic avatarFile) async {
    try {
      var request = http.MultipartRequest(
        'PUT',
        Uri.parse('$baseUrl/users/$userId/avatar'),
      );
      request.headers['ngrok-skip-browser-warning'] = 'true';

      if (avatarFile != null) {
        if (kIsWeb && avatarFile is Uint8List) {
          request.files.add(http.MultipartFile.fromBytes(
            'avatar',
            avatarFile,
            filename: 'avatar.png',
            contentType: MediaType('image', 'png'),
          ));
        } else if (avatarFile is File) {
          request.files.add(await http.MultipartFile.fromPath(
            'avatar',
            avatarFile.path,
            contentType: MediaType('image', 'png'),
          ));
        }
      }

      final response = await request.send();
      final responseBody = await response.stream.bytesToString();

      if (response.statusCode == 200) {
        debugPrint('Avatar updated successfully');
        return true;
      }
      debugPrint('Update avatar error: ${response.statusCode} $responseBody');
      return false;
    } catch (e) {
      debugPrint('Error updating avatar: $e');
      return false;
    }
  }

  Future<bool> updatePassword(
      int userId, String currentPassword, String newPassword) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/users/$userId/password'),
        headers: _headers,
        body: json.encode({
          'currentPassword': currentPassword,
          'newPassword': newPassword,
        }),
      );

      if (response.statusCode == 200) {
        debugPrint('Password updated successfully');
        return true;
      }
      debugPrint(
          'Update password error: ${response.statusCode} ${response.body}');
      return false;
    } catch (e) {
      debugPrint('Error updating password: $e');
      return false;
    }
  }

  // Local backend URL for favorites removed

  Future<Map<String, List<String>>> getUserFavorites(int userId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/users/$userId/favorites'),
        headers: _headers,
      );

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);
        return {
          'startups': List<String>.from(data['startups'] ?? []),
          'vacancies': List<String>.from(data['vacancies'] ?? []),
          'events': List<String>.from(data['events'] ?? []),
        };
      }
      debugPrint('Get favorites error: ${response.statusCode}');
      return {'startups': [], 'vacancies': [], 'events': []};
    } catch (e) {
      debugPrint('Error fetching favorites: $e');
      return {'startups': [], 'vacancies': [], 'events': []};
    }
  }

  Future<bool> addFavorite(int userId, String itemType, String itemId) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/users/$userId/favorites'),
        headers: _headers,
        body: json.encode({
          'itemType': itemType,
          'itemId': itemId,
        }),
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        debugPrint('Favorite added: $itemType - $itemId');
        return true;
      }
      debugPrint('Add favorite error: ${response.statusCode}');
      return false;
    } catch (e) {
      debugPrint('Error adding favorite: $e');
      return false;
    }
  }

  Future<bool> removeFavorite(
      int userId, String itemType, String itemId) async {
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl/users/$userId/favorites/$itemType/$itemId'),
        headers: _headers,
      );

      if (response.statusCode == 200) {
        debugPrint('Favorite removed: $itemType - $itemId');
        return true;
      }
      debugPrint('Remove favorite error: ${response.statusCode}');
      return false;
    } catch (e) {
      debugPrint('Error removing favorite: $e');
      return false;
    }
  }

  Future<bool> updateUserRole(int userId, String role) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/users/$userId/role'),
        headers: _headers,
        body: json.encode({'role': role}),
      );
      return response.statusCode == 200;
    } catch (e) {
      debugPrint('Error updating role: $e');
      return false;
    }
  }

  Future<bool> updateUserProfile(int userId,
      {String? bio, String? company, String? position}) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/users/$userId/profile'),
        headers: _headers,
        body: json.encode({
          'bio': bio,
          'company': company,
          'position': position,
        }),
      );
      return response.statusCode == 200;
    } catch (e) {
      debugPrint('Error updating profile: $e');
      return false;
    }
  }

  Future<List<dynamic>> getUserStartups(int userId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/users/$userId/startups'),
        headers: _headers,
      );
      if (response.statusCode == 200) {
        return json.decode(response.body);
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching user startups: $e');
      return [];
    }
  }

  Future<List<dynamic>> getUserTeams(int userId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/users/$userId/teams'),
        headers: _headers,
      );
      if (response.statusCode == 200) {
        return json.decode(response.body);
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching user teams: $e');
      return [];
    }
  }

  Future<List<dynamic>> getUserEvents(int userId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/users/$userId/events'),
        headers: _headers,
      );
      if (response.statusCode == 200) {
        return json.decode(response.body);
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching user events: $e');
      return [];
    }
  }

  Future<List<dynamic>> getUserVacancies(int userId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/users/$userId/vacancies'),
        headers: _headers,
      );
      if (response.statusCode == 200) {
        return json.decode(response.body);
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching user vacancies: $e');
      return [];
    }
  }

  Future<bool> createStartup({
    required int userId,
    required String name,
    required String description,
    required String category,
    required String stage,
    String? websiteUrl,
    dynamic logoFile,
  }) async {
    try {
      var request = http.MultipartRequest(
        'POST',
        Uri.parse('$baseUrl/users/$userId/startups'),
      );
      request.headers['ngrok-skip-browser-warning'] = 'true';

      // Add text fields
      request.fields['name'] = name;
      request.fields['description'] = description;
      request.fields['category'] = category;
      request.fields['stage'] = stage;
      if (websiteUrl != null && websiteUrl.isNotEmpty) {
        request.fields['website_url'] = websiteUrl;
      }

      // Add file if provided
      if (logoFile != null) {
        if (kIsWeb && logoFile is Uint8List) {
          // Web: use bytes
          request.files.add(http.MultipartFile.fromBytes(
            'logo',
            logoFile,
            filename: 'logo.png',
            contentType: MediaType('image', 'png'),
          ));
        } else if (logoFile is File) {
          // Mobile/Desktop: use file path
          request.files.add(await http.MultipartFile.fromPath(
            'logo',
            logoFile.path,
            contentType: MediaType('image', 'png'),
          ));
        }
      }

      final response = await request.send();
      final responseBody = await response.stream.bytesToString();

      if (response.statusCode == 201 || response.statusCode == 200) {
        debugPrint('Startup created successfully');
        return true;
      }
      debugPrint('Create startup error: ${response.statusCode} $responseBody');
      return false;
    } catch (e) {
      debugPrint('Error creating startup: $e');
      return false;
    }
  }

  Future<bool> createTeam({
    required int userId,
    required String name,
    required String description,
    String? location,
    String? websiteUrl,
    dynamic logoFile,
  }) async {
    try {
      var request = http.MultipartRequest(
        'POST',
        Uri.parse('$baseUrl/users/$userId/teams'),
      );
      request.headers['ngrok-skip-browser-warning'] = 'true';

      request.fields['name'] = name;
      request.fields['description'] = description;
      if (location != null && location.isNotEmpty) {
        request.fields['location'] = location;
      }
      if (websiteUrl != null && websiteUrl.isNotEmpty) {
        request.fields['website_url'] = websiteUrl;
      }

      if (logoFile != null) {
        if (kIsWeb && logoFile is Uint8List) {
          request.files.add(http.MultipartFile.fromBytes(
            'logo',
            logoFile,
            filename: 'logo.png',
            contentType: MediaType('image', 'png'),
          ));
        } else if (logoFile is File) {
          request.files.add(await http.MultipartFile.fromPath(
            'logo',
            logoFile.path,
            contentType: MediaType('image', 'png'),
          ));
        }
      }

      final response = await request.send();
      final responseBody = await response.stream.bytesToString();

      if (response.statusCode == 201 || response.statusCode == 200) {
        debugPrint('Team created successfully');
        return true;
      }
      debugPrint('Create team error: ${response.statusCode} $responseBody');
      return false;
    } catch (e) {
      debugPrint('Error creating team: $e');
      return false;
    }
  }

  Future<bool> createEvent({
    required int userId,
    required String title,
    required String description,
    required DateTime eventDate,
    String? location,
    String? category,
    bool isOnline = false,
    int maxParticipants = 100,
    dynamic imageFile,
  }) async {
    try {
      var request = http.MultipartRequest(
        'POST',
        Uri.parse('$baseUrl/users/$userId/events'),
      );
      request.headers['ngrok-skip-browser-warning'] = 'true';

      request.fields['title'] = title;
      request.fields['description'] = description;
      request.fields['event_date'] = eventDate.toIso8601String();
      if (location != null && location.isNotEmpty) {
        request.fields['location'] = location;
      }
      if (category != null && category.isNotEmpty) {
        request.fields['category'] = category;
      }
      request.fields['is_online'] = isOnline.toString();
      request.fields['max_participants'] = maxParticipants.toString();

      if (imageFile != null) {
        if (kIsWeb && imageFile is Uint8List) {
          request.files.add(http.MultipartFile.fromBytes(
            'image',
            imageFile,
            filename: 'event.png',
            contentType: MediaType('image', 'png'),
          ));
        } else if (imageFile is File) {
          request.files.add(await http.MultipartFile.fromPath(
            'image',
            imageFile.path,
            contentType: MediaType('image', 'png'),
          ));
        }
      }

      final response = await request.send();
      final responseBody = await response.stream.bytesToString();

      if (response.statusCode == 201 || response.statusCode == 200) {
        debugPrint('Event created successfully');
        return true;
      }
      debugPrint('Create event error: ${response.statusCode} $responseBody');
      return false;
    } catch (e) {
      debugPrint('Error creating event: $e');
      return false;
    }
  }

  Future<bool> createVacancy({
    required int userId,
    required String title,
    required String employer,
    required String description,
    String? location,
    String? salary,
    String? experience,
    String? url,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/users/$userId/vacancies'),
        headers: _headers,
        body: json.encode({
          'title': title,
          'employer': employer,
          'description': description,
          'location': location,
          'salary': salary,
          'experience': experience,
          'url': url,
        }),
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        debugPrint('Vacancy created successfully');
        return true;
      }
      debugPrint(
          'Create vacancy error: ${response.statusCode} ${response.body}');
      return false;
    } catch (e) {
      debugPrint('Error creating vacancy: $e');
      return false;
    }
  }

  Future<bool> deleteStartup(int userId, int startupId) async {
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl/users/$userId/startups/$startupId'),
        headers: _headers,
      );

      if (response.statusCode == 200) {
        debugPrint('Startup deleted successfully');
        return true;
      }
      debugPrint(
          'Delete startup error: ${response.statusCode} ${response.body}');
      return false;
    } catch (e) {
      debugPrint('Error deleting startup: $e');
      return false;
    }
  }

  Future<bool> deleteTeam(int userId, int teamId) async {
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl/users/$userId/teams/$teamId'),
        headers: _headers,
      );

      if (response.statusCode == 200) {
        debugPrint('Team deleted successfully');
        return true;
      }
      debugPrint('Delete team error: ${response.statusCode} ${response.body}');
      return false;
    } catch (e) {
      debugPrint('Error deleting team: $e');
      return false;
    }
  }

  Future<bool> deleteEvent(int userId, int eventId) async {
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl/users/$userId/events/$eventId'),
        headers: _headers,
      );

      if (response.statusCode == 200) {
        debugPrint('Event deleted successfully');
        return true;
      }
      debugPrint('Delete event error: ${response.statusCode} ${response.body}');
      return false;
    } catch (e) {
      debugPrint('Error deleting event: $e');
      return false;
    }
  }

  Future<bool> deleteVacancy(int userId, int vacancyId) async {
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl/users/$userId/vacancies/$vacancyId'),
        headers: _headers,
      );

      if (response.statusCode == 200) {
        debugPrint('Vacancy deleted successfully');
        return true;
      }
      debugPrint(
          'Delete vacancy error: ${response.statusCode} ${response.body}');
      return false;
    } catch (e) {
      debugPrint('Error deleting vacancy: $e');
      return false;
    }
  }

  // ============= CONTENT UPDATE API =============

  // Update startup
  Future<bool> updateStartup({
    required int userId,
    required int startupId,
    required String name,
    required String description,
    required String category,
    required String stage,
    String? websiteUrl,
    dynamic logoFile,
  }) async {
    try {
      var request = http.MultipartRequest(
        'PUT',
        Uri.parse('$baseUrl/users/$userId/startups/$startupId'),
      );
      request.headers['ngrok-skip-browser-warning'] = 'true';

      request.fields['name'] = name;
      request.fields['description'] = description;
      request.fields['category'] = category;
      request.fields['stage'] = stage;
      if (websiteUrl != null && websiteUrl.isNotEmpty) {
        request.fields['website_url'] = websiteUrl;
      }

      if (logoFile != null) {
        if (kIsWeb && logoFile is Uint8List) {
          request.files.add(http.MultipartFile.fromBytes(
            'logo',
            logoFile,
            filename: 'logo.png',
            contentType: MediaType('image', 'png'),
          ));
        } else if (logoFile is File) {
          request.files.add(await http.MultipartFile.fromPath(
            'logo',
            logoFile.path,
            contentType: MediaType('image', 'png'),
          ));
        }
      }

      final response = await request.send();
      final responseBody = await response.stream.bytesToString();

      if (response.statusCode == 200) {
        debugPrint('Startup updated successfully');
        return true;
      }
      debugPrint('Update startup error: ${response.statusCode} $responseBody');
      return false;
    } catch (e) {
      debugPrint('Error updating startup: $e');
      return false;
    }
  }

  Future<bool> updateTeam({
    required int userId,
    required int teamId,
    required String name,
    required String description,
    String? location,
    String? websiteUrl,
    dynamic logoFile,
  }) async {
    try {
      var request = http.MultipartRequest(
        'PUT',
        Uri.parse('$baseUrl/users/$userId/teams/$teamId'),
      );
      request.headers['ngrok-skip-browser-warning'] = 'true';

      request.fields['name'] = name;
      request.fields['description'] = description;
      if (location != null && location.isNotEmpty) {
        request.fields['location'] = location;
      }
      if (websiteUrl != null && websiteUrl.isNotEmpty) {
        request.fields['website_url'] = websiteUrl;
      }

      if (logoFile != null) {
        if (kIsWeb && logoFile is Uint8List) {
          request.files.add(http.MultipartFile.fromBytes(
            'logo',
            logoFile,
            filename: 'logo.png',
            contentType: MediaType('image', 'png'),
          ));
        } else if (logoFile is File) {
          request.files.add(await http.MultipartFile.fromPath(
            'logo',
            logoFile.path,
            contentType: MediaType('image', 'png'),
          ));
        }
      }

      final response = await request.send();
      final responseBody = await response.stream.bytesToString();

      if (response.statusCode == 200) {
        debugPrint('Team updated successfully');
        return true;
      }
      debugPrint('Update team error: ${response.statusCode} $responseBody');
      return false;
    } catch (e) {
      debugPrint('Error updating team: $e');
      return false;
    }
  }

  Future<bool> updateEvent({
    required int userId,
    required int eventId,
    required String title,
    required String description,
    required DateTime eventDate,
    String? location,
    String? category,
    bool isOnline = false,
    int maxParticipants = 100,
    dynamic imageFile,
  }) async {
    try {
      var request = http.MultipartRequest(
        'PUT',
        Uri.parse('$baseUrl/users/$userId/events/$eventId'),
      );
      request.headers['ngrok-skip-browser-warning'] = 'true';

      request.fields['title'] = title;
      request.fields['description'] = description;
      request.fields['event_date'] = eventDate.toIso8601String();
      if (location != null && location.isNotEmpty) {
        request.fields['location'] = location;
      }
      if (category != null && category.isNotEmpty) {
        request.fields['category'] = category;
      }
      request.fields['is_online'] = isOnline.toString();
      request.fields['max_participants'] = maxParticipants.toString();

      if (imageFile != null) {
        if (kIsWeb && imageFile is Uint8List) {
          request.files.add(http.MultipartFile.fromBytes(
            'image',
            imageFile,
            filename: 'event.png',
            contentType: MediaType('image', 'png'),
          ));
        } else if (imageFile is File) {
          request.files.add(await http.MultipartFile.fromPath(
            'image',
            imageFile.path,
            contentType: MediaType('image', 'png'),
          ));
        }
      }

      final response = await request.send();
      final responseBody = await response.stream.bytesToString();

      if (response.statusCode == 200) {
        debugPrint('Event updated successfully');
        return true;
      }
      debugPrint('Update event error: ${response.statusCode} $responseBody');
      return false;
    } catch (e) {
      debugPrint('Error updating event: $e');
      return false;
    }
  }

  Future<bool> updateVacancy({
    required int userId,
    required int vacancyId,
    required String title,
    required String employer,
    required String description,
    String? location,
    String? salary,
    String? experience,
    String? url,
  }) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/users/$userId/vacancies/$vacancyId'),
        headers: _headers,
        body: json.encode({
          'title': title,
          'employer': employer,
          'description': description,
          'location': location,
          'salary': salary,
          'experience': experience,
          'url': url,
        }),
      );

      if (response.statusCode == 200) {
        debugPrint('Vacancy updated successfully');
        return true;
      }
      debugPrint(
          'Update vacancy error: ${response.statusCode} ${response.body}');
      return false;
    } catch (e) {
      debugPrint('Error updating vacancy: $e');
      return false;
    }
  }

  Future<List<Startup>> getApprovedStartups() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/startups/approved'),
        headers: _headers,
      );
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((json) => Startup.fromJson(json)).toList();
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching approved startups: $e');
      return [];
    }
  }

  Future<List<Team>> getApprovedTeams() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/teams/approved'),
        headers: _headers,
      );
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((json) => Team.fromJson(json)).toList();
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching approved teams: $e');
      return [];
    }
  }

  Future<List<Event>> getApprovedEvents() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/events/approved'),
        headers: _headers,
      );
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((json) => Event.fromJson(json)).toList();
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching approved events: $e');
      return [];
    }
  }

  Future<List<Vacancy>> getApprovedVacancies() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/vacancies/approved'),
        headers: _headers,
      );
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((json) => Vacancy.fromJson(json)).toList();
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching approved vacancies: $e');
      return [];
    }
  }
}
