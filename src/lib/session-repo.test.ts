import { beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock("./db", () => ({ getPool: () => ({ query }) }));

import {
  createSession,
  deleteSessionByToken,
  getActiveSession,
  getActiveSessionAndTouch,
  touchSession,
} from "./session-repo";

const futureExpiry = () => new Date(Date.now() + 60_000);
const pastExpiry = () => new Date(Date.now() - 60_000);

const sessionRow = {
  user_id: 7,
  email: "juan@lawho.org.ar",
  role: "writer",
  expires_at: futureExpiry(),
};

describe("createSession", () => {
  it("inserts a session row with the token and a computed expiry", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await createSession(7, "tok", 86_400_000);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO sessions"),
      [7, "tok", expect.any(Date)],
    );
  });
});

describe("getActiveSession", () => {
  it("returns the joined user for a valid, non-expired token", async () => {
    query.mockResolvedValueOnce({ rows: [sessionRow] });

    const session = await getActiveSession("tok");

    expect(session).not.toBeNull();
    expect(session?.userId).toBe(7);
    expect(session?.email).toBe("juan@lawho.org.ar");
    expect(session?.role).toBe("writer");
  });

  it("returns null for a tampered (unknown) token", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    expect(await getActiveSession("bad-token")).toBeNull();
  });

  it("deletes the row and returns null for an expired session", async () => {
    query.mockResolvedValueOnce({
      rows: [{ ...sessionRow, expires_at: pastExpiry() }],
    });
    query.mockResolvedValueOnce({ rows: [] });

    const session = await getActiveSession("expired");

    expect(session).toBeNull();
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM sessions"),
      ["expired"],
    );
  });
});

describe("touchSession", () => {
  it("extends the expiry window for the token", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await touchSession("tok", 86_400_000);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE sessions"),
      ["tok", expect.any(Date)],
    );
  });
});

describe("getActiveSessionAndTouch", () => {
  beforeEach(() => {
    query.mockReset();
  });

  it("returns the session and slides the TTL for a valid token", async () => {
    query.mockResolvedValueOnce({ rows: [sessionRow] }); // SELECT in getActiveSession
    query.mockResolvedValueOnce({ rows: [] }); // UPDATE in touchSession

    const session = await getActiveSessionAndTouch("tok", 86_400_000);

    expect(session).not.toBeNull();
    expect(session?.userId).toBe(7);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE sessions"),
      ["tok", expect.any(Date)],
    );
  });

  it("does not slide the TTL for an unknown token", async () => {
    query.mockResolvedValueOnce({ rows: [] }); // SELECT returns nothing

    const session = await getActiveSessionAndTouch("bad-token", 86_400_000);

    expect(session).toBeNull();
    expect(query).not.toHaveBeenCalledWith(
      expect.stringContaining("UPDATE sessions"),
      expect.anything(),
    );
  });
});

describe("deleteSessionByToken", () => {
  it("deletes the session row", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await deleteSessionByToken("tok");

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM sessions"),
      ["tok"],
    );
  });
});
