
import { neon } from "@neondatabase/serverless";
import { createHash } from "node:crypto";

export default async (request, context) => {
  if (request.method !== "POST") {
    return Response.json(
      { success: false, message: "Method not allowed" },
      { status: 405 }
    );
  }

  const allowedOrigin =
    process.env.SITE_ORIGIN ||
    "https://droidzonetech.netlify.app";

  if (request.headers.get("origin") !== allowedOrigin) {
    return Response.json(
      { success: false, message: "Invalid origin" },
      { status: 403 }
    );
  }

  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("Database configuration missing");
    }

    const token = await context.cookies.get("__Host-dz_session");

    if (!token) {
      return Response.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const keyId = String(body.keyId || "");

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(keyId)
    ) {
      return Response.json(
        { success: false, message: "Invalid key ID" },
        { status: 400 }
      );
    }

    const tokenHash = createHash("sha256")
      .update(token)
      .digest("hex");

    const sql = neon(process.env.DATABASE_URL);

    const result = await sql`
      WITH valid_session AS (
        SELECT user_id
        FROM user_sessions
        WHERE token_hash = ${tokenHash}
          AND revoked_at IS NULL
          AND expires_at > NOW()
        LIMIT 1
      )
      UPDATE dzkeys
      SET revoked_at = NOW()
      WHERE id = ${keyId}
        AND user_id = (SELECT user_id FROM valid_session)
        AND revoked_at IS NULL
      RETURNING id
    `;

    if (!result.length) {
      return Response.json(
        { success: false, message: "Key not found or already revoked" },
        { status: 404 }
      );
    }

    return Response.json(
      {
        success: true,
        message: "Key revoked successfully"
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );

  } catch (error) {
    console.error("Key revocation failed");

    return Response.json(
      { success: false, message: "Could not revoke key" },
      { status: 500 
      }
    );
  }
};
