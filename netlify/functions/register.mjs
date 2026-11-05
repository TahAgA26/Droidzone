
import { neon } from "@neondatabase/serverless";
import { randomBytes, createHash } from "node:crypto";

export default async (request) => {
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
    const username = String(body.username || "").trim();

    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      username.length < 3 ||
      username.length > 24 ||
      !/^[a-zA-Z0-9_]+$/.test(username)
    ) {
      return Response.json(
        { success: false, message: "Invalid email or username" },
        { status: 400 }
      );
    }

    const key = randomBytes(32).toString("base64url");

    const keyHash = createHash("sha256")
      .update(key)
      .digest("hex");

    const sql = neon(process.env.DATABASE_URL);

    const result = await sql`
      WITH new_user AS (
        INSERT INTO users (email, username)
        VALUES (${email}, ${username})
        RETURNING id
      )
      INSERT INTO dzkeys (user_id, key_hash, key_name)
      SELECT id, ${keyHash}, 'Primary device'
      FROM new_user
      RETURNING id
    `;

    if (result.length === 0) {
      throw new Error("Registration failed");
    }

    const dzkey = JSON.stringify({
      version: 1,
      key: key
    });

    return Response.json(
      {
        success: true,
        message: "Account created",
        dzkey
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );

  } catch (error) {
    if (error.code === "23505") {
      return Response.json(
        {
          success: false,
          message: "Email or username already exists"
        },
        { status: 409 }
      );
    }

    console.error("Registration error");

    return Response.json(
      { success: false, message: "Registration failed" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }
};

export const config = {
  path: "/.netlify/functions/register",
  rateLimit: {
    windowLimit: 5,
    windowSize: 60,
    aggregateBy: ["ip"]
  }
};
