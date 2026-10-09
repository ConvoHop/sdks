import 'package:convohop/convohop.dart';

final class FakeMediaRoom implements LiveMediaRoom {
  FakeMediaRoom({this.sid = '77777777-7777-4777-8777-777777777777'});

  final String? sid;
  final List<String> tokens = <String>[];
  int disconnects = 0;
  bool microphone = false;
  bool camera = false;

  @override
  Future<void> connect(String url, String token) async {
    tokens.add(token);
  }

  @override
  String? get localParticipantSid => sid;

  @override
  Future<void> setCameraEnabled(bool enabled) async {
    camera = enabled;
  }

  @override
  Future<void> setMicrophoneEnabled(bool enabled) async {
    microphone = enabled;
  }

  @override
  Future<void> disconnect() async {
    disconnects += 1;
  }
}
