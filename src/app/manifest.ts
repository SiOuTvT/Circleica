import { MetadataRoute } from "next"

const BASE = process.env.NEXTAUTH_URL ?? "http://localhost:3000"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Circleica",
    short_name: "Circleica",
    description: "Circleica - 极客同人社区 | 完全免费开放的视觉小说档案库",
    start_url: "/",
    display: "standalone",
    background_color: "#08080a",
    theme_color: "#E0A87C",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  }
}
