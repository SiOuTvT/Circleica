import { execSync } from "node:child_process"
import fs from "node:fs"
const env = fs.readFileSync(".env", "utf8")
const m = env.match(/^DATABASE_URL=(.+)$/m)
if (!m) { console.error("DATABASE_URL not found in .env"); process.exit(1) }
const url = m[1].trim()
const script = execSync(`npx prisma migrate diff --from-url "${url}" --to-schema-datamodel prisma/schema.prisma --script`, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 })
console.log(script)
