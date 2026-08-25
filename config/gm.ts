export const GM_ADDRESS = '0xD191061aeFa032047c77687272817376fE42c7f2' as const

export const gmAbi = [
  {
    type: 'function',
    name: 'totalGMs',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'sayGM',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'userGMCount',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getUserGMCount',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'GMSaid',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'userTotal', type: 'uint256', indexed: false },
      { name: 'globalTotal', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
] as const