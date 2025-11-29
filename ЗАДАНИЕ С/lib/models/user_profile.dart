class UserProfile {
  final String id;
  final String name;
  final String email;
  final String bio;
  final String avatarUrl;
  final List<String> skills;
  final List<String> interests;
  final String role;
  final int projectsCompleted;
  final int eventsAttended;

  UserProfile({
    required this.id,
    required this.name,
    required this.email,
    required this.bio,
    required this.avatarUrl,
    required this.skills,
    required this.interests,
    required this.role,
    required this.projectsCompleted,
    required this.eventsAttended,
  });
}
