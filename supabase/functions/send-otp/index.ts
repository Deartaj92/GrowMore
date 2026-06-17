import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { action, target_id, admin_id } = await req.json()

    if (!action || !target_id || !admin_id) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let adminEmail = ''
    const { data: superAdmin } = await supabase.from('super_admins').select('email').eq('id', admin_id).maybeSingle()
    if (superAdmin) {
      adminEmail = superAdmin.email
    } else {
      const { data: userAdmin } = await supabase.from('users').select('email').eq('id', admin_id).maybeSingle()
      if (userAdmin) {
        adminEmail = userAdmin.email
      }
    }

    if (!adminEmail) {
      return new Response(JSON.stringify({ error: 'Admin email not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Generate a 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()

    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 10)

    const { error: dbError } = await supabase.from('otp_verifications').insert({
      admin_id,
      otp_code: otpCode,
      action,
      target_id,
      expires_at: expiresAt.toISOString(),
      used: false
    })

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`)
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'GrowMore Admin <onboarding@resend.dev>',
        to: adminEmail,
        subject: 'Your OTP Code for GrowMore Admin',
        html: `<p>You requested to delete a school.</p><p>Your verification code is: <strong>${otpCode}</strong></p><p>This code expires in 10 minutes.</p>`
      })
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Resend error: ${text}`)
    }

    return new Response(JSON.stringify({ success: true, message: 'OTP sent successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
