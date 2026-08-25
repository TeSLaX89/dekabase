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
    const siteScore = Number(body.siteScore)
    const reason = body.reason || 'owner_adjust'

    if (!isOwnerAddress(ownerAddress)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (!targetAddress || !isAddress(targetAddress)) {
      return NextResponse.json({ error: 'Invalid target address' }, { status: 400 })
    }

    if (isNaN(siteScore) || siteScore < 0 || siteScore > 100000) {
      return NextResponse.json({ error: 'Invalid siteScore' }, { status: 400 })
    }

    const addr = targetAddress.toLowerCase()

    const { data: existing } = await supabase
      .from('teslax')
      .select('onchain_score, site_score')
      .eq('address', addr)
      .single()

    const onchainScore = existing?.onchain_score || 0
    const totalScore = onchainScore + siteScore

    const { error: upsertError } = await supabase
      .from('teslax')
      .upsert(
        {
          address: addr,
          onchain_score: onchainScore,
          site_score: siteScore,
          score: totalScore,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'address' }
      )

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    await supabase.from('activity_log').insert({
      address: addr,
      action: reason,
      points: siteScore - (existing?.site_score || 0),
      tx_hash: null,
    })

    return NextResponse.json({
      success: true,
      siteScore,
      totalScore,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}