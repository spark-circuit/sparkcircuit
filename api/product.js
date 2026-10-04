export default async function handler(req, res) {
  try {
    const { id, product_id } = req.query;

    const productId = product_id || id;

    if (!productId) {
      return res.status(400).send("Product ID is required.");
    }

    const workerUrl =
      `https://mrqvzmtdsohvzsnryogp.supabase.co/functions/v1/dynamic-worker?product_id=${encodeURIComponent(productId)}`;

    const response = await fetch(workerUrl);

    const html = await response.text();

    if (!response.ok) {
      return res.status(response.status).send(html);
    }

    res.setHeader(
      "Content-Type",
      "text/html; charset=utf-8"
    );

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=86400"
    );

    return res.status(200).send(html);

  } catch (error) {

    console.error(
      "Product proxy error:",
      error
    );

    res.setHeader(
      "Content-Type",
      "text/html; charset=utf-8"
    );

    return res.status(500).send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Server Error | SparkCircuit</title>
</head>
<body>
<h1>Server Error</h1>
<p>Unable to load product.</p>
</body>
</html>
`);
  }
}
