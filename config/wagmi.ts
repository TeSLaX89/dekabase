import { http, createConfig } from 'wagmi'
import { base, baseSepolia, mainnet, arbitrum, optimism, polygon } from 'wagmi/chains'
import { injected, baseAccount } from 'wagmi/connectors'
import { cookieStorage, createStorage } from 'wagmi'
import { defineChain } from 'viem'
import { Attribution } from 'ox/erc8021'

const ink = defineChain({
  id: 57073,
  name: 'Ink',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc-gel.inkonchain.com'] },
  },
  blockExplorers: {
    default: { name: 'Ink Explorer', url: 'https://explorer.inkonchain.com' },
  },
})

const DATA_SUFFIX = Attribution.toDataSuffix({
  codes: ['bc_37flpbo4'],
})

export const config = createConfig({
  chains: [base, baseSepolia, mainnet, arbitrum, optimism, polygon, ink],
  connectors: [
    baseAccount(),
    injected({ target: 'metaMask' }),
    injected({ target: 'rabby' }),
    injected(),
  ],
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  transports: {
    [base.id]: http('https://mainnet.base.org'),
    [baseSepolia.id]: http('https://base-sepolia-rpc.publicnode.com'),
    [mainnet.id]: http('https://eth.llamarpc.com'),
    [arbitrum.id]: http('https://arb1.arbitrum.io/rpc'),
    [optimism.id]: http('https://mainnet.optimism.io'),
    [polygon.id]: http('https://polygon-rpc.com'),
    [ink.id]: http('https://rpc-gel.inkonchain.com'),
  },
  dataSuffix: DATA_SUFFIX,
})