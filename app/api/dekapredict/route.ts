import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch(
      'https://api.limitless.exchange/markets/active?limit=25',
      {
        next: { revalidate: 30 },
      }
    )

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch markets' },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}