import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import prisma from "@/lib/prisma"
import { sendVerificationEmail } from "@/lib/mail"

export async function POST(req: Request) {
  const { name, email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: "Email aur password zaroori hai" }, { status: 400 })
  }

  const existingUser = await prisma.user.findUnique({ where: { email } })

  if (existingUser) {
    return NextResponse.json({ error: "Ye email pehle se registered hai" }, { status: 400 })
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
  })

  // verification token banao
  const token = crypto.randomUUID()
  const expires = new Date(Date.now() + 1000 * 60 * 60) // 1 hour valid

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires,
    },
  })

  await sendVerificationEmail(email, token)

  return NextResponse.json({ message: "Signup successful, email verify karo", userId: user.id })
}