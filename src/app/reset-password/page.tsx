"use client"

import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")

  // YE NAYA CHECK HAI — agar URL me token hi nahi hai, form dikhao mat
  if (!token) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
        }}
      >
        <p style={{ color: "#f87171", fontSize: 15 }}>
          Invalid link — koi reset request nahi mila.
        </p>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || "Kuch galat ho gaya")
      return
    }

    setSuccess(true)
    setTimeout(() => router.push("/"), 2000)
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          background: "#151515",
          border: "1px solid #262626",
          borderRadius: 12,
          padding: "32px 28px",
        }}
      >
        <h2 style={{ color: "#f5f5f5", fontSize: 22, textAlign: "center", marginBottom: 20 }}>
          Naya password set karo
        </h2>

        {success ? (
          <p style={{ color: "#4ade80", textAlign: "center" }}>
            Password reset ho gaya! Login page pe redirect ho raha hai...
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              placeholder="Naya password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                display: "block",
                width: "100%",
                padding: "10px 12px",
                marginBottom: 16,
                background: "#0a0a0a",
                border: "1px solid #2e2e2e",
                borderRadius: 8,
                color: "#f5f5f5",
                boxSizing: "border-box",
              }}
            />
            {error && (
              <p style={{ color: "#f87171", fontSize: 13, marginBottom: 12, textAlign: "center" }}>
                {error}
              </p>
            )}
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "10px 0",
                background: "#f5f5f5",
                color: "#0a0a0a",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reset Password
            </button>
          </form>
        )}
      </div>
    </div>
  )
}