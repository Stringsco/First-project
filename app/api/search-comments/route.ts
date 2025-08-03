import { NextResponse } from "next/server";
import { searchVideos, getComments } from "@/lib/youtube";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("query") || "";
  const count = Number(searchParams.get("count")) || 5;

  if (!q) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const videos = await searchVideos(q, count);
  // fetch comments for each
  const withComments = await Promise.all(
    videos.map(async (v: any) => ({
      ...v,
      comments: await getComments(v.videoId, 20),
    }))
  );

  return NextResponse.json({ videos: withComments });
}
