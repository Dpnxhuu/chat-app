export { auth as proxy } from "@/auth"

export const config = {
  matcher: ["/", "/home", "/signup", "/reset-password", "/forgot-password"],
}