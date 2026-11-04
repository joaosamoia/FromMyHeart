// app/api/musica-titulo/route.ts
// Descobre o nome da música pelo link (Spotify ou YouTube), usando o oEmbed
// público de cada um. O /criar chama isso quando a pessoa cola o link e deixa
// o campo do nome vazio — assim a música nunca fica "sem nome".
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url).searchParams.get("url") ?? "";
  let alvo = "";
  if (/^https?:\/\/(open\.spotify\.com|spotify\.link)\//i.test(url)) alvo = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
  else if (/^https?:\/\/((www|m|music)\.)?(youtube\.com|youtu\.be)\//i.test(url)) alvo = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url.replace("music.youtube.com", "www.youtube.com"))}`;
  if (!alvo) return NextResponse.json({ title: "" }, { status: 400 });
  try {
    const r = await fetch(alvo, { signal: AbortSignal.timeout(5000), headers: { "user-agent": "datecriativo-bot" } });
    if (!r.ok) return NextResponse.json({ title: "" });
    const j = (await r.json()) as { title?: string; author_name?: string };
    let title = (j.title ?? "").trim();
    // YouTube: "Ed Sheeran - Perfect (Official Music Video)" → limpa o "(Official…)"
    title = title.replace(/\s*[([](official|clipe|video|vídeo|lyric|letra|audio|áudio|ao vivo|live)[^)\]]*[)\]]/gi, "").trim();
    if (j.author_name && !title.includes(" - ") && !/youtube/i.test(alvo)) title = `${title} - ${j.author_name}`;
    return NextResponse.json({ title: title.slice(0, 80) }, { headers: { "cache-control": "public, max-age=86400" } });
  } catch {
    return NextResponse.json({ title: "" });
  }
}
