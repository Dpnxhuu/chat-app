import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get("token")

  if (!token) {
    return NextResponse.json({ error: "Token missing hai" }, { status: 400 })
  }

  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token },
  })

  if (!verificationToken || verificationToken.expires < new Date()) {
    return NextResponse.json({ error: "Token invalid ya expire ho gaya" }, { status: 400 })
  }

  await prisma.user.update({
    where: { email: verificationToken.identifier },
    data: { emailVerified: new Date() },
  })

  // token use ho gaya, delete kar do
  await prisma.verificationToken.delete({ where: { token } })

  return NextResponse.redirect(new URL("/?verified=true", req.url))
}