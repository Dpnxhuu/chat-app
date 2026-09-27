import { NextResponse } from "next/server"
import crypto from "crypto"
import prisma from "@/lib/prisma"
import { sendPasswordResetEmail } from "@/lib/mail"

export async function POST(req: Request) {
  const { email } = await req.json()

  if (!email) {
    return NextResponse.json({ error: "Email zaroori hai" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email } })

  // Security: user exist kare ya na kare, hamesha same response do
  // (isse attacker ko pata nahi chalega kaunse emails registered hain)
  if (user) {
    const token = crypto.randomUUID()
    const expires = new Date(Date.now() + 1000 * 60 * 15) // 15 min valid

    await prisma.verificationToken.create({
      data: { identifier: email, token, expires },
    })

    await sendPasswordResetEmail(email, token)
  }

  return NextResponse.json({
    message: "Agar ye email registered hai, reset link bhej diya gaya hai",
  })
}