import 'package:flutter/material.dart';

class Vacancy {
  final String id;
  final String title;
  final String employer;
  final String salary;
  final String url;
  final String location;
  final String description;

  Vacancy({
    required this.id,
    required this.title,
    required this.employer,
    required this.salary,
    required this.url,
    required this.location,
    required this.description,
  });

  factory Vacancy.fromJson(Map<String, dynamic> json) {
    debugPrint('Vacancy JSON: $json');

    String salaryText = 'По договоренности';

    if (json['salary'] != null) {
      if (json['salary'] is String) {
        salaryText = json['salary'];
      } else if (json['salary'] is Map) {
        try {
          final salaryMap = json['salary'] as Map<String, dynamic>;
          final from = salaryMap['from'];
          final to = salaryMap['to'];
          final currency = salaryMap['currency']?.toString() ?? '';

          bool isFromValid =
              from != null && from.toString().isNotEmpty && from != 0;
          bool isToValid = to != null && to.toString().isNotEmpty && to != 0;

          if (isFromValid && isToValid) {
            salaryText = '$from - $to $currency';
          } else if (isFromValid) {
            salaryText = 'от $from $currency';
          } else if (isToValid) {
            salaryText = 'до $to $currency';
          }
        } catch (e) {
          debugPrint('Error parsing salary: $e');
        }
      }
    }

    String location = 'Unknown';
    if (json['location'] != null && json['location'] is String) {
      location = json['location'];
    } else if (json['city'] != null) {
      location = json['city'].toString();
    } else if (json['area'] != null) {
      if (json['area'] is String) {
        location = json['area'];
      } else if (json['area'] is Map) {
        location = json['area']['name']?.toString() ?? 'Unknown';
      }
    }

    // Parse experience (can be String or Map)
    String experience = '';
    if (json['experience'] != null) {
      if (json['experience'] is String) {
        experience = json['experience'];
      } else if (json['experience'] is Map) {
        experience = json['experience']['name']?.toString() ?? '';
      }
    }

    // Combine location and experience
    if (location != 'Unknown' && experience.isNotEmpty) {
      location = '$location • $experience';
    } else if (experience.isNotEmpty) {
      location = experience;
    }

    final url =
        json['url']?.toString() ?? json['alternate_url']?.toString() ?? '';

    debugPrint(
      'Parsed Vacancy: Location: $location, Salary: $salaryText, URL: $url',
    );

    // Parse employer (check 'company' first, then 'employer')
    String employerName = '';
    if (json['employer'] != null && json['employer'] is String) {
      employerName = json['employer'];
    } else if (json['company'] != null) {
      employerName = json['company'].toString();
    } else if (json['employer'] != null) {
      if (json['employer'] is Map) {
        employerName = json['employer']['name']?.toString() ?? '';
      }
    }

    // Parse description and remove HTML tags
    String description = json['description']?.toString() ?? '';
    if (description.isEmpty && json['snippet'] != null) {
      description =
          '${json['snippet']['requirement']?.toString() ?? ''}\n${json['snippet']['responsibility']?.toString() ?? ''}';
    }

    // Remove <highlighttext> and other tags
    description = description.replaceAll(RegExp(r'<[^>]*>'), '');

    return Vacancy(
      id: json['id']?.toString() ?? '',
      title: json['name'] ?? json['role'] ?? json['title'] ?? 'Unknown Vacancy',
      employer: employerName.isNotEmpty ? employerName : 'Unknown Company',
      salary: salaryText,
      url: url,
      location: location,
      description: description,
    );
  }
}
