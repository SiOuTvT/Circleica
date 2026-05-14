import { MetadataRoute } from "next"

const BASE = process.env.NEXTAUTH_URL ?? "http://localhost:3000"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/login", "/register", "/forgot-password", "/reset-password"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  }
}