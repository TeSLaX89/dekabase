'use client'

import { useState, useEffect, useRef } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import type { Connector } from 'wagmi'

export function ConnectWallet() {
  const [ready, setReady] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const { address, isConnected, isConnecting } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setReady(true)
  }, [])

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [isOpen])

  const getDisplayName = (connector: Connector) => {
    const id = connector.id.toLowerCase()
    const n = connector.name.toLowerCase()
    if (id === 'baseaccount' || n.includes('base account')) return 'Base Account'
    if (id.includes('rabby') || n.includes('rabby')) return 'Rabby Wallet'
    if (id === 'okx' || n.includes('okx')) return 'OKX Wallet'
    if (id === 'metamask' || n.includes('metamask') || n === 'injected') return 'MetaMask'
    return connector.name
  }

  const allowed = connectors.filter((connector) => {
    const label = getDisplayName(connector)
    return (
      label === 'MetaMask' ||
      label === 'Rabby Wallet' ||
      label === 'Base Account' ||
      label === 'OKX Wallet'
    )
  })

  const unique = allowed.filter((connector, index, all) => {
    const label = getDisplayName(connector)
    return all.findIndex((c) => getDisplayName(c) === label) === index
  })

  const sorted = unique.sort((a, b) => {
    const order = ['MetaMask', 'Rabby Wallet', 'Base Account', 'OKX Wallet']
    return order.indexOf(getDisplayName(a)) - order.indexOf(getDisplayName(b))
  })

  if (!ready) {
    return (
      <button className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black">
        Connect Wallet
      </button>
    )
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-2.5">
        <div className="hidden sm:flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span className="font-mono text-xs text-gray-300">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
        </div>
        <button
          onClick={() => disconnect()}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-gray-300 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-gray-100"
      >
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl shadow-black/50">
          {sorted.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => {
                connect({ connector })
                setIsOpen(false)
              }}
              className="w-full border-b border-white/5 px-4 py-3 text-left text-sm text-gray-300 transition last:border-0 hover:bg-white/5 hover:text-white"
            >
              {getDisplayName(connector)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}