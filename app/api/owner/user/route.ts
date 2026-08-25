import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAddress } from 'viem'
import { isOwnerAddress } from '@/lib/owner'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const ownerAddress = body.ownerAddress
    const targetAddress = body.targetAddress

    if (!isOwnerAddress(ownerAddress)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (!targetAddress || !isAddress(targetAddress)) {
      return NextResponse.json({ error: 'Invalid target address' }, { status: 400 })
    }

    const addr = targetAddress.toLowerCase()

    const { data: user } = await supabase
      .from('teslax')
      .select('*')
      .eq('address', addr)
      .single()

    const { data: activities } = await supabase
      .from('activity_log')
      .select('*')
      .eq('address', addr)
      .order('created_at', { ascending: false })
      .limit(30)

    return NextResponse.json({
      user: user || null,
      activities: activities || [],
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}