import { neon } from "@neondatabase/serverless";

export default async () => {
  try {
    const sql = neon(process.env.DATABASE_URL);

    const result = await sql`
      SELECT
        NOW() AS server_time,
        current_database() AS database_name
    `;

    return Response.json({
      success: true,
      message: "DroidZone database connected!",
      database: result[0].database_name,
      serverTime: result[0].server_time
    });

  } catch (error) {
    console.error("Database connection failed");

    return Response.json(
      {
        success: false,
        message: "Database connection failed"
      },
      { status: 500 }
    );
 
  }
};
