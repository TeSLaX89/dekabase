import { NextRequest, NextResponse } from 'next/server'

const ACROSS_API_KEY = process.env.ACROSS_API_KEY
const ACROSS_INTEGRATOR_ID = process.env.ACROSS_INTEGRATOR_ID

export async function GET(req: NextRequest) {
  try {
    if (!ACROSS_API_KEY || !ACROSS_INTEGRATOR_ID) {
      return NextResponse.json(
        { error: 'Across credentials not configured' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(req.url)

    const originChainId = searchParams.get('originChainId')
    const destinationChainId = searchParams.get('destinationChainId')
    const inputToken = searchParams.get('inputToken')
    const outputToken = searchParams.get('outputToken')
    const amount = searchParams.get('amount')
    const depositor = searchParams.get('depositor')
    const tradeType = searchParams.get('tradeType') || 'exactInput'

    if (!originChainId || !destinationChainId || !inputToken || !outputToken || !amount || !depositor) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const params = new URLSearchParams({
      tradeType,
      originChainId,
      destinationChainId,
      inputToken,
      outputToken,
      amount,
      depositor,
      integratorId: ACROSS_INTEGRATOR_ID,
    })

    const res = await fetch(
      `https://app.across.to/api/swap/approval?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${ACROSS_API_KEY}`,
          Accept: 'application/json',
        },
      }
    )

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(
        { error: data.message || data.error || JSON.stringify(data) || 'Failed to get quote' },
        { status: res.status }
      )
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Across quote error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}