'use client'

import { useState, useEffect } from 'react'

type Coin = {
  id: string
  symbol: string
  name: string
  image: string
  current_price: number
  price_change_percentage_24h: number
  market_cap: number
  fully_diluted_valuation: number | null
  total_volume: number
  market_cap_rank: number
}

export function LivePrices() {
  const [coins, setCoins] = useState<Coin[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    async function fetchPrices() {
      try {
        setLoading(true)
        const res = await fetch(
          'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h'
        )
        const data = await res.json()
        setCoins(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error(error)
        setCoins([])
      } finally {
        setLoading(false)
      }
    }

    fetchPrices()
    const interval = setInterval(fetchPrices, 60000)
    return () => clearInterval(interval)
  }, [])

  const filteredCoins = coins.filter((coin) => {
    const q = search.toLowerCase()
    return (
      coin.name.toLowerCase().includes(q) ||
      coin.symbol.toLowerCase().includes(q)
    )
  })

  const totalPages = Math.ceil(filteredCoins.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentCoins = filteredCoins.slice(startIndex, startIndex + itemsPerPage)

  const formatNumber = (num: number | null) => {
    if (!num) return '—'
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
    return `$${num.toLocaleString()}`
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [search])

  return (
    <div className="w-full max-w-6xl">
      <div className="mb-8 text-center">
        <h2 className="mb-2 text-2xl font-semibold text-white">Live Prices</h2>
        <p className="text-sm text-gray-400">
          Real-time prices of top 100 cryptocurrencies
        </p>
      </div>

      <div className="mb-6 flex justify-center">
        <input
          type="text"
          placeholder="Search by name or symbol..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-white placeholder-gray-500 outline-none transition focus:border-white/20"
        />
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-500">Loading prices...</div>
      ) : currentCoins.length === 0 ? (
        <div className="py-20 text-center text-gray-500">No coins found</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/[0.03] text-xs text-gray-400">
                  <th className="px-4 py-4 text-left font-medium">#</th>
                  <th className="px-4 py-4 text-left font-medium">Coin</th>
                  <th className="px-4 py-4 text-right font-medium">Price</th>
                  <th className="px-4 py-4 text-right font-medium">24h</th>
                  <th className="px-4 py-4 text-right font-medium">Market Cap</th>
                  <th className="px-4 py-4 text-right font-medium">FDV</th>
                  <th className="px-4 py-4 text-right font-medium">Volume 24h</th>
                </tr>
              </thead>
              <tbody>
                {currentCoins.map((coin) => {
                  const isPositive = coin.price_change_percentage_24h >= 0
                  return (
                    <tr
                      key={coin.id}
                      className="border-t border-white/5 transition hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-4 text-gray-500">
                        {coin.market_cap_rank}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={coin.image}
                            alt={coin.name}
                            className="h-7 w-7 rounded-full"
                          />
                          <div>
                            <div className="font-medium text-white">{coin.name}</div>
                            <div className="text-xs uppercase text-gray-500">
                              {coin.symbol}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-medium text-white">
                        ${coin.current_price.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 6,
                        })}
                      </td>
                      <td
                        className={`px-4 py-4 text-right font-medium ${
                          isPositive ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {coin.price_change_percentage_24h?.toFixed(2)}%
                      </td>
                      <td className="px-4 py-4 text-right text-gray-300">
                        {formatNumber(coin.market_cap)}
                      </td>
                      <td className="px-4 py-4 text-right text-gray-300">
                        {formatNumber(coin.fully_diluted_valuation)}
                      </td>
                      <td className="px-4 py-4 text-right text-gray-300">
                        {formatNumber(coin.total_volume)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm transition hover:border-white/20 disabled:opacity-40"
              >
                Previous
              </button>

              <span className="text-sm text-gray-400">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm transition hover:border-white/20 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}