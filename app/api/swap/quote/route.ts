import { NextRequest, NextResponse } from 'next/server'

const ZEROX_API_KEY = process.env.ZEROX_API_KEY || '3331ae15-da39-4865-a3c2-59a59d39d9d1'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  try {
    const params = new URLSearchParams()
    searchParams.forEach((value, key) => {
      params.append(key, value)
    })

    const res = await fetch(`https://api.0x.org/swap/allowance-holder/quote?${params.toString()}`, {
      headers: {
        '0x-api-key': ZEROX_API_KEY,
        '0x-version': 'v2',
      },
    })

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Quote failed' }, { status: 500 })
  }
}