import 'dart:convert';
import 'package:aqmola_start/services/api_service.dart';
import 'package:aqmola_start/models/user.dart';

class AdminService {
  final ApiService _apiService = ApiService();

  Future<List<User>> getUsers() async {
    final response = await _apiService.get('/admin/users');

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((json) => User.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load users');
    }
  }

  Future<void> deleteUser(int userId) async {
    final response = await _apiService.delete('/admin/users/$userId');

    if (response.statusCode != 200) {
      throw Exception('Failed to delete user');
    }
  }

  Future<List<dynamic>> getPendingContent(String type) async {
    final response = await _apiService.get('/admin/pending/$type');

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load pending content');
    }
  }

  Future<void> approveContent(String type, int id) async {
    final response = await _apiService.post('/admin/approve/$type/$id', {});

    if (response.statusCode != 200) {
      throw Exception('Failed to approve content');
    }
  }

  Future<void> rejectContent(String type, int id) async {
    final response = await _apiService.post('/admin/reject/$type/$id', {});

    if (response.statusCode != 200) {
      throw Exception('Failed to reject content');
    }
  }
}
