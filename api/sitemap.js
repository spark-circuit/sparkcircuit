export default async function handler(req, res) {
  try {
    const sitemapUrl =
      "https://mrqvzmtdsohvzsnryogp.supabase.co/functions/v1/dynamic-worker?sitemap=1";

    const response = await fetch(sitemapUrl);

    const xml = await response.text();

    if (!response.ok) {
      return res.status(response.status).send(xml);
    }

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400"
    );

    return res.status(200).send(xml);
  } catch (error) {
    console.error("Sitemap proxy error:", error);

    return res.status(500).send(
      `<?xml version="1.0" encoding="UTF-8"?>
       <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
       </urlset>`
    );
  }
}
