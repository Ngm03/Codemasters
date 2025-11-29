import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';

class FileUploadHelper {
  static Future<dynamic> pickImage() async {
    try {
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.image,
        allowMultiple: false,
      );

      if (result != null && result.files.single != null) {
        if (kIsWeb) {
          return result.files.single.bytes;
        } else {
          return File(result.files.single.path!);
        }
      }
      return null;
    } catch (e) {
      debugPrint('Error picking image: $e');
      return null;
    }
  }

  static String getFileName(String path) {
    return path.split('/').last;
  }

  static bool isValidFileSize(File file) {
    final bytes = file.lengthSync();
    final mb = bytes / (1024 * 1024);
    return mb <= 5;
  }
}
