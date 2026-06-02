import type { Response, NextFunction } from 'express'
import { WalletService } from '../services/wallet.service.js'
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js'

const service = new WalletService()

// The identity-service passes the user's Supabase access token to Core.
// We re-use the same token that was used to authenticate this request.
function getToken(req: AuthenticatedRequest): string {
  return req.headers.authorization!.slice(7)
}

export async function getBalance(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const balance = await service.getBalance(getToken(req))
    res.json(balance)
  } catch (err) {
    next(err)
  }
}

export async function getTransactions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = Math.min(parseInt(String(req.query['limit'] ?? '10'), 10), 50)
    const txs = await service.getTransactions(getToken(req), limit)
    res.json(txs)
  } catch (err) {
    next(err)
  }
}
