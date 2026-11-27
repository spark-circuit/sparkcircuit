const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  "https://mrqvzmtdsohvzsnryogp.supabase.co";

const SUPABASE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_YLYkDHgLQvNzCL1UvqvxkQ_EX3oLE9z";

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default async function handler(req, res) {
  try {
    const id = String(req.query?.id || "").trim();

    if (!id || !/^\d+$/.test(id)) {
      return res.status(404).send("Product not found");
    }

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(id)}&select=id,name&limit=1`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Legacy product lookup failed:", response.status);
      return res.status(500).send("Unable to resolve product URL");
    }

    const products = await response.json();
    const product = products?.[0];

    if (!product) {
      return res.status(404).send("Product not found");
    }

    const cleanUrl =
      `https://sparkcircuit.in/products/${slugify(product.name)}-${product.id}`;

    return res.redirect(301, cleanUrl);
  } catch (error) {
    console.error("Legacy product redirect error:", error);
    return res.status(500).send("Unable to redirect product");
  }
}
