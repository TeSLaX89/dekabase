'use client'

import { useAccount, useBalance, useReadContract } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { formatEther } from 'viem'
import { useEffect, useState } from 'react'
import { GM_ADDRESS, gmAbi } from '@/config/gm'
import { supabase } from '@/lib/supabase'

type NetworkData = {
  txCount: number
  tokenCount: number
  nftCount: number
  firstTx: string | null
  lastTx: string | null
  activeDays: number
  interactedContracts: number
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/50 p-5">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-gray-500">
        {label}
      </p>
      <p className="text-xl font-semibold tracking-tight text-white">{value}</p>
    </div>
  )
}

export function Dashboard() {
  const { address, isConnected } = useAccount()
  const [mainnetData, setMainnetData] = useState<NetworkData | null>(null)
  const [sepoliaData, setSepoliaData] = useState<NetworkData | null>(null)
  const [deployCount, setDeployCount] = useState(0)
  const [swapCount, setSwapCount] = useState(0)
  const [bridgeCount, setBridgeCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const { data: balanceMainnet } = useBalance({
    address,
    chainId: base.id,
  })

  const { data: balanceSepolia } = useBalance({
    address,
    chainId: baseSepolia.id,
  })

  const { data: userGMCount } = useReadContract({
    address: GM_ADDRESS,
    abi: gmAbi,
    functionName: 'userGMCount',
    args: address ? [address] : undefined,
    chainId: base.id,
  })

  useEffect(() => {
    if (!address) return

    const fetchData = async () => {
      setLoading(true)
      try {
        const [mainRes, sepoliaRes] = await Promise.all([
          fetch(`/api/dashboard?address=${address}&chain=mainnet`),
          fetch(`/api/dashboard?address=${address}&chain=sepolia`),
        ])

        const mainJson = await mainRes.json()
        const sepoliaJson = await sepoliaRes.json()

        setMainnetData(mainJson)
        setSepoliaData(sepoliaJson)

        const addr = address.toLowerCase()

        const { count: deployCnt } = await supabase
          .from('activity_log')
          .select('*', { count: 'exact', head: true })
          .eq('address', addr)
          .eq('action', 'deploy')

        const { count: swapCnt } = await supabase
          .from('activity_log')
          .select('*', { count: 'exact', head: true })
          .eq('address', addr)
          .eq('action', 'swap')

        const { count: bridgeCnt } = await supabase
          .from('activity_log')
          .select('*', { count: 'exact', head: true })
          .eq('address', addr)
          .like('action', 'bridge_%')

        setDeployCount(deployCnt || 0)
        setSwapCount(swapCnt || 0)
        setBridgeCount(bridgeCnt || 0)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [address])

  const calcAge = (timestamp: string | null) => {
    if (!timestamp) return '-'
    const days = Math.floor(
      (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60 * 24)
    )
    return `${days} days`
  }

  const formatDate = (timestamp: string | null) => {
    if (!timestamp) return '-'
    return new Date(timestamp).toLocaleDateString()
  }

  if (!isConnected) {
    return (
      <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
        <p className="text-gray-400">Please connect your wallet</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-5xl space-y-8">
      <div className="space-y-6 rounded-2xl border border-white/10 bg-white/[0.03] p-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Base Mainnet Activity
          </h2>
          <p className="mt-1.5 text-sm text-gray-500">Live onchain data</p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          <StatCard
            label="Balance"
            value={
              balanceMainnet
                ? `${Number(formatEther(balanceMainnet.value)).toFixed(4)} ETH`
                : '0 ETH'
            }
          />
          <StatCard
            label="Transactions"
            value={loading ? '...' : mainnetData?.txCount ?? '-'}
          />
          <StatCard
            label="Tokens"
            value={loading ? '...' : mainnetData?.tokenCount ?? '-'}
          />
          <StatCard
            label="NFTs"
            value={loading ? '...' : mainnetData?.nftCount ?? '-'}
          />
          <StatCard
            label="Active Days"
            value={loading ? '...' : mainnetData?.activeDays ?? '-'}
          />
          <StatCard
            label="Interacted Contracts"
            value={loading ? '...' : mainnetData?.interactedContracts ?? '-'}
          />
          <StatCard
            label="Wallet Age"
            value={loading ? '...' : calcAge(mainnetData?.firstTx ?? null)}
          />
          <StatCard
            label="Last Activity"
            value={loading ? '...' : formatDate(mainnetData?.lastTx ?? null)}
          />
        </div>
      </div>

      <div className="space-y-6 rounded-2xl border border-white/10 bg-white/[0.03] p-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Base Sepolia Activity
          </h2>
          <p className="mt-1.5 text-sm text-gray-500">Testnet data</p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          <StatCard
            label="Balance"
            value={
              balanceSepolia
                ? `${Number(formatEther(balanceSepolia.value)).toFixed(4)} ETH`
                : '0 ETH'
            }
          />
          <StatCard
            label="Transactions"
            value={loading ? '...' : sepoliaData?.txCount ?? '-'}
          />
          <StatCard
            label="Tokens"
            value={loading ? '...' : sepoliaData?.tokenCount ?? '-'}
          />
          <StatCard
            label="NFTs"
            value={loading ? '...' : sepoliaData?.nftCount ?? '-'}
          />
          <StatCard
            label="Active Days"
            value={loading ? '...' : sepoliaData?.activeDays ?? '-'}
          />
          <StatCard
            label="Interacted Contracts"
            value={loading ? '...' : sepoliaData?.interactedContracts ?? '-'}
          />
          <StatCard
            label="Wallet Age"
            value={loading ? '...' : calcAge(sepoliaData?.firstTx ?? null)}
          />
          <StatCard
            label="Last Activity"
            value={loading ? '...' : formatDate(sepoliaData?.lastTx ?? null)}
          />
        </div>
      </div>

      <div className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-8">
        <div className="text-center">
          <h3 className="text-lg font-semibold tracking-tight text-white">
            Your Activity on DekaBase
          </h3>
          <p className="mt-1 text-sm text-gray-500">Site actions</p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Your GMs" value={userGMCount?.toString() || '0'} />
          <StatCard label="Swaps" value={swapCount} />
          <StatCard label="Bridges" value={bridgeCount} />
          <StatCard label="Contracts Deployed" value={deployCount} />
        </div>
      </div>
    </div>
  )
}