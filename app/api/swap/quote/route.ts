import { NextRequest, NextResponse } from 'next/server'

const ZEROX_API_KEY = process.env.ZEROX_API_KEY
const CHAIN_ID = '8453'
const FEE_RECIPIENT = '0xA4200F9F5818cbA01B8dF0e57038A5646ad46AF0'
const FEE_BPS = '25'
const USDT = '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2'

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/
const AMOUNT_RE = /^[0-9]+$/
const BPS_RE = /^[0-9]{1,4}$/

function isAddress(value: string | null): value is string {
  return !!value && ADDRESS_RE.test(value)
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

async function fetch0x(kind: 'quote' | 'price', params: URLSearchParams) {
  const res = await fetch(
    `https://api.0x.org/swap/allowance-holder/${kind}?${params.toString()}`,
    {
      headers: {
        '0x-api-key': ZEROX_API_KEY as string,
        '0x-version': 'v2',
      },
      cache: 'no-store',
    }
  )

  const data = await res.json().catch(() => null)
  return { ok: res.ok, data }
}

export async function GET(req: NextRequest) {
  if (!ZEROX_API_KEY) {
    return jsonError('Quote service unavailable', 500)
  }

  const src = req.nextUrl.searchParams
  const sellToken = src.get('sellToken')
  const buyToken = src.get('buyToken')
  const sellAmount = src.get('sellAmount')
  const taker = src.get('taker')
  const slippageBps = src.get('slippageBps') ?? '50'

  if (!isAddress(sellToken) || !isAddress(buyToken) || !isAddress(taker)) {
    return jsonError('Invalid token or taker')
  }

  if (!sellAmount || !AMOUNT_RE.test(sellAmount)) {
    return jsonError('Invalid sell amount')
  }

  if (!BPS_RE.test(slippageBps) || Number(slippageBps) > 5000) {
    return jsonError('Invalid slippage')
  }

  if (sellToken.toLowerCase() === buyToken.toLowerCase()) {
    return jsonError('Select two different tokens')
  }

  const params = new URLSearchParams({
    chainId: CHAIN_ID,
    sellToken,
    buyToken,
    sellAmount,
    taker,
    slippageBps,
  })

  const involvesUsdt =
    sellToken.toLowerCase() === USDT || buyToken.toLowerCase() === USDT

  if (!involvesUsdt) {
    params.set('swapFeeRecipient', FEE_RECIPIENT)
    params.set('swapFeeBps', FEE_BPS)
    params.set('swapFeeToken', sellToken)
  }

  try {
    const quote = await fetch0x('quote', params)
    if (quote.data?.buyAmount) {
      return NextResponse.json(quote.data)
    }

    const price = await fetch0x('price', params)
    if (price.data?.buyAmount) {
      return NextResponse.json(price.data)
    }

    const raw = quote.data || price.data || {}
    return jsonError(
      raw.validationErrors?.[0]?.reason || raw.message || raw.error || 'Quote failed',
      400
    )
  } catch {
    return jsonError('Quote failed', 500)
  }
}