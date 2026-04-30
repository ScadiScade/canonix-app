import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import PublicUniverseClient from "./PublicUniverseClient";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const universe = await prisma.universe.findUnique({
    where: { slug: params.slug },
    select: { name: true, description: true, visibility: true },
  });

  if (!universe || universe.visibility === "private") return {};

  const baseUrl = process.env.NEXTAUTH_URL || "https://canonix.app";
  return {
    title: universe.name,
    description: universe.description || `Explore ${universe.name} on Canonix — a structured universe map.`,
    openGraph: {
      title: universe.name,
      description: universe.description || undefined,
      url: `${baseUrl}/s/${params.slug}`,
      type: "website",
    },
    alternates: { canonical: `${baseUrl}/s/${params.slug}` },
  };
}

export default async function PublicUniversePage({ params }: { params: { slug: string } }) {
  const universe = await prisma.universe.findUnique({
    where: { slug: params.slug },
    include: {
      groups: { orderBy: { createdAt: "asc" } },
      entities: {
        include: {
          sourceRelations: { include: { target: true } },
          targetRelations: { include: { source: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      relations: true,
    },
  });

  if (!universe || (universe.visibility === "private")) {
    notFound();
  }

  return <PublicUniverseClient universe={structuredClone(universe)} />;
}
