import { NextRequest, NextResponse } from "next/server";
import { getFileList } from "@/lib/ftpstore";

interface FTPFile {
  name: string;
  size: number;
  type: 1 | 2;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params; 

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const session = getFileList(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  return NextResponse.json({ files: session.files });
}