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

  const description = universe.description
    ? universe.description.length > 140
      ? universe.description.slice(0, 140) + "…"
      : universe.description
    : null;

  return new ImageResponse(
    (
      <div style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1C1917 0%, #292524 50%, #1C1917 100%)",
        padding: "60px",
        position: "relative",
      }}>
        {/* Decorative gradient orb */}
        <div style={{
          position: "absolute",
          top: "-100px",
          right: "-100px",
          width: "400px",
          height: "400px",
          background: "radial-gradient(circle, rgba(45,91,227,0.15) 0%, transparent 70%)",
          borderRadius: "50%",
        }} />
        <div style={{
          position: "absolute",
          bottom: "-80px",
          left: "-80px",
          width: "300px",
          height: "300px",
          background: "radial-gradient(circle, rgba(45,91,227,0.08) 0%, transparent 70%)",
          borderRadius: "50%",
        }} />

        {/* Brand */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "32px",
          zIndex: 1,
        }}>
          <div style={{
            width: "32px",
            height: "32px",
            background: "#2D5BE3",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="1 6 1 22 8 18 16 22 21 18 21 2 14 6 8 2 3 6" />
            </svg>
          </div>
          <span style={{ fontSize: 22, fontWeight: 600, color: "#F2EEE8", letterSpacing: "0.05em" }}>CANONIX</span>
        </div>

        {/* Title */}
        <div style={{
          fontSize: 56,
          fontWeight: 300,
          color: "#F2EEE8",
          marginBottom: description ? 20 : 32,
          lineHeight: 1.15,
          fontFamily: "Georgia, serif",
          zIndex: 1,
          maxWidth: "900px",
        }}>
          {universe.name}
        </div>

        {/* Description */}
        {description && (
          <div style={{
            fontSize: 24,
            color: "#A8A29E",
            lineHeight: 1.5,
            maxWidth: "800px",
            zIndex: 1,
            marginBottom: 40,
          }}>
            {description}
          </div>
        )}

        {/* Stats */}
        <div style={{
          display: "flex",
          marginTop: "auto",
          gap: "32px",
          zIndex: 1,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#2D5BE3" }} />
            <span style={{ fontSize: 18, color: "#78716C" }}>{universe._count.entities} entities</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#16A34A" }} />
            <span style={{ fontSize: 18, color: "#78716C" }}>{universe._count.relations} relations</span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
