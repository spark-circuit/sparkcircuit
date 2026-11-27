const SUPABASE_URL = "https://mrqvzmtdsohvzsnryogp.supabase.co";

const SUPABASE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_YLYkDHgLQvNzCL1UvqvxkQ_EX3oLE9z";

const BASE_URL = "https://sparkcircuit.in";

function escapeXml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cleanDescription(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function makeSlug(name = "") {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function productUrl(product) {
  const slug = makeSlug(product.name);
  return `${BASE_URL}/products/${slug}-${product.id}`;
}

function imageUrl(product) {
  if (Array.isArray(product.images) && product.images.length > 0) {
    return product.images[0];
  }

  return product.image || "";
}

function availability(product) {
  if (product.in_stock === true && Number(product.stock_quantity || 0) > 0) {
    return "in_stock";
  }

  if (product.in_stock === true) {
    return "in_stock";
  }

  return "out_of_stock";
}

export default async function handler(req, res) {
  try {
    const url =
      `${SUPABASE_URL}/rest/v1/products` +
      `?select=id,name,category,price,original_price,in_stock,stock_quantity,image,images,description` +
      `&order=id.asc`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();

      return res.status(500).send(
        `Google feed database error: ${errorText}`
      );
    }

    const products = await response.json();

    const items = products
      .filter(product => product && product.name)
      .map(product => {
        const price = Number(product.price || 0).toFixed(2);
        const description = cleanDescription(product.description || product.name);
        const link = productUrl(product);
        const image = imageUrl(product);

        return `
    <item>
      <g:id>${escapeXml(`spc-${product.id}`)}</g:id>

      <g:title>${escapeXml(product.name)}</g:title>

      <g:description>${escapeXml(description)}</g:description>

      <g:link>${escapeXml(link)}</g:link>

      <g:image_link>${escapeXml(image)}</g:image_link>

      <g:availability>${availability(product)}</g:availability>

      <g:condition>new</g:condition>

      <g:price>${escapeXml(price)} INR</g:price>

      <g:brand>SPARKCIRCUIT</g:brand>

      <g:identifier_exists>no</g:identifier_exists>

      <g:product_type>${escapeXml(product.category || "Electronics")}</g:product_type>
    </item>`;
      })
      .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:g="http://base.google.com/ns/1.0">

  <channel>

    <title>SparkCircuit Products</title>

    <link>${BASE_URL}</link>

    <description>Official SparkCircuit product feed</description>

${items}

  </channel>

</rss>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400"
    );

    return res.status(200).send(xml);

  } catch (error) {
    console.error("Google Feed Error:", error);

    return res.status(500).send(
      `Google feed error: ${error.message}`
    );
  }
}
