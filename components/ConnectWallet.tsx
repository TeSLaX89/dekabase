'use client'

import { useState, useEffect, useRef } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'

export function ConnectWallet() {
  const [isOpen, setIsOpen] = useState(false)
  const { address, isConnected, isConnecting } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [isOpen])

  const getDisplayName = (name: string) => {
    if (name === 'Injected') return 'MetaMask'
    if (name.toLowerCase().includes('coinbase')) return 'Coinbase Wallet'
    if (name.toLowerCase().includes('rabby')) return 'Rabby Wallet'
    if (name.toLowerCase().includes('phantom')) return 'Phantom'
    if (name.toLowerCase().includes('okx')) return 'OKX Wallet'
    return name
  }

  const preferred = connectors.filter((c) => {
    const n = c.name.toLowerCase()
    return (
      n.includes('coinbase') ||
      n === 'injected' ||
      n.includes('rabby') ||
      n.includes('phantom') ||
      n.includes('okx')
    )
  })

  const sorted = preferred.sort((a, b) => {
    if (a.name.toLowerCase().includes('coinbase')) return -1
    if (b.name.toLowerCase().includes('coinbase')) return 1
    if (a.name === 'Injected') return -1
    if (b.name === 'Injected') return 1
    return 0
  })

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
              {getDisplayName(connector.name)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}