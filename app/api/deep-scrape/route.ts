import { NextResponse } from "next/server";

const API_KEY = process.env.YOUTUBE_API_KEY!;
const BASE = "https://www.googleapis.com/youtube/v3";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const channelId = url.searchParams.get("channelId");

  if (!channelId) {
    return NextResponse.json({ error: "Missing channelId" }, { status: 400 });
  }

  try {
    const channelRes = await fetch(
      `${BASE}/channels?part=snippet&id=${channelId}&key=${API_KEY}`
    );
    const channelJson = await channelRes.json();

    const channelItem = channelJson.items?.[0];
    if (!channelItem) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const channelTitle = channelItem.snippet.title;
    const channelAvatar = channelItem.snippet.thumbnails.default.url;

    // 2) Fetch latest video of the channel
    const searchRes = await fetch(
      `${BASE}/search?key=${API_KEY}&channelId=${channelId}&order=date&maxResults=1&type=video&part=snippet`
    );
    const searchJson = await searchRes.json();

    const latestVideo = searchJson.items?.[0];
    if (!latestVideo) {
      return NextResponse.json({ error: "No videos found for this channel" }, { status: 404 });
    }

    const videoId = latestVideo.id.videoId;
    const videoTitle = latestVideo.snippet.title;
    const publishedAt = latestVideo.snippet.publishedAt;

    // 3) Fetch comments of that video
    const commentsRes = await fetch(
      `${BASE}/commentThreads?key=${API_KEY}&videoId=${videoId}&part=snippet&maxResults=20`
    );
    const commentsJson = await commentsRes.json();

    const comments = (commentsJson.items || []).map((c: any) => ({
      author: c.snippet.topLevelComment.snippet.authorDisplayName,
      text: c.snippet.topLevelComment.snippet.textDisplay,
    }));

    // Return combined data
    return NextResponse.json({
      channelId,
      channelTitle,
      channelAvatar,
      videoId,
      videoTitle,
      publishedAt,
      comments,
    });
  } catch (error) {
    console.error("Deep scrape error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
