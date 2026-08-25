'use client'

import { useReadContract, useAccount } from 'wagmi'
import { base } from 'wagmi/chains'
import { GM_ADDRESS, gmAbi } from '@/config/gm'

export function GMDisplay() {
  const { address } = useAccount()

  const { data: userCount, isLoading } = useReadContract({
    address: GM_ADDRESS,
    abi: gmAbi,
    functionName: 'userGMCount',
    args: address ? [address] : undefined,
    chainId: base.id,
  })

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
      <p className="mb-3 text-xs uppercase tracking-[0.2em] text-gray-500">
        Your GMs on Base
      </p>
      <p className="text-6xl font-semibold tracking-tight text-white">
        {isLoading ? '...' : userCount?.toString() || '0'}
      </p>
    </div>
  )
}