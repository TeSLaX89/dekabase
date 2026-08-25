'use client'

import { useAccount } from 'wagmi'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Log = {
  action: string
  created_at: string
  tx_hash: string | null
}

export function Activity() {
  const { address, isConnected } = useAccount()
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!address) {
      setLogs([])
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('activity_log')
        .select('action, created_at, tx_hash')
        .eq('address', address.toLowerCase())
        .order('created_at', { ascending: false })
        .limit(50)

      setLogs(data || [])
      setLoading(false)
    }

    load()
  }, [address])

  const formatAction = (action: string) => {
    if (action.startsWith('bridge_')) {
      const parts = action.replace('bridge_', '').split('_')
      if (parts.length === 2) {
        const from = parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
        const to = parts[1].charAt(0).toUpperCase() + parts[1].slice(1)
        return { label: `Bridge ${from} → ${to}`, icon: '🌉' }
      }
      return { label: 'Bridge', icon: '🌉' }
    }

    const map: Record<string, { label: string; icon: string }> = {
      gm: { label: 'Say GM', icon: '☀️' },
      deploy: { label: 'Deploy Contract', icon: '📜' },
      swap: { label: 'Swap', icon: '🔄' },
      bridge_deposit: { label: 'Bridge Deposit', icon: '🌉' },
      bridge_withdraw: { label: 'Bridge Withdraw', icon: '🌉' },
    }
    return map[action] || { label: action, icon: '•' }
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
    return date.toLocaleDateString()
  }

  if (!isConnected) {
    return (
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
        <p className="text-gray-400">Please connect your wallet</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="text-center text-xl font-semibold text-white">Activity</h2>

      {loading ? (
        <p className="text-center text-sm text-gray-400">Loading...</p>
      ) : logs.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">No activity yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs text-gray-500">
                <th className="px-3 py-3 text-left font-medium">Type</th>
                <th className="px-3 py-3 text-left font-medium">Age</th>
                <th className="px-3 py-3 text-left font-medium">Tx Hash</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => {
                const { label, icon } = formatAction(log.action)
                return (
                  <tr
                    key={i}
                    className="border-b border-white/5 transition hover:bg-white/[0.02]"
                  >
                    <td className="px-3 py-3.5">
                      <span className="flex items-center gap-2 font-medium text-white">
                        <span>{icon}</span>
                        {label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-gray-400">
                      {formatRelativeTime(log.created_at)}
                    </td>
                    <td className="px-3 py-3.5">
                      {log.tx_hash ? (
                        <a
                          href={`https://basescan.org/tx/${log.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-blue-400/45 transition hover:text-blue-300/75"
                        >
                          {log.tx_hash.slice(0, 10)}...{log.tx_hash.slice(-8)}
                        </a>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}