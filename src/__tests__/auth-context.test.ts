/**
 * 角色层级与权限测试
 * @jest-environment node
 */

// 测试 ROLE_LEVEL 映射逻辑（与 auth-context.ts 一致）
const ROLE_LEVEL: Record<string, number> = {
  USER: 0,
  ADMIN: 1,
  SUPER_ADMIN: 2,
}

function checkRole(userRole: string, minimumRole: string): boolean {
  return (ROLE_LEVEL[userRole] ?? 0) >= (ROLE_LEVEL[minimumRole] ?? 0)
}

describe("Role hierarchy", () => {
  it("USER can access USER-level", () => {
    expect(checkRole("USER", "USER")).toBe(true)
  })

  it("USER cannot access ADMIN-level", () => {
    expect(checkRole("USER", "ADMIN")).toBe(false)
  })

  it("USER cannot access SUPER_ADMIN-level", () => {
    expect(checkRole("USER", "SUPER_ADMIN")).toBe(false)
  })

  it("ADMIN can access USER-level", () => {
    expect(checkRole("ADMIN", "USER")).toBe(true)
  })

  it("ADMIN can access ADMIN-level", () => {
    expect(checkRole("ADMIN", "ADMIN")).toBe(true)
  })

  it("ADMIN cannot access SUPER_ADMIN-level", () => {
    expect(checkRole("ADMIN", "SUPER_ADMIN")).toBe(false)
  })

  it("SUPER_ADMIN can access all levels", () => {
    expect(checkRole("SUPER_ADMIN", "USER")).toBe(true)
    expect(checkRole("SUPER_ADMIN", "ADMIN")).toBe(true)
    expect(checkRole("SUPER_ADMIN", "SUPER_ADMIN")).toBe(true)
  })

  it("unknown role treated as USER (level 0) — can access USER-level", () => {
    expect(checkRole("UNKNOWN", "USER")).toBe(true) // 0 >= 0
    expect(checkRole("UNKNOWN", "ADMIN")).toBe(false)
  })
})
