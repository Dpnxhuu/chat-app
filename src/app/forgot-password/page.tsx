"use client"

import { useState } from "react"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Kuch galat ho gaya")
        setLoading(false)
        return
      }

      setSuccess(true)
    } catch {
      setError("Server se connect nahi ho paya")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
        padding: 20,
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
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        }}
      >
        <h2
          style={{
            color: "#f5f5f5",
            fontSize: 24,
            fontWeight: 600,
            marginBottom: 4,
            textAlign: "center",
          }}
        >
          Forgot password?
        </h2>
        <p
          style={{
            color: "#888",
            fontSize: 14,
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          Email daalo, reset link bhej denge
        </p>

        {success ? (
          <p
            style={{
              color: "#4ade80",
              background: "rgba(74, 222, 128, 0.1)",
              border: "1px solid rgba(74, 222, 128, 0.3)",
              borderRadius: 8,
              padding: "12px",
              fontSize: 13,
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            Agar ye email registered hai, reset link bhej diya gaya hai. Apna inbox check karo.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                display: "block",
                width: "100%",
                padding: "10px 12px",
                marginBottom: 16,
                background: "#0a0a0a",
                border: "1px solid #2e2e2e",
                borderRadius: 8,
                color: "#f5f5f5",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />

            {error && (
              <p
                style={{
                  color: "#f87171",
                  fontSize: 13,
                  marginBottom: 12,
                  textAlign: "center",
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "10px 0",
                background: loading ? "#888" : "#f5f5f5",
                color: "#0a0a0a",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}

        <p
          style={{
            color: "#888",
            fontSize: 13,
            textAlign: "center",
            marginTop: 16,
          }}
        >
          Yaad aa gaya password?{" "}
          <Link href="/" style={{ color: "#f5f5f5" }}>
            Login
          </Link>
        </p>
      </div>
    </div>
  )
}