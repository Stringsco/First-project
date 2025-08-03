import axios from "axios";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const BASE_URL = "https://www.googleapis.com/youtube/v3";

if (!YOUTUBE_API_KEY) {
  throw new Error("Missing YOUTUBE_API_KEY in environment variables");
}

// Search videos by query, returns array of video info
export async function searchVideos(query: string, maxResults: number) {
  const res = await axios.get(`${BASE_URL}/search`, {
    params: {
      part: "snippet",
      q: query,
      maxResults,
      type: "video",
      order: "relevance",
      key: YOUTUBE_API_KEY,
    },
  });

  return (res.data.items || [])
    .filter((item: any) => item.id.videoId)
    .map((item: any) => ({
      videoId: item.id.videoId,
      channelId: item.snippet.channelId,         // ← grab channelId
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      publishTime: item.snippet.publishTime,
      comments: [],                              // placeholder
    }));
}

// Fetch comments for a given video ID
export async function getComments(videoId: string, maxResults = 50) {
  try {
    const res = await axios.get(`${BASE_URL}/commentThreads`, {
      params: {
        part: "snippet",
        videoId,
        maxResults,
        key: YOUTUBE_API_KEY,
      },
    });

    return res.data.items.map((item: any) => ({
      author: item.snippet.topLevelComment.snippet.authorDisplayName,
      text: item.snippet.topLevelComment.snippet.textDisplay,
      publishedAt: item.snippet.topLevelComment.snippet.publishedAt,
    }));
  } catch (error: any) {
    // Check if error indicates comments disabled
    if (
      error.response?.data?.error?.message?.includes(
        "disabled comments"
      )
    ) {
      // Return empty comments or a special flag
      return [];
    }
    throw error; // Re-throw other errors
  }
}


export async function getLatestVideoFromChannel(channelId: string) {
  const res = await axios.get(`${BASE_URL}/search`, {
    params: {
      key: YOUTUBE_API_KEY,
      part: "snippet",
      channelId,
      maxResults: 1,
      order: "date",
      type: "video",
    },
  });

  const item = res.data.items?.[0];
  if (!item || !item.id?.videoId) return null;

  return {
    videoId: item.id.videoId,
    title: item.snippet.title,
    publishedAt: item.snippet.publishedAt,
  };
}

export async function isShortVideo(videoId: string): Promise<boolean> {
  const res = await axios.get(`${BASE_URL}/videos`, {
    params: {
      key: YOUTUBE_API_KEY,
      part: "contentDetails",
      id: videoId,
    },
  });

  const duration = res.data.items?.[0]?.contentDetails?.duration;
  if (!duration) return false;

  // Duration is in ISO 8601 format, e.g. "PT45S" (45 seconds), "PT1M2S" (1 min 2 sec)
  const match = duration.match(/PT(?:(\d+)M)?(?:(\d+)S)?/);
  const minutes = parseInt(match?.[1] || "0", 10);
  const seconds = parseInt(match?.[2] || "0", 10);

  return (minutes * 60 + seconds) < 60;
}
export async function getCommentsFromLatestVideos(channels: string[]) {
  const results = await Promise.all(
    channels.map(async (channelId) => {
      const video = await getLatestVideoFromChannel(channelId);
      if (!video) return null;

      const isShort = await isShortVideo(video.videoId);
      if (!isShort) return null;

      const comments = await getComments(video.videoId, 20);
      return {
        channelId,
        videoTitle: video.title,
        videoId: video.videoId,
        publishedAt: video.publishedAt,
        comments,
      };
    })
  );

  return results.filter(Boolean); // remove nulls
}
