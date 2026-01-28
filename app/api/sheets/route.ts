import { google } from "googleapis";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sheetIdParam = searchParams.get("sheetId");

    const SHEET_ID = sheetIdParam || process.env.GOOGLE_SHEET_ID;

    if (!SHEET_ID) {
      return NextResponse.json(
        { error: "Sheet ID is required" },
        { status: 400 }
      );
    }

    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      return NextResponse.json(
        { error: "Google API credentials not configured" },
        { status: 500 }
      );
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "External!A2:Z",
    });

    const rows = response.data.values || [];

   const trips = rows
  .map((row) => {
    return {
      client: row[2] || "",
      plates: row[4] || "",
      loadDate: row[5] || "",
      loadCountry: row[6] || "",
      loadCity: row[7] || "",
      unloadDate: row[8] || "",
      unloadCountry: row[9] || "",
      unloadCity: row[10] || "",
      income: row[12] || "",
      orderNumber: row[15] || "",
    };
  })
  .filter((trip) => trip.client.trim() !== "" || trip.plates.trim() !== "")
  .reverse();


    return NextResponse.json({ data: trips });
  } catch (error: any) {
    console.error("Sheets API Error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to fetch sheet data",
        details: String(error),
      },
      { status: 500 }
    );
  }
}
