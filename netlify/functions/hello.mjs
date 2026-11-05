export default async () => {
  return new Response(
    JSON.stringify({
      success: true,
      message: "DroidZone API is running!"
    }),
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
};
