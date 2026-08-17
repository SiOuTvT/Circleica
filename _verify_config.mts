// 临时验证脚本：实际加载 next.config.ts 的最终配置，确认 transpilePackages 来源与 drop 是否生效
process.env.SENTRY_DSN = "https://examplePublicKey@o0.ingest.sentry.io/0";
process.env.NEXT_PUBLIC_SENTRY_DSN = "https://examplePublicKey@o0.ingest.sentry.io/0";
process.env.NODE_ENV = "production";

const t0 = Date.now();
const mod = await import("./next.config.ts");
const cfg = (await mod.default) as any;
console.log("ELAPSED_MS", Date.now() - t0);
console.log("default typeof:", typeof mod.default);
console.log("transpilePackages:", JSON.stringify(cfg?.transpilePackages ?? null));
console.log("serverExternalPackages:", JSON.stringify(cfg?.serverExternalPackages ?? null));
console.log("has webpack fn:", typeof cfg?.webpack);
