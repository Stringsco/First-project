"use client";

import { useState } from "react";

export default function SearchComments() {
  const [query, setQuery] = useState("");
  const [count, setCount] = useState(5);
  const [results, setResults] = useState<any[]>([]);
  const [deepResults, setDeepResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deepLoading, setDeepLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  // 1) Initial search
  async function fetchComments() {
    setLoading(true);
    setError("");
    setDeepResults([]);
    try {
      const res = await fetch(
        `/api/search-comments?query=${encodeURIComponent(query)}&count=${count}`
      );
      const json = await res.json();
      if (res.ok) setResults(json.videos);
      else setError(json.error || "Search failed");
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  // 2) Deep scrape per channel
  async function runDeepScraper() {
    setDeepLoading(true);
    setError("");
    const out: any[] = [];

    for (const v of results) {
      try {
        const res = await fetch(`/api/deep-scrape?channelId=${v.channelId}`);
        const json = await res.json();
        if (res.ok && json.videoId) out.push(json);
      } catch {
        // ignore individual errors
      }
    }

    setDeepResults(out);
    setDeepLoading(false);
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-extrabold mb-6 text-center text-blue-800">
        YouTube Comment & Deep Scraper
      </h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          className="flex-grow border border-gray-300 p-3 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="Enter search query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <input
          type="number"
          min={1}
          max={20}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="w-24 border border-gray-300 p-3 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          aria-label="Number of videos to fetch"
        />
        <input
          className="flex-grow border border-gray-300 p-3 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="Enter a filter text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-4 justify-center mb-8">
        <button
          onClick={fetchComments}
          disabled={!query || loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold px-6 py-2 rounded-md shadow-md transition"
        >
          {loading ? "Searching…" : "Search"}
        </button>

        <button
          onClick={runDeepScraper}
          disabled={!results.length || deepLoading}
          className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold px-6 py-2 rounded-md shadow-md transition"
        >
          {deepLoading ? "Scraping…" : "Deep Scraper"}
        </button>
      </div>

      {error && (
        <p className="text-center text-red-600 font-semibold mb-6">{error}</p>
      )}

      {/* Initial Results */}
      {results.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 border-b pb-2 text-gray-800">
            Initial Results
          </h2>

          <div className="space-y-6">
            {results.map((v) => {
              const filteredComments = v.comments.filter((c: any) =>
                c.text.toLowerCase().includes(filter.toLowerCase())
              );
              return (
                <article
                  key={v.videoId}
                  className="border rounded-lg p-5 shadow-sm hover:shadow-lg transition flex flex-col sm:flex-row gap-4"
                >
                  <img
                    src={v.channelAvatar}
                    alt={`${v.channelTitle} avatar`}
                    className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                    loading="lazy"
                  />
                  <div className="flex-grow">
                    <h3 className="font-semibold text-lg mb-1">{v.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{v.channelTitle}</p>
                    <div className="max-h-40 overflow-y-auto prose prose-sm">
                      <ul className="list-disc list-inside">
                        {filteredComments.length > 0 ? (
                          filteredComments.map((c: any, i: number) => (
                            <li key={i}>
                              <strong>{c.author}:</strong> {c.text}
                            </li>
                          ))
                        ) : (
                          <li>No comments found.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Deep Scrape Results */}
      {deepResults.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-4 border-b pb-2 text-green-800">
            Deep-Scraped From Latest Video
          </h2>

          <div className="space-y-8">
            {deepResults.map((v) => {
              const filteredComments = v.comments.filter((c: any) =>
                c.text.toLowerCase().includes(filter.toLowerCase())
              );
              return (
                <article
                  key={v.videoId}
                  className="border rounded-lg p-6 shadow-md hover:shadow-lg transition"
                >
                  <header className="flex items-center space-x-4 mb-3">
                    <img
                      src={v.channelAvatar}
                      alt={`${v.channelTitle} avatar`}
                      className="w-14 h-14 rounded-full object-cover"
                      loading="lazy"
                    />
                    <h3 className="text-xl font-semibold">{v.channelTitle}</h3>
                  </header>

                  <h4 className="font-bold text-lg mb-1">{v.videoTitle}</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Published: {new Date(v.publishedAt).toLocaleDateString()}
                  </p>

                  <div className="max-h-56 overflow-y-auto prose prose-sm">
                    <ul className="list-disc list-inside">
                      {filteredComments.length > 0 ? (
                        filteredComments.map((c: any, i: number) => (
                          <li key={i}>
                            <strong>{c.author}:</strong> <span dangerouslySetInnerHTML={{__html: c.text}}/>
                          </li>
                        ))
                      ) : (
                        <li>No comments found.</li>
                      )}
                    </ul>
                  </div>
                </article>
              );
            })}

          </div>
        </section>
      )}
    </div>
  );
}
