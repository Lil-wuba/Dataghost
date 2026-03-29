// app/api/audit/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // needs service role to write audit logs server-side
)

export async function POST(req) {
  try {
    const { user_id, action, entity_type, entity_id, old_data, new_data } = await req.json()
    if (!user_id || !action) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const forwarded = req.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
    const ua = req.headers.get('user-agent') || 'unknown'

    const { error } = await supabase.from('audit_logs').insert([{
      user_id, action, entity_type, entity_id,
      old_data: old_data || null,
      new_data: new_data || null,
      ip_address: ip,
      user_agent: ua,
    }])

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}