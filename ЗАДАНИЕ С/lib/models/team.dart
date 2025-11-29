class Team {
  final String id;
  final String name;
  final String description;
  final List<TeamMember> members;
  final String projectName;
  final String imageUrl;
  final List<String> skills;
  final String location;
  final String websiteUrl;

  Team({
    required this.id,
    required this.name,
    required this.description,
    required this.members,
    required this.projectName,
    required this.imageUrl,
    required this.skills,
    required this.location,
    required this.websiteUrl,
  });

  factory Team.fromJson(Map<String, dynamic> json) {
    String imageUrl = '';
    try {
      if (json['pagemap'] != null && json['pagemap'] is Map) {
        final pagemap = json['pagemap'] as Map<String, dynamic>;
        if (pagemap['cse_image'] != null &&
            (pagemap['cse_image'] as List).isNotEmpty) {
          imageUrl = pagemap['cse_image'][0]['src']?.toString() ?? '';
        }
      }
    } catch (e) {
      // Keep empty image on error
    }

    return Team(
      id: json['id']?.toString() ??
          json['position']?.toString() ??
          DateTime.now().millisecondsSinceEpoch.toString(),
      name: json['name'] ?? json['title']?.toString() ?? 'Unknown Team',
      description: json['description'] ?? json['snippet']?.toString() ?? '',
      members: [],
      projectName: json['name'] ?? json['title']?.toString() ?? '',
      // Handle local backend logo_url or external API image
      imageUrl: json['logo_url'] ?? imageUrl,
      skills: [],
      location: json['location'] ?? 'Kazakhstan',
      // Handle local backend website_url or external API link
      websiteUrl: json['website_url'] ??
          json['link'] ??
          json['formattedUrl'] ??
          json['url'] ??
          '',
    );
  }
}

class TeamMember {
  final String id;
  final String name;
  final String role;
  final String avatarUrl;

  TeamMember({
    required this.id,
    required this.name,
    required this.role,
    required this.avatarUrl,
  });
}
