'use client'

import { useState, useEffect } from 'react'

export function DekaPredict() {
  const [timeFilter, setTimeFilter] = useState('all')
  const [coinFilter, setCoinFilter] = useState('all')
  const [markets, setMarkets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMarkets() {
      try {
        setLoading(true)
        const res = await fetch('/api/dekapredict')
        const data = await res.json()
        setMarkets(data.data || [])
      } catch (error) {
        console.error(error)
        setMarkets([])
      } finally {
        setLoading(false)
      }
    }

    fetchMarkets()
    const interval = setInterval(fetchMarkets, 30000)
    return () => clearInterval(interval)
  }, [])

  const filteredMarkets = markets.filter((market: any) => {
    const title = (market.title || '').toLowerCase()
    const tags = (market.tags || []).join(' ').toLowerCase()
    const categories = (market.categories || []).join(' ').toLowerCase()
    const searchText = `${title} ${tags} ${categories}`

    const timeMatch =
      timeFilter === 'all' ||
      (timeFilter === '15m' && (searchText.includes('15') || searchText.includes('15 min'))) ||
      (timeFilter === 'hourly' && (searchText.includes('hour') || searchText.includes('hourly'))) ||
      (timeFilter === 'daily' && (searchText.includes('daily') || searchText.includes('day')))

    const coinMatch =
      coinFilter === 'all' ||
      (coinFilter === 'bitcoin' && (searchText.includes('bitcoin') || searchText.includes('btc'))) ||
      (coinFilter === 'ethereum' && (searchText.includes('ethereum') || searchText.includes('eth'))) ||
      (coinFilter === 'solana' && (searchText.includes('solana') || searchText.includes('sol'))) ||
      (coinFilter === 'xrp' && (searchText.includes('xrp') || searchText.includes('ripple')))

    return timeMatch && coinMatch
  })

  return (
    <div className="w-full max-w-6xl">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-cyan-400 mb-2">DekaPredict</h2>
        <p className="text-gray-400 text-sm">
          Live crypto predictions powered by Limitless on Base
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-4 justify-center">
        {['all', '15m', 'hourly', 'daily'].map((item) => (
          <button
            key={item}
            onClick={() => setTimeFilter(item)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              timeFilter === item
                ? 'bg-cyan-500 text-black'
                : 'bg-gray-900 border border-gray-800 text-gray-300 hover:border-gray-600'
            }`}
          >
            {item === 'all' ? 'All' : item === '15m' ? '15m' : item === 'hourly' ? 'Hourly' : 'Daily'}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-8 justify-center">
        {['all', 'bitcoin', 'ethereum', 'solana', 'xrp'].map((item) => (
          <button
            key={item}
            onClick={() => setCoinFilter(item)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              coinFilter === item
                ? 'bg-cyan-500 text-black'
                : 'bg-gray-900 border border-gray-800 text-gray-300 hover:border-gray-600'
            }`}
          >
            {item === 'all' ? 'All' : item.charAt(0).toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading markets...</div>
      ) : filteredMarkets.length === 0 ? (
        <div className="text-center py-20 text-gray-500">No markets found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMarkets.map((market: any) => {
            const upPrice = market.prices?.[0] ?? 0.5
            const upPercent = Math.round(upPrice * 100)
            const downPercent = 100 - upPercent

            const volume = market.volumeFormatted
              ? `$${Number(market.volumeFormatted).toFixed(1)}`
              : market.volume
              ? `$${(Number(market.volume) / 1e6).toFixed(1)}K`
              : '—'

            return (
              <a
                key={market.id || market.slug}
                href={`https://limitless.exchange/markets/${market.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-cyan-700/60 transition block"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-semibold text-base leading-tight pr-3">
                    {market.title}
                  </h3>
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full whitespace-nowrap">
                    Live
                  </span>
                </div>

                <div className="space-y-3 mb-5">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Up / Yes</span>
                      <span className="font-medium text-green-400">{upPercent}%</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${upPercent}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Down / No</span>
                      <span className="font-medium text-red-400">{downPercent}%</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${downPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>Volume: {volume}</span>
                  <span>
                    {market.expirationDate ||
                      (market.expirationTimestamp
                        ? new Date(market.expirationTimestamp).toLocaleString()
                        : '—')}
                  </span>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}