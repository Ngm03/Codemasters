import 'package:flutter/material.dart';

class Event {
  final String id;
  final String title;
  final String description;
  final DateTime dateTime;
  final String location;
  final String imageUrl;
  final int maxParticipants;
  final int currentParticipants;
  final String category;
  final bool isOnline;
  final String url;

  Event({
    required this.id,
    required this.title,
    required this.description,
    required this.dateTime,
    required this.location,
    required this.imageUrl,
    required this.maxParticipants,
    required this.currentParticipants,
    required this.category,
    required this.isOnline,
    this.url = '',
  });

  factory Event.fromJson(Map<String, dynamic> json) {
    debugPrint('Event JSON: $json');
    return Event(
      id: json['id']?.toString() ??
          json['position']?.toString() ??
          DateTime.now().millisecondsSinceEpoch.toString(),
      title: json['name'] ?? json['title']?.toString() ?? 'Unknown Event',
      description: json['description'] ?? json['snippet']?.toString() ?? '',
      // Handle local backend event_date
      dateTime: json['event_date'] != null
          ? DateTime.parse(json['event_date'])
          : DateTime.now(),
      location:
          json['location'] ?? json['displayed_link']?.toString() ?? 'Online',
      // Handle local backend image_url
      imageUrl: json['image_url'] ??
          json['image'] ??
          json['imageUrl'] ??
          json['photo'] ??
          json['thumbnail'] ??
          '',
      // Handle local backend max_participants
      maxParticipants: json['max_participants'] ?? 100,
      currentParticipants: 0,
      // Handle local backend category
      category: json['category'] ?? 'Event',
      // Handle local backend is_online (might be int 0/1 or bool)
      isOnline: json['is_online'] == 1 || json['is_online'] == true,
      url: json['link'] ?? json['url'] ?? json['website'] ?? '',
    );
  }

  bool get isFull => currentParticipants >= maxParticipants;
  int get spotsLeft => maxParticipants - currentParticipants;
}
