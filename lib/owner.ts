import { isAddress } from 'viem'

export function getOwnerAddresses(): string[] {
  const raw = process.env.OWNER_ADDRESSES || ''
  return raw
    .split(',')
    .map((a) => a.trim().toLowerCase())
    .filter((a) => isAddress(a))
}

export function isOwnerAddress(address?: string | null): boolean {
  if (!address || !isAddress(address)) return false
  return getOwnerAddresses().includes(address.toLowerCase())
}