import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT),
  secure: true,
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
})

export async function sendVerificationEmail(to: string, token: string) {
  const verifyUrl = `${process.env.AUTH_URL}/api/auth/verify-email?token=${token}`

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Apna email verify karo",
    html: `<p>Verify karne ke liye click karo: <a href="${verifyUrl}">${verifyUrl}</a></p>`,
  })
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const resetUrl = `${process.env.AUTH_URL}/reset-password?token=${token}`

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Password reset karo",
    html: `<p>Naya password set karne ke liye click karo: <a href="${resetUrl}">${resetUrl}</a></p><p>Ye link 15 minute me expire ho jaayega.</p>`,
  })
}