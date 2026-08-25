import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAddress } from 'viem'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ALLOWED_ACTIONS = [
  'gm',
  'deploy',
  'swap',
  'bridge_base_ethereum',
  'bridge_base_arbitrum',
  'bridge_base_optimism',
  'bridge_base_polygon',
  'bridge_base_ink',
  'bridge_ethereum_base',
  'bridge_arbitrum_base',
  'bridge_optimism_base',
  'bridge_polygon_base',
  'bridge_ink_base',
]

const MAX_POINTS = 20
const RATE_LIMIT_SECONDS = 45

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const address = body.address
    const points = Number(body.points)
    const action = body.action
    const txHash = body.txHash

    if (!address || !isAddress(address)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
    }

    if (!action || typeof action !== 'string' || !ALLOWED_ACTIONS.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    if (!points || isNaN(points) || points <= 0 || points > MAX_POINTS) {
      return NextResponse.json({ error: 'Invalid points' }, { status: 400 })
    }

    if (txHash && (typeof txHash !== 'string' || !/^0x[a-fA-F0-9]{64}$/.test(txHash))) {
      return NextResponse.json({ error: 'Invalid txHash' }, { status: 400 })
    }

    const addr = address.toLowerCase()

    const { data: blocked } = await supabase
      .from('blocked_addresses')
      .select('address')
      .eq('address', addr)
      .maybeSingle()

    if (blocked) {
      return NextResponse.json({ error: 'Address blocked' }, { status: 403 })
    }

    const since = new Date(Date.now() - RATE_LIMIT_SECONDS * 1000).toISOString()

    const { data: recent } = await supabase
      .from('activity_log')
      .select('id')
      .eq('address', addr)
      .eq('action', action)
      .gte('created_at', since)
      .limit(1)

    if (recent && recent.length > 0) {
      return NextResponse.json(
        { error: 'Please wait before repeating this action' },
        { status: 429 }
      )
    }

    const { data: existing } = await supabase
      .from('teslax')
      .select('onchain_score, site_score')
      .eq('address', addr)
      .single()

    const onchainScore = existing?.onchain_score || 0
    const siteScore = (existing?.site_score || 0) + points
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
      console.error(upsertError)
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    const { error: logError } = await supabase
      .from('activity_log')
      .insert({
        address: addr,
        action,
        points,
        tx_hash: txHash || null,
      })

    if (logError) {
      console.error(logError)
    }

    return NextResponse.json({ success: true, siteScore, totalScore })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}