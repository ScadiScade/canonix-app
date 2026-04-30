import { ImageResponse } from "next/og";
import prisma from "@/lib/prisma";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return new Response("Missing slug", { status: 400 });
  }

  const universe = await prisma.universe.findUnique({
    where: { slug },
    select: { name: true, description: true, visibility: true, _count: { select: { entities: true, relations: true } } },
  });

  if (!universe || universe.visibility === "private") {
    return new Response("Not found", { status: 404 });
  }

  return new ImageResponse(
    (
      <div style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        backgroundColor: "#0f0f23",
        padding: "60px",
      }}>
        <div style={{ display: "flex", fontSize: 28, color: "#818cf8", marginBottom: 16 }}>CANONIX</div>
        <div style={{ fontSize: 52, fontWeight: 700, color: "#fff", marginBottom: 16, lineHeight: 1.2 }}>{universe.name}</div>
        {universe.description && (
          <div style={{ fontSize: 22, color: "#a1a1aa", lineHeight: 1.5, maxWidth: 800 }}>
            {universe.description.length > 160 ? universe.description.slice(0, 160) + "…" : universe.description}
          </div>
        )}
        <div style={{ display: "flex", marginTop: 32, gap: 24 }}>
          <div style={{ fontSize: 18, color: "#818cf8" }}>{universe._count.entities} entities</div>
          <div style={{ fontSize: 18, color: "#818cf8" }}>{universe._count.relations} relations</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
