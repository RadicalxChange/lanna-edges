import prisma from "@/db"
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  // Extract the query parameters from the request URL
  const searchParams = request.nextUrl.searchParams
  try {
    const secret = searchParams.get("secret");

    // Validate secret
    if (secret !== process.env.NETLIFY_SECRET) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("Running scheduled function for depreciating value_creation.");

    const count = await prisma.$executeRaw`UPDATE "Account" SET "value_creation" = FLOOR("value_creation" * 0.95)`;
    
    console.log(`Updated value_creation for ${count} accounts`);

    return new Response(
        JSON.stringify({ message: `Successfully updated value_creation for ${count} accounts.` }),
        { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    // Log the error for debugging and respond with a 500 error for unexpected issues
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}