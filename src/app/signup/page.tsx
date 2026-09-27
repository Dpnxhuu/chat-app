"use client"

import { useState } from "react"
import Link from "next/link"
import { signIn } from "next-auth/react"

export default function SignupPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
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
          Create account
        </h2>
        <p
          style={{
            color: "#888",
            fontSize: 14,
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          Sign up to get started
        </p>

        {!success && (
          <>
            <button
              onClick={() => signIn("google", { callbackUrl: "/home" })}
              type="button"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                padding: "10px 0",
                marginBottom: 16,
                background: "#ffffff",
                color: "#1f1f1f",
                border: "1px solid #e0e0e0",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path
                  fill="#FFC107"
                  d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
                />
                <path
                  fill="#FF3D00"
                  d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
                />
                <path
                  fill="#4CAF50"
                  d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
                />
                <path
                  fill="#1976D2"
                  d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
                />
              </svg>
              Sign up with Google
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                margin: "16px 0",
                color: "#666",
                fontSize: 13,
              }}
            >
              <div style={{ flex: 1, height: 1, background: "#262626" }} />
              or
              <div style={{ flex: 1, height: 1, background: "#262626" }} />
            </div>
          </>
        )}

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
            Signup successful! Apna email check karo aur verification link pe click karo.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                display: "block",
                width: "100%",
                padding: "10px 12px",
                marginBottom: 12,
                background: "#0a0a0a",
                border: "1px solid #2e2e2e",
                borderRadius: 8,
                color: "#f5f5f5",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                display: "block",
                width: "100%",
                padding: "10px 12px",
                marginBottom: 12,
                background: "#0a0a0a",
                border: "1px solid #2e2e2e",
                borderRadius: 8,
                color: "#f5f5f5",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <input
              type="password"
              placeholder="Password"
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
              {loading ? "Signing up..." : "Sign Up"}
            </button>
          </form>
        )}

        {!success && (
          <p
            style={{
              color: "#888",
              fontSize: 13,
              textAlign: "center",
              marginTop: 16,
            }}
          >
            Already have an account?{" "}
            <Link href="/" style={{ color: "#f5f5f5" }}>
              Login
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}