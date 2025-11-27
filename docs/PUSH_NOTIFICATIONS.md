# Push Notifications Setup

This project uses **Firebase Cloud Messaging (FCM)** to deliver push notifications to both Electron (Windows/Linux/Mac) and Android clients (Capacitor).

## Prerequisites

1.  **Firebase Project**: Create a project at [console.firebase.google.com](https://console.firebase.google.com/).
2.  **Supabase Project**: Ensure you have your Supabase project ready.

## 1. Firebase Configuration

### General
1.  Go to **Project Settings** > **Cloud Messaging**.
2.  Copy your **Sender ID**.
3.  Update `src/services/pushNotificationService.ts`:
    ```typescript
    const SENDER_ID = "YOUR_ACTUAL_SENDER_ID"; // Replace this!
    ```

### Android
1.  Add an Android app in Firebase Console.
2.  Download `google-services.json`.
3.  Place it in `android/app/google-services.json`.

### Electron (Edge Function Secrets)
1.  Go to **Project Settings** > **Service Accounts**.
2.  Generate a new private key (JSON file).
3.  Flatten this JSON into a single string (remove newlines or keep them escaped).
4.  Set it as a secret for your Supabase Edge Function:
    ```bash
    npx supabase functions secrets set FCM_SERVICE_ACCOUNT='{"type":"service_account",...}'
    ```

## 2. Supabase Setup

### Database
Run the migration `supabase/migrations/20251121000001_add_device_push_tokens.sql` to create the `device_push_tokens` table.

### Edge Function
1.  Deploy the `push-notifier` function:
    ```bash
    npx supabase functions deploy push-notifier
    ```
2.  **Setup Database Webhook**:
    - Go to Supabase Dashboard > **Database** > **Webhooks**.
    - Create a new webhook:
        - **Name**: `push-notification-trigger`
        - **Table**: `notifications`
        - **Events**: `INSERT`
        - **Type**: `HTTP Request` (or `Supabase Edge Function` if available)
        - **URL**: URL of your deployed `push-notifier` function.
        - **Method**: `POST`
        - **Headers**: Add `Authorization: Bearer YOUR_ANON_KEY` (if needed, but usually Edge Functions verify the service role or use signed JWTs. The function code uses `supabase-js` with service role, but the trigger usually just sends the record).
    - *Alternative*: You can create a trigger in SQL if `pg_net` is enabled, but the Dashboard is easier.

## 3. Client Setup

### Electron
- The `main.js` and `preload.js` are already configured to use `electron-push-receiver`.
- Ensure you updated the `SENDER_ID` in `src/services/pushNotificationService.ts`.

### Android
- Ensure `@capacitor/push-notifications` is synced:
    ```bash
    npx cap sync android
    ```
- Build and run:
    ```bash
    npx cap run android
    ```

## Multiple Device Support

The push notification system supports multiple devices per user:
- **Each device** gets a unique push token when it registers
- **Each user** can have multiple tokens (one per device)
- **When a notification is sent**, it is delivered to **ALL registered devices** for that user simultaneously
- If a user logs in on a new device, the new token is added without affecting existing devices
- If a user logs out or a token becomes invalid, only that specific token is removed

### Device Token Reassignment (Multiple Users on Same Device)

**Important**: When a different user logs into the same device:
1. The device generates the **same push token** (device-specific, not user-specific)
2. The system detects that this token already exists but belongs to a different user
3. The token is **automatically reassigned** to the new user via `ON CONFLICT (token) DO UPDATE`
4. The device will now receive push notifications **only for the new user**
5. The previous user will **no longer receive notifications** on that device

**Why this behavior?**
- Ensures privacy: Previous user doesn't see new user's notifications
- Security: Device receives notifications only for the currently logged-in user
- Correctness: Push notifications go to the right person using the device

**Example Scenario:**
- Teacher A logs in on Device X → Device X receives notifications for Teacher A
- Teacher A logs out
- Teacher B logs in on Device X → Device X token is reassigned to Teacher B
- Device X now receives notifications **only for Teacher B**
- Teacher A still receives notifications on their other devices (if any)

### How It Works

1. When a user logs in on a device, the device registers its unique push token
2. The token is stored in `device_push_tokens` table with the user's ID
3. When a notification is created, the push-notifier function:
   - Finds all device tokens for the recipient user(s)
   - Sends the push notification to **all** registered devices
4. Each device receives the notification independently

### Example Scenario

If a teacher logs in on:
- Their desktop (Electron app)
- Their Android phone
- Their tablet

All three devices will receive push notifications when:
- A new announcement is posted
- A student submits a report
- A leave request is approved
- Any other notification is created for that user

## Testing
1.  Log in to the app (Electron or Android).
2.  Check console logs for `[PushService] Push registration success` or `[PushService] Electron Push Token`.
3.  Log in on multiple devices with the same account to test multiple device support.
4.  Trigger a notification (e.g., by adding a new announcement or marking attendance as a teacher).
5.  The Supabase Edge Function should fire, sending the notification to FCM, which delivers it to **all** your registered devices.
