import { beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
const { verifyPassword } = vi.hoisted(() => ({ verifyPassword: vi.fn() }));

vi.mock("./db", () => ({ getPool: () => ({ query }) }));
vi.mock("./password", () => ({ verifyPassword }));

import { checkPassword, findByEmail } from "./users-repo";

beforeEach(() => {
  query.mockClear();
  verifyPassword.mockClear();
});

const userRow = {
  id: 1,
  email: "juan@lawho.org.ar",
  password_hash: "$argon2id$v=19$m=65536,p=4,t=3$abc$def",
  role: "writer",
  is_active: true,
};

describe("findByEmail", () => {
  it("returns the user for an existing email without exposing the hash", async () => {
    query.mockResolvedValueOnce({ rows: [userRow] });

    const user = await findByEmail("juan@lawho.org.ar");

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("FROM users WHERE email = $1"),
      ["juan@lawho.org.ar"],
    );
    expect(user).not.toBeNull();
    expect(user?.email).toBe("juan@lawho.org.ar");
    expect(user?.role).toBe("writer");
    expect(user).not.toHaveProperty("password_hash");
  });

  it("returns null for a missing email", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    expect(await findByEmail("nobody@lawho.org.ar")).toBeNull();
  });
});

describe("checkPassword", () => {
  it("returns the user for valid credentials", async () => {
    query.mockResolvedValueOnce({ rows: [userRow] });
    verifyPassword.mockResolvedValueOnce(true);

    const user = await checkPassword("juan@lawho.org.ar", "securePass123");

    expect(user?.email).toBe("juan@lawho.org.ar");
    expect(verifyPassword).toHaveBeenCalledWith(
      "securePass123",
      userRow.password_hash,
    );
  });

  it("returns null for a wrong password", async () => {
    query.mockResolvedValueOnce({ rows: [userRow] });
    verifyPassword.mockResolvedValueOnce(false);

    expect(await checkPassword("juan@lawho.org.ar", "wrongPass")).toBeNull();
  });

  it("returns null for a non-existent email and still verifies (timing)", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    verifyPassword.mockResolvedValueOnce(false);

    expect(await checkPassword("nobody@lawho.org.ar", "whatever")).toBeNull();
    expect(verifyPassword).toHaveBeenCalledTimes(1);
  });

  it("returns null for an inactive user", async () => {
    query.mockResolvedValueOnce({ rows: [{ ...userRow, is_active: false }] });
    verifyPassword.mockResolvedValueOnce(false);

    expect(
      await checkPassword("juan@lawho.org.ar", "securePass123"),
    ).toBeNull();
  });
});
