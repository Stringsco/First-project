import { NextRequest, NextResponse } from "next/server";
import { Client, FileType } from "basic-ftp";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { setFileList } from "@/lib/ftpstore";

interface FTPFile {
  name: string;
  size: number;
  type: 1 | 2;
}

export async function POST(req: NextRequest) {
  const client = new Client();
  try {
    const { host, user, password, port, path = "/" } = await req.json();

    if (!host || !user || !password || !port) {
      return NextResponse.json(
        { error: "Missing required FTP credentials" },
        { status: 400 }
      );
    }

    await client.access({
      host,
      user,
      password,
      port,
      secure: false,
    });

    console.log("Connected to FTP server successfully.");
    const files = await client.list(path);
    console.log("Files fetched from FTP server:", files);

    const ftpFiles: FTPFile[] = files.map((file) => ({
      name: file.name,
      size: file.size || 0,
      type: file.type === FileType.File ? 1 : 2,
    }));

    const sessionId = uuidv4();
    setFileList(sessionId, ftpFiles, { host, user, password, port }, path);

    const cookieStore = cookies();
    (await cookieStore).set("ftp_session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 300,
      path: "/",
    });

    return NextResponse.json({ sessionId });
  } catch (error) {
    console.error("Error fetching files:", error);
    return NextResponse.json(
      { error: "Failed to fetch files from FTP server" },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}