import { NextRequest, NextResponse } from 'next/server'
import { isAddress } from 'viem'

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY

async function collectTransfers(
  baseUrl: string,
  address: string,
  direction: 'fromAddress' | 'toAddress',
  category: string[]
) {
  const transfers: any[] = []
  let pageKey: string | undefined
  let pages = 0

  while (pages < 20) {
    const params: Record<string, any> = {
      fromBlock: '0x0',
      toBlock: 'latest',
      [direction]: address,
      category,
      excludeZeroValue: false,
      order: 'asc',
      maxCount: '0x3e8',
      withMetadata: true,
    }

    if (pageKey) params.pageKey = pageKey

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getAssetTransfers',
        params: [params],
      }),
    })

    const data = await res.json()
    const batch = data?.result?.transfers || []
    transfers.push(...batch)

    pageKey = data?.result?.pageKey
    pages += 1
    if (!pageKey || batch.length === 0) break
  }

  return transfers
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const address = searchParams.get('address')
  const chain = searchParams.get('chain')

  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
  }

  if (chain && chain !== 'mainnet' && chain !== 'sepolia') {
    return NextResponse.json({ error: 'Invalid chain' }, { status: 400 })
  }

  if (!ALCHEMY_KEY) {
    return NextResponse.json({ error: 'Alchemy key missing' }, { status: 500 })
  }

  const network = chain === 'mainnet' ? 'base-mainnet' : 'base-sepolia'
  const baseUrl = `https://${network}.g.alchemy.com/v2/${ALCHEMY_KEY}`
  const nftBase = `https://${network}.g.alchemy.com/nft/v3/${ALCHEMY_KEY}`

  let txCount = 0
  let tokenCount = 0
  let nftCount = 0
  let firstTx: string | null = null
  let lastTx: string | null = null
  let activeDays = 0
  let interactedContracts = 0

  try {
    const nonceRes = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getTransactionCount',
        params: [address, 'latest'],
      }),
    })
    const nonceData = await nonceRes.json()
    const nonce = nonceData?.result ? parseInt(nonceData.result, 16) || 0 : 0

    try {
      const tokenRes = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'alchemy_getTokenBalances',
          params: [address, 'erc20'],
        }),
      })
      const tokenData = await tokenRes.json()
      if (tokenData?.result?.tokenBalances) {
        tokenCount = tokenData.result.tokenBalances.filter(
          (t: any) => t.tokenBalance && t.tokenBalance !== '0x0' && t.tokenBalance !== '0x'
        ).length
      }
    } catch {}

    try {
      const nftRes = await fetch(
        `${nftBase}/getNFTsForOwner?owner=${address}&withMetadata=false`
      )
      const nftData = await nftRes.json()
      nftCount = nftData?.totalCount ?? 0
    } catch {}

    try {
      const [outgoing, incomingNative] = await Promise.all([
        collectTransfers(baseUrl, address, 'fromAddress', [
          'external',
          'erc20',
          'erc721',
          'erc1155',
        ]),
        collectTransfers(baseUrl, address, 'toAddress', ['external']),
      ])

      const sentByHash = new Map<string, any>()
      for (const t of outgoing) {
        if (t.hash && !sentByHash.has(t.hash)) sentByHash.set(t.hash, t)
      }
      const sentTxs = Array.from(sentByHash.values())

      const incomingHashes = new Set(
        incomingNative.map((t: any) => t.hash).filter(Boolean)
      )

      txCount = nonce + incomingHashes.size

      const addr = address.toLowerCase()
      const daysSet = new Set(
        sentTxs
          .map((t: any) => t.metadata?.blockTimestamp?.slice(0, 10))
          .filter(Boolean)
      )
      activeDays = daysSet.size

      const contractsSet = new Set(
        sentTxs
          .map((t: any) => t.to)
          .filter((to: any) => to && to.toLowerCase() !== addr)
      )
      interactedContracts = contractsSet.size

      const withTime = [...sentTxs, ...incomingNative]
        .map((t: any) => t.metadata?.blockTimestamp)
        .filter(Boolean)
        .sort()

      if (withTime.length > 0) {
        firstTx = withTime[0]
        lastTx = withTime[withTime.length - 1]
      }
    } catch {
      txCount = nonce
    }

    if (!txCount) txCount = nonce

    return NextResponse.json({
      txCount,
      tokenCount,
      nftCount,
      firstTx,
      lastTx,
      activeDays,
      interactedContracts,
    })
  } catch (error) {
    console.error('Alchemy Error:', error)
    return NextResponse.json({
      txCount: 0,
      tokenCount: 0,
      nftCount: 0,
      firstTx: null,
      lastTx: null,
      activeDays: 0,
      interactedContracts: 0,
    })
  }
}