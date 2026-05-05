# Push Notifications: Friend Online

This app can notify users about friends coming online even when the app is closed or in the background. The backend must send an Expo push notification with a structured payload so the app can route correctly when the user taps the notification.

## Required Data Payload
Include these fields in the notification `data` payload:

- `type`: string, must include "friend" and "online"
- `title`: string, notification title
- `body`: string, notification body
- `friend_id`: string or number, the friend id used by Friends Map

Optional fields are allowed (e.g., `screen`), but the app only relies on the fields above.

## Example Expo Push Request

```json
{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "title": "Friend Online",
  "body": "Alex is now online.",
  "sound": "default",
  "data": {
    "type": "friend_online",
    "title": "Friend Online",
    "body": "Alex is now online.",
    "friend_id": "12345"
  }
}
```

## Behavior When User Taps Notification

- If `type`, `title`, or `body` contains "friend" + "online" and `friend_id` is present, the app opens Friends Map and focuses the friend.
- Otherwise, it opens the Notifications screen.

## Backend Notes

- Ensure tokens are registered via `/notifications/register-push`.
- Send the push when a user's online status changes to online.
- For privacy, only notify users who are allowed to see that friend's status.
