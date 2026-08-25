import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isOwnerAddress } from '@/lib/owner'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { address, page = 1, limit = 20, search } = await req.json()

    if (!isOwnerAddress(address)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
      .from('activity_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (search && typeof search === 'string' && search.length >= 3) {
      query = query.ilike('address', `%${search.toLowerCase()}%`)
    }

    const { data, count, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      limit,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}