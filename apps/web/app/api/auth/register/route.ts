import { NextRequest, NextResponse } from "next/server";
import { registerUser } from "@/lib/actions";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const result = await registerUser(formData);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
