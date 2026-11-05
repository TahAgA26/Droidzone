
import { neon } from "@neondatabase/serverless";
import { createHash, randomBytes } from "node:crypto";

export default async (request, context) => {
  if (request.method !== "POST") {
    return Response.json(
      { success: false, message: "Method not allowed" },
      { status: 405 }
    );
  }

  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("Database configuration missing");
    }

    const body = await request.json();

    const email = String(body.email || "").trim().toLowerCase();
    const key = String(body.dzkey?.key || "");

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !/^[A-Za-z0-9_-]{43}$/.test(key)
    ) {
      return Response.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    const sql = neon(process.env.DATABASE_URL);

    const keyHash = createHash("sha256")
      .update(key)
      .digest("hex");

    const users = await sql`
      SELECT u.id AS user_id, d.id AS key_id
      FROM users u
      JOIN dzkeys d ON d.user_id = u.id
      WHERE u.email = ${email}
        AND d.key_hash = ${keyHash}
        AND d.revoked_at IS NULL
        AND (d.expires_at IS NULL OR d.expires_at > NOW())
      LIMIT 1
    `;

    if (!users.length) {
      return Response.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = randomBytes(32).toString("base64url");

    const tokenHash = createHash("sha256")
      .update(token)
      .digest("hex");

    await sql`
      INSERT INTO user_sessions
        (user_id, token_hash, expires_at, last_used_at)
      VALUES (
        ${users[0].user_id},
        ${tokenHash},
        NOW() + INTERVAL '7 days',
        NOW()
      )
    `;

    await sql`
      UPDATE dzkeys
      SET last_used_at = NOW()
      WHERE id = ${users[0].key_id}
    `;

    context.cookies.set({
      name: "__Host-dz_session",
      value: token,
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: 604800
    });

    return Response.json(
      {
        success: true,
        message: "Login successful"
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );

  } catch (error) {
    console.error("Login failed");

    return Response.json(
      { success: false, message: "Login failed" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store"
        }
   
      }
    );
  }
};
