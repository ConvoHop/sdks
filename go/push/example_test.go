package push_test

import (
	"fmt"
	"time"

	"github.com/ConvoHop/sdks/go/push"
	"github.com/ConvoHop/sdks/go/webhooks"
)

// The clock makes the examples reproducible. Omit WithClock to use time.Now.
var exampleClock = push.WithClock(func() time.Time { return time.Date(2026, 10, 10, 12, 0, 0, 0, time.UTC) })

func ExampleAPNSAlert() {
	// A notification.message event, as webhooks.Verify returns it.
	event := &webhooks.Notification{
		EventID:        "cccbe606-6dbd-41bb-ad43-c30e0b6b89ad",
		EventType:      webhooks.EventNotificationMessage,
		OccurredAt:     "2026-10-10T11:59:55Z",
		ProjectID:      "8d3f6a2c-1b4e-4f7a-9c0d-5e6f7a8b9c0d",
		SubjectRef:     webhooks.SubjectRef{ID: "d9b3f7e5-2c8a-4d1f-8e6b-3a2c1b0f9e8d", Kind: "message"},
		RecipientID:    "b7e2c9d4-3a1f-4e8b-a6c5-0d9f8e7a6b5c",
		ConversationID: "6f1c2a7e-0b8d-4e5f-9a3c-2d1e0f9b8a7c",
		SenderID:       "c4a8e1f2-7d3b-4c9e-b2a1-6f5e4d3c2b1a",
		MessageID:      "d9b3f7e5-2c8a-4d1f-8e6b-3a2c1b0f9e8d",
		Preview:        &webhooks.Preview{Text: "See you at 3?"},
	}
	request, err := push.APNSAlert(event, "com.example.chat", push.WithTitle("Grace Hopper"), exampleClock)
	if err != nil {
		fmt.Println(err)
		return
	}
	if request == nil {
		fmt.Println("Nothing to send: the event doesn't apply or is stale.")
		return
	}
	// Send the headers and payload, as they are, to /3/device/<token>.
	fmt.Println(request.Headers.PushType, request.Headers.Topic, request.Headers.Expiration)
	fmt.Println(string(request.Payload))
	// Output:
	// alert com.example.chat 1791719995
	// {"aps":{"alert":{"title":"Grace Hopper","body":"See you at 3?"},"sound":"default","mutable-content":1,"thread-id":"6f1c2a7e-0b8d-4e5f-9a3c-2d1e0f9b8a7c"},"convohop":{"eventId":"cccbe606-6dbd-41bb-ad43-c30e0b6b89ad","eventType":"notification.message","occurredAt":"2026-10-10T11:59:55Z","projectId":"8d3f6a2c-1b4e-4f7a-9c0d-5e6f7a8b9c0d","recipientId":"b7e2c9d4-3a1f-4e8b-a6c5-0d9f8e7a6b5c","conversationId":"6f1c2a7e-0b8d-4e5f-9a3c-2d1e0f9b8a7c","senderId":"c4a8e1f2-7d3b-4c9e-b2a1-6f5e4d3c2b1a","messageId":"d9b3f7e5-2c8a-4d1f-8e6b-3a2c1b0f9e8d"}}
}

func ExampleFCM() {
	// A notification.call event: one ring, until expiresAt.
	event := &webhooks.Notification{
		EventID:        "daff1b70-80d5-4f01-9a3b-e7775b5d70ab",
		EventType:      webhooks.EventNotificationCall,
		OccurredAt:     "2026-10-10T11:59:58Z",
		ProjectID:      "8d3f6a2c-1b4e-4f7a-9c0d-5e6f7a8b9c0d",
		SubjectRef:     webhooks.SubjectRef{ID: "e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b", Kind: "liveSession"},
		RecipientID:    "b7e2c9d4-3a1f-4e8b-a6c5-0d9f8e7a6b5c",
		ConversationID: "6f1c2a7e-0b8d-4e5f-9a3c-2d1e0f9b8a7c",
		SenderID:       "c4a8e1f2-7d3b-4c9e-b2a1-6f5e4d3c2b1a",
		LiveSessionID:  "e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b",
		AlertID:        "f0e1d2c3-b4a5-4968-8776-655443322110",
		ExpiresAt:      "2026-10-10T12:00:45Z",
		MediaProfile:   webhooks.MediaProfileAudioVideo,
	}
	request, err := push.FCM(event, push.WithTitle("Grace Hopper"), exampleClock)
	if err != nil {
		fmt.Println(err)
		return
	}
	if request == nil {
		fmt.Println("Nothing to send: the ring has ended.")
		return
	}
	// Add the target, such as the registration token, before you send it.
	android := request.Message.Android
	fmt.Println(android.Priority, android.TTL, android.CollapseKey)
	fmt.Println(request.Message.Data["convohop"])
	// Output:
	// HIGH 45s f0e1d2c3b4a549688776655443322110
	// {"eventId":"daff1b70-80d5-4f01-9a3b-e7775b5d70ab","eventType":"notification.call","occurredAt":"2026-10-10T11:59:58Z","projectId":"8d3f6a2c-1b4e-4f7a-9c0d-5e6f7a8b9c0d","recipientId":"b7e2c9d4-3a1f-4e8b-a6c5-0d9f8e7a6b5c","conversationId":"6f1c2a7e-0b8d-4e5f-9a3c-2d1e0f9b8a7c","senderId":"c4a8e1f2-7d3b-4c9e-b2a1-6f5e4d3c2b1a","liveSessionId":"e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b","alertId":"f0e1d2c3-b4a5-4968-8776-655443322110","expiresAt":"2026-10-10T12:00:45Z","mediaProfile":"AUDIO_VIDEO","title":"Grace Hopper"}
}

// A CallKit app gets incoming calls as VoIP pushes, and every other
// notification as an alert.
func ExampleAPNSVoIP() {
	// A notification.call event, as webhooks.Verify returns it.
	event := &webhooks.Notification{
		EventID:        "daff1b70-80d5-4f01-9a3b-e7775b5d70ab",
		EventType:      webhooks.EventNotificationCall,
		OccurredAt:     "2026-10-10T11:59:58Z",
		ProjectID:      "8d3f6a2c-1b4e-4f7a-9c0d-5e6f7a8b9c0d",
		SubjectRef:     webhooks.SubjectRef{ID: "e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b", Kind: "liveSession"},
		RecipientID:    "b7e2c9d4-3a1f-4e8b-a6c5-0d9f8e7a6b5c",
		ConversationID: "6f1c2a7e-0b8d-4e5f-9a3c-2d1e0f9b8a7c",
		SenderID:       "c4a8e1f2-7d3b-4c9e-b2a1-6f5e4d3c2b1a",
		LiveSessionID:  "e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b",
		AlertID:        "f0e1d2c3-b4a5-4968-8776-655443322110",
		ExpiresAt:      "2026-10-10T12:00:45Z",
		MediaProfile:   webhooks.MediaProfileAudioVideo,
	}
	title := push.WithTitle("Grace Hopper")
	request, err := push.APNSVoIP(event, "com.example.chat", title, exampleClock)
	if err == nil && request == nil {
		request, err = push.APNSAlert(event, "com.example.chat", title, exampleClock)
	}
	if err != nil {
		fmt.Println(err)
		return
	}
	if request == nil {
		fmt.Println("Nothing to send: the event doesn't apply or is stale.")
		return
	}
	// Report the call to CallKit as soon as the VoIP push arrives.
	fmt.Println(request.Headers.PushType, request.Headers.Topic, request.Headers.Expiration)
	// Output:
	// voip com.example.chat.voip 1791633645
}
