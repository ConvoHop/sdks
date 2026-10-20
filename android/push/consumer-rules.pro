# Firebase Cloud Messaging is optional: apps that do not use FCM do not ship it,
# and R8 removes RelayFirebase and RelayMessagingService.
-dontwarn com.google.firebase.messaging.**
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.tasks.**
