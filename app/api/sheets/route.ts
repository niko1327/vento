import { google } from "googleapis";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sheetId = searchParams.get("sheetId");

    // If no sheetId provided, use default or return error
    const SHEET_ID = sheetId || process.env.GOOGLE_SHEET_ID;

    if (!SHEET_ID) {
      return NextResponse.json(
        { error: "Sheet ID is required" },
        { status: 400 }
      );
    }

    // Check if credentials are set
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      return NextResponse.json(
        { error: "Google API credentials not configured" },
        { status: 500 }
      );
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Sheet1!A2:Z1000", // Adjust range as needed
    });

    return NextResponse.json({
      data: response.data.values || [],
      success: true,
    });
  } catch (error: any) {
    console.error("Google Sheets API Error:", error);
    
    return NextResponse.json(
      {
        error: error.message || "Failed to fetch sheet data",
        details: error.toString(),
        success: false,
      },
      { status: 500 }
    );
  }
}
