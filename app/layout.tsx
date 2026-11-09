import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Youth Bible Quiz",
  description: "Register, compete, and discover your Bible Quiz teams."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
