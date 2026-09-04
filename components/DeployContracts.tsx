'use client'

import { useState, useEffect } from 'react'
import { useWalletClient, useChainId, useSwitchChain, usePublicClient, useAccount } from 'wagmi'
import { base } from 'wagmi/chains'
import { parseEventLogs, encodeFunctionData, concat } from 'viem'
import { supabase } from '@/lib/supabase'
import { DATA_SUFFIX } from '@/config/wagmi'

const FACTORY_ADDRESS = '0xb59a9B6A05c4846edC57e6A59927AC396F2CE30F' as const

const factoryAbi = [
  {
    type: 'function',
    name: 'create',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [{ name: 'deployed', type: 'address' }],
  },
  {
    type: 'event',
    name: 'Created',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'deployed', type: 'address', indexed: true },
    ],
  },
] as const

type DeployLog = {
  tx_hash: string
  created_at: string
}

export function DeployContracts() {
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployed, setDeployed] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [history, setHistory] = useState<DeployLog[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  const loadHistory = async () => {
    if (!address) return

    const { data } = await supabase
      .from('activity_log')
      .select('tx_hash, created_at')
      .eq('address', address.toLowerCase())
      .eq('action', 'deploy')
      .order('created_at', { ascending: false })

    setHistory(data || [])
  }

  useEffect(() => {
    loadHistory()
  }, [address])

  const handleDeploy = async () => {
    if (!walletClient || !publicClient || !address) {
      setStatus('error')
      setErrorMessage('Please connect your wallet')
      return
    }

    if (chainId !== base.id) {
      await switchChain({ chainId: base.id })
      return
    }

    setIsDeploying(true)
    setDeployed(null)
    setTxHash(null)
    setStatus('deploying')
    setErrorMessage('')

    try {
      await publicClient.simulateContract({
        address: FACTORY_ADDRESS,
        abi: factoryAbi,
        functionName: 'create',
        account: address,
        chain: base,
      })

      const callData = encodeFunctionData({
        abi: factoryAbi,
        functionName: 'create',
      })

      const hash = await walletClient.sendTransaction({
        to: FACTORY_ADDRESS,
        data: concat([callData, DATA_SUFFIX]),
        gas: BigInt(300000),
        chain: base,
      })

      setTxHash(hash)

      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status !== 'success') {
        setStatus('error')
        setErrorMessage('Deployment transaction failed')
        return
      }

      const parsed = parseEventLogs({
        abi: factoryAbi,
        logs: receipt.logs,
        eventName: 'Created',
      })

      let created = parsed[0]?.args?.deployed as `0x${string}` | undefined

      if (!created) {
        const factoryLog = receipt.logs.find(
          (log) =>
            log.address.toLowerCase() === FACTORY_ADDRESS.toLowerCase() &&
            log.topics.length >= 3
        )
        if (factoryLog?.topics[2]) {
          created = `0x${factoryLog.topics[2].slice(-40)}` as `0x${string}`
        }
      }

      if (!created) {
        setStatus('error')
        setErrorMessage('Deploy succeeded but contract address was not found')
        return
      }

      setDeployed(created)
      setStatus('success')

      await fetch('/api/leaderboard/add-site-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          points: 12,
          action: 'deploy',
          txHash: hash,
        }),
      })

      await loadHistory()
    } catch (error: any) {
      setStatus('error')
      setErrorMessage(error.shortMessage || error.message || 'Deployment failed')
    } finally {
      setIsDeploying(false)
    }
  }

  const totalPages = Math.ceil(history.length / itemsPerPage)
  const currentHistory = history.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-6 rounded-2xl border border-white/10 bg-white/[0.03] p-8">
        <div className="space-y-1 text-center">
          <h2 className="text-lg font-medium tracking-wide text-white">Deploy Contract</h2>
          <p className="text-sm text-gray-500">Deploy a minimal contract on Base</p>
        </div>

        {chainId !== base.id ? (
          <button
            onClick={() => switchChain({ chainId: base.id })}
            className="w-full rounded-xl border border-amber-500/30 bg-amber-500/10 py-3.5 text-sm font-medium text-amber-200 transition hover:bg-amber-500/15"
          >
            Switch to Base Mainnet
          </button>
        ) : (
          <button
            onClick={handleDeploy}
            disabled={isDeploying || status === 'deploying'}
            className="w-full rounded-xl bg-white py-3.5 text-sm font-semibold tracking-wide text-black transition hover:bg-gray-100 disabled:opacity-40"
          >
            {isDeploying || status === 'deploying' ? 'Deploying...' : 'Deploy'}
          </button>
        )}

        {status === 'deploying' && (
          <p className="animate-pulse text-center text-sm text-gray-400">
            Confirming transaction...
          </p>
        )}

        {status === 'success' && deployed && (
          <div className="space-y-4 pt-2">
            <div className="h-px bg-white/10" />
            <div className="space-y-3">
              <p className="text-center text-sm text-emerald-400">Successfully deployed</p>
              <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                <p className="mb-1 text-xs text-gray-500">Contract</p>
                <p className="break-all font-mono text-sm text-white">{deployed}</p>
              </div>
              <div className="flex flex-col gap-2 text-center">
                <a
                  href={`https://basescan.org/address/${deployed}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-sky-400/70 transition hover:text-sky-300"
                >
                  View contract ↗
                </a>
                {txHash && (
                  <a
                    href={`https://basescan.org/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-sky-400/70 transition hover:text-sky-300"
                  >
                    View transaction ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {status === 'error' && (
          <p className="text-center text-sm text-red-400">{errorMessage}</p>
        )}
      </div>

      {history.length > 0 && (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h3 className="text-center text-sm font-medium tracking-wide text-gray-400">
            Deployment History
          </h3>

          <div className="space-y-2">
            {currentHistory.map((item, index) => {
              const number = (currentPage - 1) * itemsPerPage + index + 1
              return (
                <div
                  key={item.tx_hash + index}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-black/40 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-xs text-gray-500">#{number}</span>
                    <a
                      href={`https://basescan.org/tx/${item.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-blue-400/45 hover:text-blue-300/75"
                    >
                      {item.tx_hash.slice(0, 10)}...{item.tx_hash.slice(-8)}
                    </a>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-xs text-gray-500">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}