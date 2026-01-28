} catch (error: any) {
  console.error("Sheets API Error FULL:", error);  // <– make sure this line exists
  return NextResponse.json(
    {
      error: error.message || "Failed to fetch sheet data",
      details: error.toString(),
    },
    { status: 500 }
  );
}
