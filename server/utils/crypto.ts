import crypto from "crypto"

const SALT_ROUNDS = 10

export async function hash(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16)
    crypto.pbkdf2(password, salt, 100000, 64, "sha512", (err, derivedKey) => {
      if (err) reject(err)
      const hashedPassword = salt.toString("hex") + ":" + derivedKey.toString("hex")
      resolve(hashedPassword)
    })
  })
}

export async function verify(password: string, hashedPassword: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const parts = hashedPassword.split(":")
    const salt = Buffer.from(parts[0], "hex")
    const key = Buffer.from(parts[1], "hex")

    crypto.pbkdf2(password, salt, 100000, 64, "sha512", (err, derivedKey) => {
      if (err) reject(err)
      resolve(key.equals(derivedKey))
    })
  })
}
