import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
  },
  providers: [
    Google({
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) return null;

        if (!user.emailVerified) return null; // YE NAYI LINE HAI

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password,
        );

        if (!isValid) return null;

        return user;
      },
    }),
  ],
  callbacks: {
  authorized: async ({ auth, request }) => {
  const isLoggedIn = !!auth;
  const path = request.nextUrl.pathname;
  const hasToken = request.nextUrl.searchParams.has("token");

  const isOnHome = path === "/home";
  const isAuthPage = path === "/" || path === "/signup" || path === "/forgot-password";
  const isResetPassword = path === "/reset-password";

  if (isOnHome && !isLoggedIn) return false;

  if (isAuthPage && isLoggedIn) {
    return Response.redirect(new URL("/home", request.nextUrl));
  }

  // reset-password: token na ho toh block, login ho toh bhi block

  if(isResetPassword && isLoggedIn){
    return Response.redirect(new URL("/home", request.nextUrl));
  }

  if (isResetPassword && !hasToken) {
    return Response.redirect(new URL("/", request.nextUrl));
  }

  return true;
},
  jwt: async ({ token, user }) => {
  if (user) {
    token.id = user.id;
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    token.sessionVersion = dbUser?.sessionVersion ?? 0;
    return token;
  }

  // guest hai (kabhi login hi nahi hua) — kuch check mat karo
  if (!token.id) {
    return token;
  }

  const dbUser = await prisma.user.findUnique({ where: { id: token.id as string } });

  if (!dbUser || dbUser.sessionVersion !== token.sessionVersion) {
    throw new Error("SessionExpired");
  }

  return token;
},
  session: async ({ session, token }) => {
    if (token.id) session.user.id = token.id as string;
    return session;
  },
},
});
