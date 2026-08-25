import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAddress } from 'viem'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MAX_ONCHAIN_SCORE = 100000
const MAX_SITE_SCORE = 50000

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const address = body.address
    const onchainScore = body.onchainScore !== undefined ? Number(body.onchainScore) : null
    const siteScore = body.siteScore !== undefined ? Number(body.siteScore) : null

    if (!address || !isAddress(address)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
    }

    if (onchainScore !== null && (isNaN(onchainScore) || onchainScore < 0 || onchainScore > MAX_ONCHAIN_SCORE)) {
      return NextResponse.json({ error: 'Invalid onchainScore' }, { status: 400 })
    }

    if (siteScore !== null && (isNaN(siteScore) || siteScore < 0 || siteScore > MAX_SITE_SCORE)) {
      return NextResponse.json({ error: 'Invalid siteScore' }, { status: 400 })
    }

    const addr = address.toLowerCase()

    const { data: current } = await supabase
      .from('teslax')
      .select('onchain_score, site_score')
      .eq('address', addr)
      .single()

    const finalOnchain = onchainScore !== null ? onchainScore : (current?.onchain_score || 0)
    const finalSite = siteScore !== null ? siteScore : (current?.site_score || 0)
    const totalScore = finalOnchain + finalSite

    const { error } = await supabase
      .from('teslax')
      .upsert(
        {
          address: addr,
          onchain_score: finalOnchain,
          site_score: finalSite,
          score: totalScore,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'address' }
      )

    if (error) {
      console.error(error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}