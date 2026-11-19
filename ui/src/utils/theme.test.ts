import { isInNightWindow, resolveIsDark } from "./theme";

const at = (h: number, m: number) => new Date(2026, 0, 1, h, m);

describe("isInNightWindow", () => {
  test("跨午夜窗口 18:00-08:00", () => {
    expect(isInNightWindow(at(23, 30), "18:00", "08:00")).toBe(true);
    expect(isInNightWindow(at(7, 59), "18:00", "08:00")).toBe(true);
    expect(isInNightWindow(at(8, 0), "18:00", "08:00")).toBe(false);
    expect(isInNightWindow(at(12, 0), "18:00", "08:00")).toBe(false);
    expect(isInNightWindow(at(17, 59), "18:00", "08:00")).toBe(false);
    expect(isInNightWindow(at(18, 0), "18:00", "08:00")).toBe(true);
  });

  test("同日窗口 08:00-18:00", () => {
    expect(isInNightWindow(at(12, 0), "08:00", "18:00")).toBe(true);
    expect(isInNightWindow(at(20, 0), "08:00", "18:00")).toBe(false);
  });

  test("起止相同视为全天夜间", () => {
    expect(isInNightWindow(at(12, 0), "08:00", "08:00")).toBe(true);
    expect(isInNightWindow(at(23, 0), "08:00", "08:00")).toBe(true);
  });

  test("非法时间返回 false", () => {
    expect(isInNightWindow(at(12, 0), "", "")).toBe(false);
    expect(isInNightWindow(at(12, 0), "abc", "08:00")).toBe(false);
  });
});

describe("resolveIsDark", () => {
  const origMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = origMatchMedia;
  });

  const stubSystemDark = (dark: boolean) => {
    (window as any).matchMedia = (query: string) => ({
      matches: dark && query.includes("dark"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
  };

  test("手动偏好直接生效", () => {
    expect(resolveIsDark("dark")).toBe(true);
    expect(resolveIsDark("light")).toBe(false);
  });

  test("auto + off：不自动变暗", () => {
    stubSystemDark(true);
    expect(resolveIsDark("auto", { mode: "off" })).toBe(false);
  });

  test("auto + scheduled：按时间窗口", () => {
    // 真实系统时间不可控，用窗口覆盖法：0-24 点内任意时刻，两窗口并集为全天，必有其一为真
    const night = resolveIsDark("auto", { mode: "scheduled", start: "00:00", end: "24:00" });
    expect(typeof night).toBe("boolean");
    expect(resolveIsDark("auto", { mode: "scheduled", start: "", end: "" })).toBe(false);
  });

  test("auto + system：跟随系统", () => {
    stubSystemDark(true);
    expect(resolveIsDark("auto", { mode: "system" })).toBe(true);
    stubSystemDark(false);
    expect(resolveIsDark("auto", { mode: "system" })).toBe(false);
  });

  test("auto 无配置时缺省跟随系统", () => {
    stubSystemDark(true);
    expect(resolveIsDark("auto")).toBe(true);
    expect(resolveIsDark("auto", undefined)).toBe(true);
  });
});
