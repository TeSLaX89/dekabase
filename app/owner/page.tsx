'use client'

import { useAccount } from 'wagmi'
import { useEffect, useState } from 'react'
import { ConnectWallet } from '@/components/ConnectWallet'

type Stats = {
  totalUsers: number
  totalActivities: number
  totalScore: number
  totalSiteScore: number
  totalOnchainScore: number
  actionCounts: Record<string, number>
}

type Activity = {
  address: string
  action: string
  points: number
  tx_hash: string | null
  created_at: string
}

type Blocked = {
  address: string
  reason: string | null
  blocked_by: string | null
  created_at: string
}

export default function OwnerPage() {
  const { address, isConnected } = useAccount()
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'activity' | 'users' | 'moderation'>('overview')

  const [stats, setStats] = useState<Stats | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')

  const [targetAddress, setTargetAddress] = useState('')
  const [userData, setUserData] = useState<any>(null)
  const [newScore, setNewScore] = useState('')
  const [message, setMessage] = useState('')

  const [blockedList, setBlockedList] = useState<Blocked[]>([])
  const [blockAddress, setBlockAddress] = useState('')
  const [blockReason, setBlockReason] = useState('')

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr)
    setMessage('Address copied')
    setTimeout(() => setMessage(''), 1500)
  }

  useEffect(() => {
    const check = async () => {
      if (!address) {
        setIsOwner(false)
        setLoading(false)
        return
      }
      try {
        const res = await fetch('/api/owner/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        })
        const data = await res.json()
        setIsOwner(!!data.isOwner)
      } catch {
        setIsOwner(false)
      } finally {
        setLoading(false)
      }
    }
    check()
  }, [address])

  const loadStats = async () => {
    if (!address) return
    const res = await fetch('/api/owner/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    })
    if (res.ok) setStats(await res.json())
  }

  const loadActivity = async (p = 1) => {
    if (!address) return
    const res = await fetch('/api/owner/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, page: p, limit: 20, search }),
    })
    if (res.ok) {
      const data = await res.json()
      setActivities(data.data || [])
      setTotal(data.total || 0)
      setPage(p)
    }
  }

  const loadBlocked = async () => {
    if (!address) return
    const res = await fetch('/api/owner/blocked', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    })
    if (res.ok) {
      const data = await res.json()
      setBlockedList(data.data || [])
    }
  }

  const searchUser = async () => {
    if (!address || !targetAddress) return
    setMessage('')
    const res = await fetch('/api/owner/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerAddress: address, targetAddress }),
    })
    if (res.ok) {
      const data = await res.json()
      setUserData(data)
      setNewScore(data.user?.site_score?.toString() || '0')
    } else {
      setMessage('User not found')
      setUserData(null)
    }
  }

  const adjustScore = async () => {
    if (!address || !targetAddress || newScore === '') return
    setMessage('')
    const res = await fetch('/api/owner/adjust-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ownerAddress: address,
        targetAddress,
        siteScore: Number(newScore),
        reason: 'owner_adjust',
      }),
    })
    if (res.ok) {
      setMessage('Score updated')
      searchUser()
      loadStats()
    } else {
      const err = await res.json()
      setMessage(err.error || 'Failed')
    }
  }

  const handleBlock = async (action: 'block' | 'unblock', addr?: string) => {
    if (!address) return
    const target = addr || blockAddress
    if (!target) return

    const res = await fetch('/api/owner/block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ownerAddress: address,
        targetAddress: target,
        action,
        reason: blockReason || 'violation',
      }),
    })

    if (res.ok) {
      setMessage(action === 'block' ? 'Address blocked' : 'Address unblocked')
      setBlockAddress('')
      setBlockReason('')
      loadBlocked()
    } else {
      const err = await res.json()
      setMessage(err.error || 'Failed')
    }
  }

  useEffect(() => {
    if (isOwner) {
      loadStats()
      loadActivity(1)
      loadBlocked()
    }
  }, [isOwner])

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-400">Checking access...</p>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6">
        <p className="text-gray-400">Connect owner wallet</p>
        <ConnectWallet />
      </div>
    )
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6">
        <p className="text-red-400">Access denied</p>
        <ConnectWallet />
        <a href="/" className="text-sm text-cyan-400 hover:underline">← Back to app</a>
      </div>
    )
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-wide">Owner Panel</h1>
          <div className="flex items-center gap-4">
            <ConnectWallet />
            <a href="/" className="text-sm text-cyan-400 hover:underline">← Back to app</a>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {(['overview', 'activity', 'users', 'moderation'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm capitalize transition ${
                tab === t
                  ? 'bg-cyan-500 text-black font-semibold'
                  : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {message && (
          <p className={`text-sm ${message.toLowerCase().includes('fail') || message.toLowerCase().includes('error') ? 'text-red-400' : 'text-green-400'}`}>
            {message}
          </p>
        )}

        {tab === 'overview' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <p className="text-xs text-gray-500 mb-1">Users</p>
                <p className="text-2xl font-semibold">{stats.totalUsers}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <p className="text-xs text-gray-500 mb-1">Activities</p>
                <p className="text-2xl font-semibold">{stats.totalActivities}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <p className="text-xs text-gray-500 mb-1">Total Score</p>
                <p className="text-2xl font-semibold">{stats.totalScore}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <p className="text-xs text-gray-500 mb-1">Site Score</p>
                <p className="text-2xl font-semibold">{stats.totalSiteScore}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <p className="text-xs text-gray-500 mb-1">Onchain Score</p>
                <p className="text-2xl font-semibold">{stats.totalOnchainScore}</p>
              </div>
            </div>

            {stats.actionCounts && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h2 className="text-sm text-gray-400 mb-4">Actions Breakdown</h2>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(stats.actionCounts).map(([action, count]) => (
                    <div key={action} className="bg-gray-950 border border-gray-800 rounded-xl px-4 py-2 text-sm">
                      <span className="text-gray-400">{action}</span>
                      <span className="ml-3 text-white font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'activity' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col md:flex-row justify-between gap-3">
              <h2 className="text-sm text-gray-400">Recent Activity</h2>
              <div className="flex gap-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search address..."
                  className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs outline-none"
                />
                <button onClick={() => loadActivity(1)} className="px-4 py-2 bg-gray-800 rounded-xl text-xs hover:bg-gray-700">
                  Filter
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs border-b border-gray-800">
                    <th className="text-left py-3 px-2">Address</th>
                    <th className="text-left py-3 px-2">Action</th>
                    <th className="text-left py-3 px-2">Points</th>
                    <th className="text-left py-3 px-2">Time</th>
                    <th className="text-left py-3 px-2">Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((a, i) => (
                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-950/50">
                      <td className="py-3 px-2">
                        <button
                          onClick={() => copyAddress(a.address)}
                          className="font-mono text-xs text-left hover:text-cyan-400 transition group flex items-center gap-2"
                          title="Click to copy full address"
                        >
                          {a.address.slice(0, 6)}...{a.address.slice(-4)}
                          <span className="text-gray-600 group-hover:text-cyan-400 text-[10px]">copy</span>
                        </button>
                      </td>
                      <td className="py-3 px-2">{a.action}</td>
                      <td className="py-3 px-2">{a.points}</td>
                      <td className="py-3 px-2 text-gray-500 text-xs">{new Date(a.created_at).toLocaleString()}</td>
                      <td className="py-3 px-2">
                        {a.tx_hash ? (
                          <a href={`https://basescan.org/tx/${a.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-cyan-400 text-xs hover:underline">view</a>
                        ) : (
                          <span className="text-gray-600 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 pt-2">
                <button onClick={() => loadActivity(page - 1)} disabled={page <= 1} className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 disabled:opacity-40">Prev</button>
                <span className="text-xs text-gray-500">{page} / {totalPages}</span>
                <button onClick={() => loadActivity(page + 1)} disabled={page >= totalPages} className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 disabled:opacity-40">Next</button>
              </div>
            )}
          </div>
        )}

        {tab === 'users' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm text-gray-400">User Management</h2>
            <div className="flex flex-col md:flex-row gap-3">
              <input
                value={targetAddress}
                onChange={(e) => setTargetAddress(e.target.value)}
                placeholder="0x..."
                className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-cyan-500"
              />
              <button onClick={searchUser} className="px-6 py-3 bg-cyan-500 text-black rounded-xl text-sm font-semibold hover:bg-cyan-400 transition">
                Search
              </button>
            </div>

            {userData?.user && (
              <div className="bg-gray-950 border border-gray-800 rounded-xl p-5 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">Address</p>
                    <button
                      onClick={() => copyAddress(userData.user.address)}
                      className="font-mono text-xs break-all hover:text-cyan-400 transition text-left"
                      title="Click to copy"
                    >
                      {userData.user.address}
                    </button>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Site Score</p>
                    <p className="text-lg font-semibold">{userData.user.site_score}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Onchain Score</p>
                    <p className="text-lg font-semibold">{userData.user.onchain_score}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Total Score</p>
                    <p className="text-lg font-semibold">{userData.user.score}</p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3 items-end">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Set Site Score</p>
                    <input
                      type="number"
                      value={newScore}
                      onChange={(e) => setNewScore(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm outline-none"
                    />
                  </div>
                  <button onClick={adjustScore} className="px-6 py-3 bg-white text-black rounded-xl text-sm font-semibold hover:bg-gray-200 transition">
                    Update Score
                  </button>
                  <button
                    onClick={() => handleBlock('block', userData.user.address)}
                    className="px-6 py-3 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-500 transition"
                  >
                    Block
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'moderation' && (
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
              <h2 className="text-sm text-gray-400">Block Address</h2>
              <div className="flex flex-col md:flex-row gap-3">
                <input
                  value={blockAddress}
                  onChange={(e) => setBlockAddress(e.target.value)}
                  placeholder="0x address to block"
                  className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm outline-none"
                />
                <input
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Reason (optional)"
                  className="md:w-48 bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm outline-none"
                />
                <button
                  onClick={() => handleBlock('block')}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-500 transition"
                >
                  Block
                </button>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
              <h2 className="text-sm text-gray-400">Blocked Addresses ({blockedList.length})</h2>
              {blockedList.length === 0 ? (
                <p className="text-gray-600 text-sm">No blocked addresses</p>
              ) : (
                <div className="space-y-2">
                  {blockedList.map((b) => (
                    <div key={b.address} className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gray-950 border border-gray-800 rounded-xl px-4 py-3">
                      <div>
                        <button
                          onClick={() => copyAddress(b.address)}
                          className="font-mono text-xs hover:text-cyan-400 transition"
                          title="Click to copy"
                        >
                          {b.address}
                        </button>
                        <p className="text-xs text-gray-500 mt-1">
                          {b.reason || 'No reason'} · {new Date(b.created_at).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleBlock('unblock', b.address)}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs transition"
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}