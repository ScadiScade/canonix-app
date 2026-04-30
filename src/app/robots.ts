import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXTAUTH_URL || "https://canonix.app";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/s/", "/marketplace", "/pricing"],
        disallow: ["/u/", "/dashboard", "/settings", "/team", "/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
