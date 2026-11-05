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
    process.env.SITE_ORIGIN || "https://droidzonetech.netlify.app";

  if (request.headers.get("origin") !== allowedOrigin) {
    return Response.json(
      { success: false, message: "Invalid origin" },
      { status: 403 }
    );
  }

  try {
    const token = await context.cookies.get("__Host-dz_session");

    if (token && process.env.DATABASE_URL) {
      const sql = neon(process.env.DATABASE_URL);

      const tokenHash = createHash("sha256")
        .update(token)
        .digest("hex");

      await sql`
        UPDATE user_sessions
        SET revoked_at = NOW()
        WHERE token_hash = ${tokenHash}
          AND revoked_at IS NULL
      `;
    }

    context.cookies.delete("__Host-dz_session");

    return Response.json(
      {
        success: true,
        message: "Logged out successfully"
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch {
    return Response.json(
      { success: false, message: "Logout failed" },
      { status: 500 }
   
      );
  }
};
