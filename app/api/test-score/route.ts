import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const address = '0xa4200f9f5818cba01b8df0e57038a5646ad46af0'

  const { data: existing } = await supabase
    .from('teslax')
    .select('onchain_score, site_score')
    .eq('address', address)
    .single()

  const onchainScore = existing?.onchain_score || 0
  const siteScore = (existing?.site_score || 0) + 8
  const totalScore = onchainScore + siteScore

  const { error: e1 } = await supabase.from('teslax').upsert(
    {
      address,
      onchain_score: onchainScore,
      site_score: siteScore,
      score: totalScore,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'address' }
  )

  const { error: e2 } = await supabase.from('activity_log').insert({
    address,
    action: 'swap',
    points: 8,
    tx_hash: '0xtest123',
  })

  return NextResponse.json({
    success: !e1 && !e2,
    e1: e1?.message || null,
    e2: e2?.message || null,
    siteScore,
    totalScore,
  })
}