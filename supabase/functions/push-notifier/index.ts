// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import * as jose from "https://deno.land/x/jose@v4.13.1/index.ts";

console.log("Push Notifier Function Started");

interface NotificationPayload {
  type?: "INSERT";
  table?: "notifications";
  record: {
    id: number;
    recipient_id?: number | null;
    family_recipient_id?: number | null;
    school_id: number;
    title: string;
    message: string;
    notification_type: string;
    created_at: string;
  };
  schema?: "public";
}

// Utility: strip HTML tags and nbsp, and collapse whitespace so push text is clean
function getPlainText(value?: string | null): string {
  if (!value) return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// FCM Access Token Generation (Simplified for Edge Runtime)
// In a real production setup, you might use the firebase-admin SDK if compatible with Deno,
// or manually sign the JWT to get an access token from Google Auth.
// For now, we'll assume we use the legacy server key or the HTTP v1 API with a manually constructed JWT.
// BETTER APPROACH for Deno: Use a Service Account JSON to sign a JWT and call FCM REST API directly.

async function getAccessToken({
  clientEmail,
  privateKey,
}: {
  clientEmail: string;
  privateKey: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  // PKCS#8 Private Key parsing is complex in Deno without specialized libs or subtle crypto.
  // However, 'jose' library handles it well.
  const pk = await jose.importPKCS8(privateKey, "RS256");
  const jwt = await new jose.SignJWT(claim)
    .setProtectedHeader({ alg: "RS256" })
    .sign(pk);

  const params = new URLSearchParams();
  params.append("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
  params.append("assertion", jwt);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  const data = await res.json();
  return data.access_token;
}

serve(async (req) => {
  try {
    const payload = (await req.json()) as NotificationPayload;
    const record = payload.record || payload as any;
    
    // 1. Initialize Supabase Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Determine recipient user IDs
    let recipientUserIds: number[] = [];
    
    // If recipient_id is set, use it directly
    if (record.recipient_id) {
      recipientUserIds.push(record.recipient_id);
    }
    
    // If family_recipient_id is set, find all users/staff/students linked to that family
    if (record.family_recipient_id) {
      // First, try to find users with family_id
      const { data: familyUsers, error: familyError } = await supabase
        .from("users")
        .select("id")
        .eq("family_id", record.family_recipient_id);
      
      if (!familyError && familyUsers) {
        recipientUserIds.push(...familyUsers.map(u => u.id));
      }
      
      // Also find family_members and get their associated staff/student IDs
      const { data: familyMembers, error: membersError } = await supabase
        .from("family_members")
        .select("staff_id, student_id")
        .eq("family_id", record.family_recipient_id);
      
      if (!membersError && familyMembers) {
        // Add staff IDs
        const staffIds = familyMembers
          .filter(m => m.staff_id)
          .map(m => m.staff_id);
        recipientUserIds.push(...staffIds);
        
        // Add student IDs
        const studentIds = familyMembers
          .filter(m => m.student_id)
          .map(m => m.student_id);
        recipientUserIds.push(...studentIds);
      }
    }

    if (recipientUserIds.length === 0) {
      console.log(`No recipient found for notification ${record.id}`);
      return new Response(JSON.stringify({ message: "No recipients found" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Remove duplicates
    recipientUserIds = [...new Set(recipientUserIds)];

    // 3. Check User Preferences and Fetch Device Tokens for all recipients
    const allTokens: Array<{ token: string; platform: string; user_id: number }> = [];
    
    for (const userId of recipientUserIds) {
      // Check user preferences
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("push_notifications")
        .eq("user_id", userId)
        .eq("school_id", record.school_id)
        .single();

      // If preferences exist and push is disabled, skip this user
      if (prefs && !prefs.push_notifications) {
        console.log(`Push disabled for user ${userId}`);
        continue;
      }

      // Fetch device tokens for this user
      const { data: tokens } = await supabase
        .from("device_push_tokens")
        .select("token, platform")
        .eq("user_id", userId)
        .eq("school_id", record.school_id);

      if (tokens && tokens.length > 0) {
        allTokens.push(...tokens.map(t => ({ ...t, user_id: userId })));
      }
    }

    if (allTokens.length === 0) {
      console.log(`No tokens found for recipients`);
      return new Response(JSON.stringify({ message: "No devices registered" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. Prepare FCM Connection
    // We expect the service account JSON to be flattened into env vars or stored as a single JSON string secret
    const serviceAccountStr = Deno.env.get("FCM_SERVICE_ACCOUNT");
    if (!serviceAccountStr) {
      throw new Error("Missing FCM_SERVICE_ACCOUNT secret");
    }
    const serviceAccount = JSON.parse(serviceAccountStr);
    const projectId = serviceAccount.project_id;

    const accessToken = await getAccessToken({
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key,
    });

    // 5. Send Notifications to ALL devices for each user
    // This ensures that if a user is logged in on multiple devices, they receive
    // the push notification on all their registered devices simultaneously
    const results = await Promise.all(
      allTokens.map(async (t) => {
        // Clean HTML from the title and message so push notifications show plain text
        const plainTitle = getPlainText(record.title) || record.title;
        const plainBody = getPlainText(record.message) || record.message;

        const message = {
          message: {
            token: t.token,
            notification: {
              title: plainTitle,
              body: plainBody,
            },
            data: {
              notification_id: String(record.id),
              school_id: String(record.school_id),
              type: record.notification_type,
            },
          },
        };

        const fcmRes = await fetch(
          `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(message),
          }
        );

        const json = await fcmRes.json();
        
        // Handle invalid tokens (cleanup)
        if (json.error && (json.error.status === "UNREGISTERED" || json.error.code === 404)) {
             await supabase
            .from("device_push_tokens")
            .delete()
            .eq("token", t.token);
        }

        return json;
      })
    );

    return new Response(JSON.stringify({ results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
