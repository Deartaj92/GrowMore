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

## Testing
1.  Log in to the app (Electron or Android).
2.  Check console logs for `[PushService] Push registration success` or `[PushService] Electron Push Token`.
3.  Trigger a notification (e.g., by adding a new announcement or marking attendance as a teacher).
4.  The Supabase Edge Function should fire, sending the notification to FCM, which delivers it to your device.
