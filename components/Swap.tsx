'use client'

import {
  useAccount,
  useChainId,
  useSendTransaction,
  useWaitForTransactionReceipt,
  usePublicClient,
  useWriteContract,
  useSwitchChain,
} from 'wagmi'
import { base } from 'wagmi/chains'
import { useState, useEffect, useRef } from 'react'
import { parseUnits, formatUnits, erc20Abi } from 'viem'

const FEE_RECIPIENT = '0xA4200F9F5818cbA01B8dF0e57038A5646ad46AF0'
const FEE_BPS = 25
const NATIVE = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

const TOKENS = [
  { symbol: 'ETH', address: NATIVE, decimals: 18 },
  { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
  { symbol: 'USDT', address: '0xfde4C96c8593536E31F7872A280281e9B3F2d39e', decimals: 6 },
  { symbol: 'WETH', address: '0x4200000000000000000000000000000000000006', decimals: 18 },
]

const SELECT_CLASS =
  'rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none'

export function Swap() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient({ chainId: base.id })
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain()

  const [sellToken, setSellToken] = useState(TOKENS[0])
  const [buyToken, setBuyToken] = useState(TOKENS[1])
  const [sellAmount, setSellAmount] = useState('')
  const [quote, setQuote] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [slippage, setSlippage] = useState(0.5)
  const [showSettings, setShowSettings] = useState(false)
  const [sellBalanceRaw, setSellBalanceRaw] = useState<bigint>(BigInt(0))
  const [sellBalanceFormatted, setSellBalanceFormatted] = useState('0')
  const [status, setStatus] = useState<'idle' | 'approving' | 'swapping'>('idle')
  const scoredRef = useRef<string | null>(null)

  const { sendTransaction, data: txHash, isPending, reset } = useSendTransaction()
  const { writeContractAsync } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  const isBase = chainId === base.id
  const isNativeSell = sellToken.address.toLowerCase() === NATIVE.toLowerCase()

  useEffect(() => {
    const loadBalance = async () => {
      if (!address || !publicClient) {
        setSellBalanceRaw(BigInt(0))
        setSellBalanceFormatted('0')
        return
      }

      try {
        if (isNativeSell) {
          const bal = await publicClient.getBalance({ address })
          setSellBalanceRaw(bal)
          setSellBalanceFormatted(formatUnits(bal, 18))
        } else {
          const bal = await publicClient.readContract({
            address: sellToken.address as `0x${string}`,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [address],
          })
          setSellBalanceRaw(bal as bigint)
          setSellBalanceFormatted(formatUnits(bal as bigint, sellToken.decimals))
        }
      } catch {
        setSellBalanceRaw(BigInt(0))
        setSellBalanceFormatted('0')
      }
    }

    loadBalance()
  }, [address, sellToken, publicClient, isNativeSell])

  const setPercentage = (percent: number) => {
    if (!isConnected || sellBalanceRaw === BigInt(0)) return
    if (percent === 100) {
      setSellAmount(sellBalanceFormatted)
      return
    }
    const raw = (sellBalanceRaw * BigInt(percent)) / BigInt(100)
    setSellAmount(formatUnits(raw, sellToken.decimals))
  }

  const requestQuote = async () => {
    if (!sellAmount || !address || !isBase || Number(sellAmount) <= 0) return null

    const amount = parseUnits(sellAmount, sellToken.decimals).toString()

    const params = new URLSearchParams({
      chainId: '8453',
      sellToken: sellToken.address,
      buyToken: buyToken.address,
      sellAmount: amount,
      taker: address,
      swapFeeRecipient: FEE_RECIPIENT,
      swapFeeBps: FEE_BPS.toString(),
      swapFeeToken: sellToken.address,
      slippageBps: Math.floor(slippage * 100).toString(),
    })

    const res = await fetch(`/api/swap/quote?${params}`)
    const data = await res.json()

    if (
      data.validationErrors ||
      data.name === 'ERROR_CODE' ||
      data.code ||
      data.error ||
      !data.buyAmount
    ) {
      throw new Error(
        data.validationErrors?.[0]?.reason || data.message || data.error || 'Quote failed'
      )
    }

    return data
  }

  const fetchQuote = async () => {
    if (!sellAmount || !address || !isBase || Number(sellAmount) <= 0) {
      setQuote(null)
      return
    }

    setLoading(true)
    setError('')
    setQuote(null)

    try {
      const data = await requestQuote()
      setQuote(data)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch quote')
      setQuote(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (sellAmount && Number(sellAmount) > 0) fetchQuote()
      else setQuote(null)
    }, 500)
    return () => clearTimeout(timer)
  }, [sellAmount, sellToken, buyToken, address, slippage, isBase])

  useEffect(() => {
    if (isSuccess && txHash && address && scoredRef.current !== txHash) {
      scoredRef.current = txHash
      setStatus('idle')
      fetch('/api/leaderboard/add-site-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          points: 8,
          action: 'swap',
          txHash,
        }),
      })
    }
  }, [isSuccess, txHash, address])

  const getSpender = (q: any): `0x${string}` | null => {
    const spender = q?.issues?.allowance?.spender || q?.allowanceTarget || q?.transaction?.to
    if (!spender || typeof spender !== 'string') return null
    return spender as `0x${string}`
  }

  const needsApproval = (q: any) => {
    if (isNativeSell || !q) return false
    return q.issues?.allowance != null
  }

  const handleSwap = async () => {
    if (!isConnected || !address) return

    // Switch to Base only when user clicks the button
    if (!isBase) {
      try {
        setError('')
        await switchChainAsync({ chainId: base.id })
      } catch (err: any) {
        setError(err?.shortMessage || err?.message || 'Network switch failed')
      }
      return
    }

    if (!quote?.transaction || !publicClient) return

    try {
      reset()
      setError('')

      let activeQuote = quote

      if (needsApproval(activeQuote)) {
        const spender = getSpender(activeQuote)
        if (!spender) {
          setError('Missing allowance spender')
          return
        }

        setStatus('approving')
        const amountRaw = parseUnits(sellAmount, sellToken.decimals)

        const approveHash = await writeContractAsync({
          address: sellToken.address as `0x${string}`,
          abi: erc20Abi,
          functionName: 'approve',
          args: [spender, amountRaw],
          chainId: base.id,
        })

        await publicClient.waitForTransactionReceipt({ hash: approveHash })

        const refreshed = await requestQuote()
        if (!refreshed?.transaction) {
          setError('Quote unavailable after approval')
          setStatus('idle')
          return
        }
        setQuote(refreshed)
        activeQuote = refreshed
      }

      setStatus('swapping')

      sendTransaction({
        to: activeQuote.transaction.to as `0x${string}`,
        data: activeQuote.transaction.data as `0x${string}`,
        value: activeQuote.transaction.value
          ? BigInt(activeQuote.transaction.value)
          : undefined,
        chainId: base.id,
      })
    } catch (err: any) {
      setError(err.shortMessage || err.message || 'Swap failed')
      setStatus('idle')
    }
  }

  const switchTokens = () => {
    setSellToken(buyToken)
    setBuyToken(sellToken)
    setSellAmount('')
    setQuote(null)
    setError('')
    setStatus('idle')
  }

  const getStepStatus = () => {
    if (isSuccess) return 3
    if (status === 'swapping' || isConfirming) return 2
    if (status === 'approving' || isPending) return 1
    return 0
  }

  const currentStep = getStepStatus()

  const rate =
    quote?.buyAmount && sellAmount && Number(sellAmount) > 0
      ? (
          Number(formatUnits(BigInt(quote.buyAmount), buyToken.decimals)) / Number(sellAmount)
        ).toFixed(6)
      : null

  const minReceived = quote?.buyAmount
    ? (
        Number(formatUnits(BigInt(quote.buyAmount), buyToken.decimals)) *
        (1 - slippage / 100)
      ).toFixed(6)
    : null

  const busy = loading || isPending || isConfirming || status === 'approving' || isSwitching

  const buttonLabel = !isConnected
    ? 'Connect wallet'
    : isSwitching
      ? 'Switching network...'
      : !isBase
        ? 'Switch to Base Mainnet'
        : status === 'approving'
          ? 'Approving...'
          : isPending || isConfirming || status === 'swapping'
            ? 'Confirming...'
            : loading
              ? 'Finding best price...'
              : needsApproval(quote)
                ? `Approve ${sellToken.symbol}`
                : 'Swap'

  return (
    <div className="flex w-full max-w-4xl flex-col gap-6 lg:flex-row">
      <div className="relative w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Swap</h2>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-gray-400 transition hover:text-white"
          >
            ⚙️
          </button>
        </div>

        {showSettings && (
          <div className="rounded-xl border border-white/10 bg-black/40 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Slippage Tolerance</span>
              <div className="flex gap-2">
                {[0.1, 0.5, 1.0].map((val) => (
                  <button
                    key={val}
                    onClick={() => setSlippage(val)}
                    className={`rounded-lg px-2.5 py-1 text-xs transition ${
                      slippage === val
                        ? 'bg-white text-black'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {val}%
                  </button>
                ))}
                <input
                  type="number"
                  value={slippage}
                  onChange={(e) => setSlippage(Number(e.target.value))}
                  className="w-14 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-center text-xs outline-none"
                />
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3 rounded-xl border border-white/10 bg-black/40 p-4">
          <div className="flex justify-between text-sm text-gray-400">
            <span>You pay</span>
            <span>
              Balance:{' '}
              {isConnected
                ? Number(sellBalanceFormatted).toLocaleString(undefined, {
                    maximumFractionDigits: 6,
                  })
                : '—'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="number"
              value={sellAmount}
              onChange={(e) => setSellAmount(e.target.value)}
              placeholder="0.0"
              className="w-full bg-transparent text-2xl font-semibold outline-none"
            />
            <select
              value={sellToken.symbol}
              onChange={(e) => {
                const t = TOKENS.find((x) => x.symbol === e.target.value)
                if (t) setSellToken(t)
              }}
              className={SELECT_CLASS}
            >
              {TOKENS.map((t) => (
                <option key={t.symbol} value={t.symbol} className="bg-zinc-900 text-white">
                  {t.symbol}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            {[25, 50, 75, 100].map((p) => (
              <button
                key={p}
                onClick={() => setPercentage(p)}
                disabled={!isConnected}
                className="flex-1 rounded-lg bg-white/5 py-1.5 text-xs transition hover:bg-white/10 disabled:opacity-40"
              >
                {p === 100 ? 'Max' : `${p}%`}
              </button>
            ))}
          </div>
        </div>

        <div className="-my-1 flex justify-center">
          <button
            onClick={switchTokens}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg transition hover:bg-white/10"
          >
            ⇅
          </button>
        </div>

        <div className="space-y-2 rounded-xl border border-white/10 bg-black/40 p-4">
          <div className="flex justify-between text-sm text-gray-400">
            <span>You receive</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-full text-2xl font-semibold">
              {quote?.buyAmount
                ? Number(formatUnits(BigInt(quote.buyAmount), buyToken.decimals)).toFixed(6)
                : '0.0'}
            </div>
            <select
              value={buyToken.symbol}
              onChange={(e) => {
                const t = TOKENS.find((x) => x.symbol === e.target.value)
                if (t) setBuyToken(t)
              }}
              className={SELECT_CLASS}
            >
              {TOKENS.map((t) => (
                <option key={t.symbol} value={t.symbol} className="bg-zinc-900 text-white">
                  {t.symbol}
                </option>
              ))}
            </select>
          </div>
        </div>

        {quote?.buyAmount && sellAmount && Number(sellAmount) > 0 && (
          <div className="space-y-1.5 px-1 text-xs text-gray-400">
            <div className="flex justify-between">
              <span>Rate</span>
              <span>
                1 {sellToken.symbol} ≈ {rate} {buyToken.symbol}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Slippage</span>
              <span>{slippage}%</span>
            </div>
            <div className="flex justify-between">
              <span>Platform Fee</span>
              <span>0.25%</span>
            </div>
            {minReceived && (
              <div className="flex justify-between">
                <span>Minimum Received</span>
                <span>
                  {minReceived} {buyToken.symbol}
                </span>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-center text-sm text-red-400">{error}</p>}

        <button
          onClick={handleSwap}
          disabled={!isConnected || busy || (isBase && !quote?.transaction)}
          className="w-full rounded-xl bg-white py-3.5 font-semibold text-black transition hover:bg-gray-100 disabled:bg-white/10 disabled:text-gray-500"
        >
          {buttonLabel}
        </button>
      </div>

      <div className="w-full max-w-md space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h3 className="text-lg font-semibold text-white">Details</h3>

        <div className="space-y-4 text-sm">
          <div className="space-y-1 rounded-xl border border-white/10 bg-black/40 p-4">
            <p className="text-xs text-gray-500">Aggregator</p>
            <p className="font-medium text-white">Powered by 0x</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              Best price routing across Base DEXs
            </p>
          </div>

          <div className="space-y-1 rounded-xl border border-white/10 bg-black/40 p-4">
            <p className="text-xs text-gray-500">Network</p>
            <p className="font-medium text-white">Base Mainnet</p>
          </div>

          <div className="space-y-4 rounded-xl border border-white/10 bg-black/40 p-4">
            <p className="mb-2 text-xs text-gray-500">Transaction Progress</p>
            {[
              { id: 1, label: 'Approve / confirm in wallet' },
              { id: 2, label: 'Transaction pending' },
              { id: 3, label: 'Swap completed' },
            ].map((step) => (
              <div key={step.id} className="flex items-center gap-3">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    currentStep >= step.id
                      ? 'bg-white text-black'
                      : 'bg-white/5 text-gray-500'
                  }`}
                >
                  {currentStep > step.id ? '✓' : step.id}
                </div>
                <span
                  className={`text-sm ${currentStep >= step.id ? 'text-white' : 'text-gray-500'}`}
                >
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
                View on Basescan ↗
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}