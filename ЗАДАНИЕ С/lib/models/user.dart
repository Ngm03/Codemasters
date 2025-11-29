enum UserRole {
  developer,
  founder,
  investor,
  hr,
  student,
  mentor,
  other;

  String get displayName {
    switch (this) {
      case UserRole.developer:
        return 'Разработчик';
      case UserRole.founder:
        return 'Стартапер';
      case UserRole.investor:
        return 'Инвестор';
      case UserRole.hr:
        return 'HR менеджер';
      case UserRole.student:
        return 'Студент';
      case UserRole.mentor:
        return 'Ментор';
      case UserRole.other:
        return 'Другое';
    }
  }

  static UserRole fromString(String? value) {
    if (value == null) return UserRole.other;
    try {
      return UserRole.values.firstWhere((e) => e.name == value);
    } catch (e) {
      return UserRole.other;
    }
  }
}

class User {
  final int id;
  final String name;
  final String email;
  final String? createdAt;
  final String? resumePath;
  final List<String> portfolioLinks;
  final UserRole role;
  final String? bio;
  final String? company;
  final String? position;
  final String? avatarUrl;
  final bool isAdmin;

  User({
    required this.id,
    required this.name,
    required this.email,
    this.createdAt,
    this.resumePath,
    this.portfolioLinks = const [],
    this.role = UserRole.other,
    this.bio,
    this.company,
    this.position,
    this.avatarUrl,
    this.isAdmin = false,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      createdAt: json['created_at'],
      resumePath: json['resume_path'],
      portfolioLinks: json['portfolio_links'] != null
          ? List<String>.from(json['portfolio_links'])
          : [],
      role: UserRole.fromString(json['user_role']),
      bio: json['bio'],
      company: json['company'],
      position: json['position'],
      avatarUrl: json['avatar_url'],
      isAdmin: json['is_admin'] == 1 || json['is_admin'] == true,
    );
  }
}
