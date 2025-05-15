import { NextRequest, NextResponse } from "next/server";
import { Client, FileType } from "basic-ftp";
import { getFileList, setFileList } from "@/lib/ftpstore";
import { v4 as uuidv4 } from "uuid";

interface FTPFile {
  name: string;
  size: number;
  type: 1 | 2;
}

export async function POST(req: NextRequest) {
  const client = new Client();
  try {
    const { sessionId, fileName } = await req.json();

    if (!sessionId || !fileName) {
      return NextResponse.json(
        { error: "Missing sessionId or fileName" },
        { status: 400 }
      );
    }

    if (fileName.includes("..") || fileName.includes("/")) {
      return NextResponse.json(
        { error: "Invalid file name" },
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
    const fullPath = `${currentPath}/${fileName}`.replace(/\/+/g, "/");

    await client.access({
      host,
      user,
      password,
      port,
      secure: false,
    });

    console.log(`Deleting file: ${fullPath}`);
    await client.remove(fullPath);

    const files = await client.list(currentPath);
    const ftpFiles: FTPFile[] = files.map((file) => ({
      name: file.name,
      size: file.size || 0,
      type: file.type === FileType.File ? 1 : 2,
    }));

    const newSessionId = uuidv4();
    setFileList(newSessionId, ftpFiles, session.credentials, currentPath);

    return NextResponse.json({ sessionId: newSessionId });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}