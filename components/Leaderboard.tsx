'use client'

import { useAccount } from 'wagmi'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Entry = {
  short_address: string
  onchain_score: number
  site_score: number
  score: number
}

export function Leaderboard() {
  const { address, isConnected } = useAccount()
  const [list, setList] = useState<Entry[]>([])
  const [myRank, setMyRank] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const calculateOnchainScore = (data: any) => {
    return (
      (data.txCount || 0) * 1 +
      (data.activeDays || 0) * 5 +
      (data.tokenCount || 0) * 3 +
      (data.nftCount || 0) * 4 +
      (data.interactedContracts || 0) * 2
    )
  }

  useEffect(() => {
    const loadLeaderboard = async () => {
      setLoading(true)

      try {
        if (address) {
          const res = await fetch(`/api/dashboard?address=${address}&chain=mainnet`)
          const data = await res.json()
          const onchainScore = calculateOnchainScore(data)

          await fetch('/api/leaderboard/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address,
              onchainScore,
            }),
          })
        }

        const { data: rows, error } = await supabase
          .from('leaderboard_public')
          .select('short_address, onchain_score, site_score, score')
          .order('score', { ascending: false })
          .limit(50)

        if (error) {
          console.error(error)
          setList([])
        } else {
          setList(rows || [])
        }

        if (address && rows) {
          const myShort = `${address.slice(0, 6)}...${address.slice(-4)}`.toLowerCase()
          const rank =
            rows.findIndex(
              (r) => r.short_address.toLowerCase() === myShort
            ) + 1
          setMyRank(rank > 0 ? rank : null)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadLeaderboard()
  }, [address])

  const getMedal = (index: number) => {
    if (index === 0) return '🥇'
    if (index === 1) return '🥈'
    if (index === 2) return '🥉'
    return `#${index + 1}`
  }

  return (
    <div className="w-full max-w-2xl space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="text-center text-xl font-semibold text-white">Leaderboard</h2>

      {loading ? (
        <p className="text-center text-sm text-gray-400">Loading...</p>
      ) : (
        <div className="space-y-2">
          {list.length === 0 && (
            <p className="py-6 text-center text-sm text-gray-500">No data yet</p>
          )}

          <div className="mb-1 grid grid-cols-[48px_1.4fr_0.8fr_0.7fr_0.7fr] gap-2 px-4 text-xs text-gray-500">
            <span>Rank</span>
            <span>Address</span>
            <span className="text-center">Onchain</span>
            <span className="text-center">Site</span>
            <span className="text-center">Total</span>
          </div>

          {list.map((entry, index) => {
            const isMe =
              address &&
              entry.short_address.toLowerCase() ===
                `${address.slice(0, 6)}...${address.slice(-4)}`.toLowerCase()

            return (
              <div
                key={entry.short_address + index}
                className={`grid grid-cols-[48px_1.4fr_0.8fr_0.7fr_0.7fr] items-center gap-2 rounded-xl border px-4 py-3 transition ${
                  isMe
                    ? 'border-white/20 bg-white/10'
                    : 'border-white/5 bg-black/40 hover:border-white/10'
                }`}
              >
                <span className="text-sm font-medium">
                  {getMedal(index)}
                </span>
                <span
                  className={`truncate font-mono text-sm ${
                    isMe ? 'text-white' : 'text-gray-300'
                  }`}
                  title={entry.short_address}
                >
                  {entry.short_address}
                </span>
                <span className="text-center text-sm text-gray-400">
                  {entry.onchain_score || 0}
                </span>
                <span className="text-center text-sm text-gray-400">
                  {entry.site_score || 0}
                </span>
                <span className="text-center text-sm font-semibold text-white">
                  {entry.score || 0}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {isConnected && myRank && (
        <div className="pt-2 text-center text-sm text-gray-400">
          Your rank: <span className="font-semibold text-white">#{myRank}</span>
        </div>
      )}
    </div>
  )
}