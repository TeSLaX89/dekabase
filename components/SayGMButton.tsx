'use client'

import { useWriteContract, useWaitForTransactionReceipt, useChainId, useSwitchChain, useAccount } from 'wagmi'
import { base } from 'wagmi/chains'
import { GM_ADDRESS, gmAbi } from '@/config/gm'
import { DATA_SUFFIX } from '@/config/wagmi'
import { useEffect, useRef } from 'react'

export function SayGMButton() {
  const { address } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const { data: hash, isPending, writeContract } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })
  const scoredRef = useRef<string | null>(null)

  useEffect(() => {
    if (isSuccess && hash && address && scoredRef.current !== hash) {
      scoredRef.current = hash

      fetch('/api/leaderboard/add-site-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          points: 5,
          action: 'gm',
          txHash: hash,
        }),
      })
    }
  }, [isSuccess, hash, address])

  if (chainId !== base.id) {
    return (
      <button
        onClick={() => switchChain({ chainId: base.id })}
        className="w-full max-w-md rounded-xl border border-amber-500/30 bg-amber-500/10 px-8 py-4 text-sm font-medium text-amber-200 transition hover:bg-amber-500/15"
      >
        Switch to Base Mainnet
      </button>
    )
  }

  return (
    <div className="w-full max-w-md space-y-4">
      <button
        onClick={() =>
          writeContract({
            address: GM_ADDRESS,
            abi: gmAbi,
            functionName: 'sayGM',
            chainId: base.id,
            dataSuffix: DATA_SUFFIX,
          })
        }
        disabled={isPending || isConfirming}
        className="w-full rounded-xl bg-white px-8 py-4 text-lg font-semibold text-black transition hover:bg-gray-100 disabled:bg-white/10 disabled:text-gray-500"
      >
        {isPending ? 'Confirm in Wallet...' : isConfirming ? 'Confirming...' : 'Say GM'}
      </button>

      {isSuccess && hash && (
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium text-emerald-400">GM sent successfully</p>
          <a
            href={`https://basescan.org/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm text-sky-400/70 transition hover:text-sky-300"
          >
            View on Basescan ↗
          </a>
        </div>
      )}
    </div>
  )
}