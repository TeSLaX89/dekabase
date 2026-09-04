'use client'

import { useState } from 'react'
import { ConnectWallet } from '@/components/ConnectWallet'
import { GMDisplay } from '@/components/GMDisplay'
import { SayGMButton } from '@/components/SayGMButton'
import { DeployContracts } from '@/components/DeployContracts'
import { Dashboard } from '@/components/Dashboard'
import { Swap } from '@/components/Swap'
import { Bridge } from '@/components/Bridge'
import { Leaderboard } from '@/components/Leaderboard'
import { Activity } from '@/components/Activity'
import { LivePrices } from '@/components/LivePrices'

const TABS = [
  { id: 'gm', label: 'GM' },
  { id: 'deploy', label: 'Deploy' },
  { id: 'swap', label: 'Swap' },
  { id: 'bridge', label: 'Bridge' },
  { id: 'liveprices', label: 'Prices' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'activity', label: 'Activity' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>('gm')

  return (
    <main className="min-h-screen bg-[#0a1018] text-[#e6e4df]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(40,62,92,0.36),_transparent_64%)]" />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8">
        <header className="mb-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#070b10] md:h-14 md:w-14">
              <img
                src="/logo.png"
                alt="DekaBase"
                className="h-9 w-9 object-contain md:h-11 md:w-11"
              />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
                DekaBase
              </h1>
              <p className="text-[11px] tracking-wide text-gray-500">
                Built exclusively on Base
              </p>
            </div>
          </div>

          <ConnectWallet />
        </header>

        <nav className="mb-10 flex justify-center">
          <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1.5 backdrop-blur-sm">
            {TABS.map((tab) => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-xl px-3.5 py-2 text-sm font-medium transition-all md:px-4 ${
                    active
                      ? 'bg-white text-black shadow-sm'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </nav>

        <section className="flex justify-center">
          {activeTab === 'gm' && (
            <div className="w-full max-w-md space-y-6">
              <GMDisplay />
              <SayGMButton />
            </div>
          )}
          {activeTab === 'deploy' && <DeployContracts />}
          {activeTab === 'swap' && <Swap />}
          {activeTab === 'bridge' && <Bridge />}
          {activeTab === 'liveprices' && <LivePrices />}
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'leaderboard' && <Leaderboard />}
          {activeTab === 'activity' && <Activity />}
        </section>
      </div>
    </main>
  )
}