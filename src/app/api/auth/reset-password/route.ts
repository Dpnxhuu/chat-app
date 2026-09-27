import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"

export async function POST(req: Request) {
  const { token, password } = await req.json()

  if (!token || !password) {
    return NextResponse.json({ error: "Token aur password zaroori hai" }, { status: 400 })
  }

  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token },
  })

  if (!verificationToken || verificationToken.expires < new Date()) {
    return NextResponse.json({ error: "Link invalid ya expire ho gaya" }, { status: 400 })
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  await prisma.user.update({
    where: { email: verificationToken.identifier },
    data: {
      password: hashedPassword,
      sessionVersion: { increment: 1 }, // logout-everywhere trigger
    },
  })

  await prisma.verificationToken.delete({
    where: {
      identifier_token: {
        identifier: verificationToken.identifier,
        token: verificationToken.token,
      },
    },
  })

  return NextResponse.json({ message: "Password reset ho gaya" })
}