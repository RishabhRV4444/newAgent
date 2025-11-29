import type { Request, Response, NextFunction } from "express"
import { hash, verify } from "./utils/crypto"
import { db, schema } from "./db"
import { randomUUID } from "crypto"
import { eq } from "drizzle-orm"

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    username: string
    email: string
  }
}

export async function createUser(username: string, email: string, password: string) {
  const hashedPassword = await hash(password)
  const userId = randomUUID()

  const result = await db
    .insert(schema.users)
    .values({
      id: userId,
      username,
      email,
      password: hashedPassword,
    })
    .returning()

  return result[0]
}

export async function findUserByUsername(username: string) {
  const result = await db.select().from(schema.users).where(eq(schema.users.username, username))

  return result[0]
}

export async function findUserById(id: string) {
  const result = await db.select().from(schema.users).where(eq(schema.users.id, id))

  return result[0]
}

export async function verifyPassword(password: string, hashedPassword: string) {
  return verify(password, hashedPassword)
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // If session contains a userId, load the user and attach it to req.user
    const sessionAny: any = (req as any).session
    if (sessionAny && sessionAny.userId) {
      const user = await findUserById(sessionAny.userId)
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" })
      }
      req.user = {
        id: user.id,
        username: user.username,
        email: user.email,
      }
      return next()
    }

    return res.status(401).json({ error: "Unauthorized" })
  } catch (err) {
    console.error("requireAuth error:", err)
    return res.status(500).json({ error: "Internal Server Error" })
  }
}
