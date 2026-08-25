import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isOwnerAddress } from '@/lib/owner'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json()

    if (!isOwnerAddress(address)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { count: totalUsers } = await supabase
      .from('teslax')
      .select('*', { count: 'exact', head: true })

    const { count: totalActivities } = await supabase
      .from('activity_log')
      .select('*', { count: 'exact', head: true })

    const { data: scoreData } = await supabase
      .from('teslax')
      .select('score, site_score, onchain_score')

    const totalScore = scoreData?.reduce((s, r) => s + (r.score || 0), 0) || 0
    const totalSiteScore = scoreData?.reduce((s, r) => s + (r.site_score || 0), 0) || 0
    const totalOnchainScore = scoreData?.reduce((s, r) => s + (r.onchain_score || 0), 0) || 0

    const { data: actionStats } = await supabase
      .from('activity_log')
      .select('action')

    const actionCounts: Record<string, number> = {}
    actionStats?.forEach((row) => {
      actionCounts[row.action] = (actionCounts[row.action] || 0) + 1
    })

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      totalActivities: totalActivities || 0,
      totalScore,
      totalSiteScore,
      totalOnchainScore,
      actionCounts,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}