import { NextRequest, NextResponse } from "next/server";
import { Client } from "basic-ftp";
import { getFileList } from "@/lib/ftpstore";
import { Readable, PassThrough } from "stream";

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

    console.log(`Reading file: ${fullPath}`);
    const passThrough = new PassThrough();
    const chunks: Buffer[] = [];

    passThrough.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    passThrough.on("end", () => console.log("File download completed"));

    await client.downloadTo(passThrough, fullPath);

    const buffer = Buffer.concat(chunks);
    const isText = fileName.match(/\.(txt|md|js|ts|html|css|json)$/i);

    if (isText) {
      return new NextResponse(buffer.toString("utf-8"), {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    } else {
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      });
    }
  } catch (error) {
    console.error("Error reading file:", error);
    return NextResponse.json(
      { error: "Failed to read file" },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}