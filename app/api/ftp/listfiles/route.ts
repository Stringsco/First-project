import { NextRequest, NextResponse } from "next/server";
import { Client, FileType } from "basic-ftp";
import { v4 as uuidv4 } from "uuid";
import { setFileList, getFileList } from "@/lib/ftpstore";

interface FTPFile {
  name: string;
  size: number;
  type: 1 | 2;
}

export async function POST(req: NextRequest) {
  const client = new Client();
  try {
    const { sessionId, path } = await req.json();

    if (!sessionId || !path) {
      return NextResponse.json(
        { error: "Missing sessionId or path" },
        { status: 400 }
      );
    }

    const session = getFileList(sessionId);
    if (!session || !session.credentials) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    const { host, user, password, port } = session.credentials;
    const currentPath = session.currentPath === "/" ? "" : session.currentPath;
    const fullPath = path.startsWith("/")
      ? path
      : `${currentPath}/${path}`.replace(/\/+/g, "/");

    await client.access({
      host,
      user,
      password,
      port,
      secure: false,
    });

    console.log(`Connected to FTP server, listing path: ${fullPath}`);
    const files = await client.list(fullPath);
    const ftpFiles: FTPFile[] = files.map((file) => ({
      name: file.name,
      size: file.size || 0,
      type: file.type === FileType.File ? 1 : 2,
    }));

    const newSessionId = uuidv4();
    setFileList(newSessionId, ftpFiles, session.credentials, fullPath);

    return NextResponse.json({ sessionId: newSessionId });
  } catch (error) {
    console.error("Error fetching folder contents:", error);
    return NextResponse.json(
      { error: "Failed to fetch folder contents" },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}