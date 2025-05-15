import { NextRequest, NextResponse } from "next/server";
import { Client, FileType } from "basic-ftp";
import { getFileList, setFileList } from "@/lib/ftpstore";
import { v4 as uuidv4 } from "uuid";
import { Readable } from "stream"; 

interface FTPFile {
  name: string;
  size: number;
  type: 1 | 2;
}

export async function POST(req: NextRequest) {
  const client = new Client();
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const sessionId = formData.get("sessionId") as string;

    if (!file || !sessionId) {
      return NextResponse.json(
        { error: "Missing file or sessionId" },
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
    const fullPath = `${currentPath}/${file.name}`.replace(/\/+/g, "/");

    await client.access({
      host,
      user,
      password,
      port,
      secure: false,
    });

    console.log(`Uploading file to: ${fullPath}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = Readable.from(buffer); 
    await client.uploadFrom(stream, fullPath);

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
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}