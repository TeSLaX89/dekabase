import { NextRequest, NextResponse } from 'next/server'
import { isOwnerAddress } from '@/lib/owner'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const address = body.address

    return NextResponse.json({
      isOwner: isOwnerAddress(address),
    })
  } catch {
    return NextResponse.json({ isOwner: false }, { status: 400 })
  }
}