import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ContentDNA — AI Video Performance Intelligence",
  description:
    "Production-grade RAG platform that compares social media video performance using semantic transcript analysis, pgvector embeddings, and GPT-4o comparative intelligence.",
  keywords: [
    "video analytics",
    "RAG",
    "content strategy",
    "AI comparison",
    "social media intelligence",
  ],
  authors: [{ name: "ContentDNA Engineering" }],
  openGraph: {
    title: "ContentDNA — AI Video Performance Intelligence",
    description:
      "Deep comparative analysis of social video content powered by semantic RAG and GPT-4o.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#09090b] text-zinc-100">
        {children}
      </body>
    </html>
  );
}
