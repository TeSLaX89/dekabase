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
    const action = body.action // 'block' | 'unblock'
    const reason = body.reason || 'violation'

    if (!isOwnerAddress(ownerAddress)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (!targetAddress || !isAddress(targetAddress)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
    }

    if (action !== 'block' && action !== 'unblock') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const addr = targetAddress.toLowerCase()

    if (action === 'block') {
      const { error } = await supabase.from('blocked_addresses').upsert({
        address: addr,
        reason,
        blocked_by: ownerAddress.toLowerCase(),
        created_at: new Date().toISOString(),
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      const { error } = await supabase
        .from('blocked_addresses')
        .delete()
        .eq('address', addr)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, action, address: addr })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}