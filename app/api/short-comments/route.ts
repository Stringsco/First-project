import { NextResponse } from "next/server";
import { getCommentsFromLatestVideos } from "@/lib/youtube";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.getAll("channelId"); // ?channelId=a&channelId=b&...

  if (!ids.length) {
    return NextResponse.json({ error: "Missing channelId[] params" }, { status: 400 });
  }

  try {
    const data = await getCommentsFromLatestVideos(ids);
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
