class Startup {
  final String id;
  final String name;
  final String description;
  final String category;
  final String stage;
  final List<String> teamMembers;
  final String logoUrl;
  final int fundingGoal;
  final int currentFunding;
  final DateTime createdAt;
  final int likes;
  final int comments;
  final String websiteUrl;

  Startup({
    required this.id,
    required this.name,
    required this.description,
    required this.category,
    required this.stage,
    required this.teamMembers,
    required this.logoUrl,
    required this.fundingGoal,
    required this.currentFunding,
    required this.createdAt,
    required this.likes,
    required this.comments,
    required this.websiteUrl,
  });

  factory Startup.fromJson(Map<String, dynamic> json) {
    return Startup(
      id: json['id']?.toString() ?? '',
      name: json['name'] ?? 'Unknown Startup',
      description: json['tagline'] ?? json['description'] ?? '',
      category: json['category'] ??
          (json['topics'] != null && (json['topics'] as List).isNotEmpty
              ? json['topics'][0]
              : 'Startup'),
      stage: json['stage'] ?? 'Active',
      teamMembers: [],
      // Handle both external API (thumbnail.url) and local backend (logo_url)
      logoUrl: json['logo_url'] ?? json['thumbnail']?['url'] ?? '',
      fundingGoal: 0,
      currentFunding: 0,
      createdAt: DateTime.now(),
      likes: json['votes_count'] ?? json['likes'] ?? 0,
      comments: json['comments_count'] ?? json['comments'] ?? 0,
      // Handle both external API (website/url) and local backend (website_url)
      websiteUrl: json['website_url'] ?? json['website'] ?? json['url'] ?? '',
    );
  }

  double get fundingProgress =>
      fundingGoal > 0 ? currentFunding / fundingGoal : 0;
}
