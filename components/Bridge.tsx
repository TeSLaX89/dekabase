'use client'

import { useAccount, useChainId, useSwitchChain, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi'
import { base, mainnet, arbitrum, optimism, polygon } from 'wagmi/chains'
import { useState, useEffect } from 'react'
import { parseUnits, formatUnits, erc20Abi, createPublicClient, http } from 'viem'

const ink = {
  id: 57073,
  name: 'Ink',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc-gel.inkonchain.com'] },
  },
} as const

const CHAINS = [
  { id: mainnet.id, name: 'Ethereum', rpc: 'https://eth.llamarpc.com' },
  { id: base.id, name: 'Base', rpc: 'https://mainnet.base.org' },
  { id: arbitrum.id, name: 'Arbitrum', rpc: 'https://arb1.arbitrum.io/rpc' },
  { id: optimism.id, name: 'Optimism', rpc: 'https://mainnet.optimism.io' },
  { id: polygon.id, name: 'Polygon', rpc: 'https://polygon-rpc.com' },
  { id: ink.id, name: 'Ink', rpc: 'https://rpc-gel.inkonchain.com' },
] as const

type SupportedChainId = (typeof CHAINS)[number]['id']

type Token = {
  symbol: string
  address: `0x${string}`
  decimals: number
  isNative?: boolean
}

