import { NextRequest, NextResponse } from 'next/server'
import { isAddress } from 'viem'

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY

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
    const txRes = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getTransactionCount',
        params: [address, 'latest'],
      }),
    })
    const txData = await txRes.json()
    if (txData?.result) {
      txCount = parseInt(txData.result, 16) || 0
    }

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
      const activityRes = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'alchemy_getAssetTransfers',
          params: [{
            fromBlock: '0x0',
            toBlock: 'latest',
            fromAddress: address,
            category: ['external', 'erc20', 'erc721', 'erc1155'],
            order: 'desc',
            maxCount: '0x64',
            withMetadata: true,
          }],
        }),
      })
      const activityData = await activityRes.json()
      const transfers = activityData?.result?.transfers || []

      if (transfers.length > 0) {
        if (transfers[0]?.metadata?.blockTimestamp) {
          lastTx = transfers[0].metadata.blockTimestamp
        }

        const daysSet = new Set(
          transfers
            .map((t: any) => t.metadata?.blockTimestamp?.slice(0, 10))
            .filter(Boolean)
        )
        activeDays = daysSet.size

        const contractsSet = new Set(
          transfers
            .map((t: any) => t.to)
            .filter((to: any) => to && to.toLowerCase() !== address.toLowerCase())
        )
        interactedContracts = contractsSet.size
      }
    } catch {}

    try {
      const firstRes = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'alchemy_getAssetTransfers',
          params: [{
            fromBlock: '0x0',
            toBlock: 'latest',
            fromAddress: address,
            category: ['external', 'erc20', 'erc721', 'erc1155'],
            order: 'asc',
            maxCount: '0x1',
            withMetadata: true,
          }],
        }),
      })
      const firstData = await firstRes.json()
      const firstTransfers = firstData?.result?.transfers || []

      if (firstTransfers.length > 0 && firstTransfers[0]?.metadata?.blockTimestamp) {
        firstTx = firstTransfers[0].metadata.blockTimestamp
      }
    } catch {}

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