const TOKENS: Record<number, Token[]> = {
  [mainnet.id]: [
    { symbol: 'ETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18, isNative: true },
    { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
    { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
  ],
  [base.id]: [
    { symbol: 'ETH', address: '0x4200000000000000000000000000000000000006', decimals: 18, isNative: true },
    { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
    { symbol: 'USDT', address: '0xfde4C96c8593536E31F7872A280281e9B3F2d39e', decimals: 6 },
  ],
  [arbitrum.id]: [
    { symbol: 'ETH', address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18, isNative: true },
    { symbol: 'USDC', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
    { symbol: 'USDT', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 },
  ],
  [optimism.id]: [
    { symbol: 'ETH', address: '0x4200000000000000000000000000000000000006', decimals: 18, isNative: true },
    { symbol: 'USDC', address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
    { symbol: 'USDT', address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', decimals: 6 },
  ],
  [polygon.id]: [
    { symbol: 'ETH', address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18, isNative: true },
    { symbol: 'USDC', address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6 },
    { symbol: 'USDT', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6 },
  ],
  [ink.id]: [
    { symbol: 'ETH', address: '0x4200000000000000000000000000000000000006', decimals: 18, isNative: true },
  ],
}

const SELECT_CLASS =
  'rounded-lg border border-white/10 bg-zinc-900 px-2 py-2 text-xs text-white outline-none'

const getClient = (chainId: number) => {
  const chain = CHAINS.find((c) => c.id === chainId)
  if (!chain) return null
  return createPublicClient({
    transport: http(chain.rpc),
  })
}

export function Bridge() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChainAsync } = useSwitchChain()

  const [fromChainId, setFromChainId] = useState<SupportedChainId>(base.id)
  const [toChainId, setToChainId] = useState<SupportedChainId>(mainnet.id)
  const [fromToken, setFromToken] = useState<Token>(TOKENS[base.id][0])
  const [toToken, setToToken] = useState<Token>(TOKENS[mainnet.id][0])
  const [amount, setAmount] = useState('')
  const [quote, setQuote] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<'idle' | 'approving' | 'bridging' | 'success'>('idle')
  const [balanceFormatted, setBalanceFormatted] = useState('0')
  const [scored, setScored] = useState(false)

  const {
    sendTransaction,
    sendTransactionAsync,
    data: txHash,
    isPending,
    isError,
    reset,
  } = useSendTransaction()

  const { isLoading: isConfirming, isSuccess, isError: isReceiptError } =
    useWaitForTransactionReceipt({ hash: txHash })

  useEffect(() => {
    if (isError || isReceiptError) {
      setStatus('idle')
      setError('Transaction cancelled or failed')
    }
  }, [isError, isReceiptError])

  useEffect(() => {
    const loadBalance = async () => {
      if (!address) {
        setBalanceFormatted('0')
        return
      }
      const client = getClient(fromChainId)
      if (!client) {
        setBalanceFormatted('0')
        return
      }
      try {
        if (fromToken.isNative) {
          const bal = await client.getBalance({ address })
          setBalanceFormatted(formatUnits(bal, 18))
        } else {
          const bal = await client.readContract({
            address: fromToken.address,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [address],
          })
          setBalanceFormatted(formatUnits(bal as bigint, fromToken.decimals))
        }
      } catch {
        setBalanceFormatted('0')
      }
    }
    loadBalance()
  }, [address, fromToken, fromChainId])

  useEffect(() => {
    const tokens = TOKENS[fromChainId]
    if (tokens?.length) setFromToken(tokens[0])
  }, [fromChainId])

  useEffect(() => {
    const tokens = TOKENS[toChainId]
    if (tokens?.length) setToToken(tokens[0])
  }, [toChainId])

  const fetchQuote = async () => {
    if (!amount || !address || Number(amount) <= 0 || fromChainId === toChainId) {
      setQuote(null)
      return
    }

    setLoading(true)
    setError('')
    setQuote(null)

    try {
      const amountRaw = parseUnits(amount, fromToken.decimals).toString()
      const outputTokenAddress = toToken.isNative
        ? '0x0000000000000000000000000000000000000000'
        : toToken.address

      const params = new URLSearchParams({
        originChainId: String(fromChainId),
        destinationChainId: String(toChainId),
        inputToken: fromToken.address,
        outputToken: outputTokenAddress,
        amount: amountRaw,
        depositor: address,
        tradeType: 'exactInput',
      })

      const res = await fetch(`/api/bridge/quote?${params}`)
      const data = await res.json()

      if (data.error || !data.swapTx) {
        setError(data.error || data.message || 'No route available')
        return
      }

      setQuote(data)
    } catch (err: any) {
      setError(err.message || 'Quote failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (amount && Number(amount) > 0) fetchQuote()
      else setQuote(null)
    }, 700)
    return () => clearTimeout(timer)
  }, [amount, fromChainId, toChainId, fromToken, toToken, address])

  const handleBridge = async () => {
    if (!isConnected || !quote?.swapTx || !address) return

    try {
      if (chainId !== fromChainId) {
        await switchChainAsync({ chainId: fromChainId as any })
        return
      }

      reset()
      setError('')
      setScored(false)

      if (!fromToken.isNative && quote.approvalTxns?.length > 0) {
        setStatus('approving')
        for (const approval of quote.approvalTxns) {
          const hash = await sendTransactionAsync({
            to: approval.to as `0x${string}`,
            data: approval.data as `0x${string}`,
            value: approval.value ? BigInt(approval.value) : undefined,
          })
          const client = getClient(fromChainId)
          if (client) await client.waitForTransactionReceipt({ hash })
        }
      }

      setStatus('bridging')

      const value = fromToken.isNative
        ? parseUnits(amount, 18)
        : quote.swapTx.value
          ? BigInt(quote.swapTx.value)
          : undefined

      sendTransaction({
        to: quote.swapTx.to as `0x${string}`,
        data: quote.swapTx.data as `0x${string}`,
        value,
      })
    } catch (err: any) {
      setError(err.shortMessage || err.message || 'Bridge failed')
      setStatus('idle')
    }
  }

  useEffect(() => {
    if (isSuccess && txHash && address && !scored) {
      setScored(true)
      setStatus('success')

      const fromName = CHAINS.find((c) => c.id === fromChainId)?.name.toLowerCase() || 'unknown'
      const toName = CHAINS.find((c) => c.id === toChainId)?.name.toLowerCase() || 'unknown'

      fetch('/api/leaderboard/add-site-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          points: 8,
          action: `bridge_${fromName}_${toName}`,
          txHash,
        }),
      })
    }
  }, [isSuccess, txHash, address, scored, fromChainId, toChainId])

  const switchDirection = () => {
    setFromChainId(toChainId)
    setToChainId(fromChainId)
    setFromToken(toToken)
    setToToken(fromToken)
    setAmount('')
    setQuote(null)
    setStatus('idle')
  }

  const setPercentage = (pct: number) => {
    if (!isConnected || !balanceFormatted || Number(balanceFormatted) <= 0) return
    const val = (Number(balanceFormatted) * pct).toFixed(fromToken.isNative ? 6 : fromToken.decimals)
    setAmount(val)
  }

  const getStep = () => {
    if (status === 'success' || isSuccess) return 3
    if (status === 'bridging' || isConfirming) return 2
    if (status === 'approving' || isPending) return 1
    return 0
  }

  const currentStep = getStep()

  const outputAmount = quote?.steps?.bridge?.outputAmount
    ? formatUnits(BigInt(quote.steps.bridge.outputAmount), toToken.decimals)
    : quote?.expectedOutputAmount
      ? formatUnits(BigInt(quote.expectedOutputAmount), toToken.decimals)
      : null

  const feeUsd = quote?.fees?.total?.amountUsd
  const feePct = quote?.fees?.total?.pct
    ? (Number(quote.fees.total.pct) / 1e16).toFixed(3)
    : null

  const buttonLabel = !isConnected
    ? 'Connect wallet'
    : status === 'approving'
      ? 'Approving...'
      : status === 'bridging' || isPending || isConfirming
        ? 'Bridging...'
        : loading
          ? 'Finding best route...'
          : fromChainId === toChainId
            ? 'Select different chains'
            : 'Bridge'

  return (
    <div className="flex w-full max-w-4xl flex-col gap-6 lg:flex-row">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Bridge</h2>
          <span className="text-xs text-gray-500">Powered by Across</span>
        </div>

        <div className="space-y-3 rounded-xl border border-white/10 bg-black/40 p-4">
          <div className="flex justify-between text-sm text-gray-400">
            <span>You send</span>
            <span>
              Balance:{' '}
              {isConnected
                ? Number(balanceFormatted).toLocaleString(undefined, { maximumFractionDigits: 6 })
                : '—'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="w-full bg-transparent text-2xl font-semibold outline-none"
            />
            <div className="flex gap-2">
              <select
                value={fromChainId}
                onChange={(e) => setFromChainId(Number(e.target.value) as SupportedChainId)}
                className={SELECT_CLASS}
              >
                {CHAINS.map((c) => (
                  <option key={c.id} value={c.id} className="bg-zinc-900 text-white">
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={fromToken.symbol}
                onChange={(e) => {
                  const t = TOKENS[fromChainId]?.find((x) => x.symbol === e.target.value)
                  if (t) setFromToken(t)
                }}
                className={SELECT_CLASS}
              >
                {(TOKENS[fromChainId] || []).map((t) => (
                  <option key={t.symbol} value={t.symbol} className="bg-zinc-900 text-white">
                    {t.symbol}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            {[0.25, 0.5, 0.75, 1].map((p) => (
              <button
                key={p}
                onClick={() => setPercentage(p)}
                disabled={!isConnected}
                className="rounded-lg bg-white/5 px-2.5 py-1 text-xs transition hover:bg-white/10 disabled:opacity-40"
              >
                {p === 1 ? 'Max' : `${p * 100}%`}
              </button>
            ))}
          </div>
        </div>

        <div className="-my-1 flex justify-center">
          <button
            onClick={switchDirection}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10"
          >
            ⇅
          </button>
        </div>

        <div className="space-y-3 rounded-xl border border-white/10 bg-black/40 p-4">
          <div className="flex justify-between text-sm text-gray-400">
            <span>You receive</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-full text-2xl font-semibold">
              {outputAmount ? Number(outputAmount).toFixed(6) : '0.0'}
            </div>
            <div className="flex gap-2">
              <select
                value={toChainId}
                onChange={(e) => setToChainId(Number(e.target.value) as SupportedChainId)}
                className={SELECT_CLASS}
              >
                {CHAINS.map((c) => (
                  <option key={c.id} value={c.id} className="bg-zinc-900 text-white">
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={toToken.symbol}
                onChange={(e) => {
                  const t = TOKENS[toChainId]?.find((x) => x.symbol === e.target.value)
                  if (t) setToToken(t)
                }}
                className={SELECT_CLASS}
              >
                {(TOKENS[toChainId] || []).map((t) => (
                  <option key={t.symbol} value={t.symbol} className="bg-zinc-900 text-white">
                    {t.symbol}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {quote && outputAmount && (
          <div className="space-y-1.5 px-1 text-xs text-gray-400">
            <div className="flex justify-between">
              <span>Estimated Time</span>
              <span>~{quote.expectedFillTime || quote.expectedFillTimeSec || 2}s</span>
            </div>
            {feeUsd && (
              <div className="flex justify-between">
                <span>Fee</span>
                <span>
                  ${Number(feeUsd).toFixed(4)} {feePct ? `(${feePct}%)` : ''}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Protocol</span>
              <span>Across</span>
            </div>
          </div>
        )}

        {error && <p className="text-center text-sm text-red-400">{error}</p>}

        <button
          onClick={handleBridge}
          disabled={
            !isConnected ||
            !quote?.swapTx ||
            loading ||
            isPending ||
            isConfirming ||
            fromChainId === toChainId
          }
          className="w-full rounded-xl bg-white py-3.5 font-semibold text-black transition hover:bg-gray-100 disabled:bg-white/10 disabled:text-gray-500"
        >
          {buttonLabel}
        </button>
      </div>

      <div className="w-full max-w-md space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h3 className="text-lg font-semibold text-white">Details</h3>

        <div className="space-y-4 text-sm">
          <div className="space-y-1 rounded-xl border border-white/10 bg-black/40 p-4">
            <p className="text-xs text-gray-500">Protocol</p>
            <p className="font-medium text-white">Across Protocol</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              Fastest bridging with ~2 second fills
            </p>
          </div>

          <div className="space-y-1 rounded-xl border border-white/10 bg-black/40 p-4">
            <p className="text-xs text-gray-500">Route</p>
            <p className="font-medium text-white">
              {CHAINS.find((c) => c.id === fromChainId)?.name} →{' '}
              {CHAINS.find((c) => c.id === toChainId)?.name}
            </p>
          </div>

          {quote && (
            <div className="space-y-1 rounded-xl border border-white/10 bg-black/40 p-4">
              <p className="text-xs text-gray-500">Expected Output</p>
              <p className="font-medium text-white">
                {outputAmount ? Number(outputAmount).toFixed(6) : '—'} {toToken.symbol}
              </p>
            </div>
          )}

          <div className="space-y-4 rounded-xl border border-white/10 bg-black/40 p-4">
            <p className="mb-2 text-xs text-gray-500">Transaction Progress</p>
            {[
              { id: 1, label: 'Confirm in wallet' },
              { id: 2, label: 'Transaction pending' },
              { id: 3, label: 'Bridge completed' },
            ].map((step) => (
              <div key={step.id} className="flex items-center gap-3">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    currentStep >= step.id ? 'bg-white text-black' : 'bg-white/5 text-gray-500'
                  }`}
                >
                  {currentStep > step.id ? '✓' : step.id}
                </div>
                <span className={`text-sm ${currentStep >= step.id ? 'text-white' : 'text-gray-500'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {txHash && (
            <div className="space-y-2 rounded-xl border border-white/10 bg-black/40 p-4">
              <p className="text-xs text-gray-500">Transaction</p>
              <a
                href={`https://basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all font-mono text-xs text-blue-400/45 transition hover:text-blue-300/75"
              >
                View on Explorer ↗
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}