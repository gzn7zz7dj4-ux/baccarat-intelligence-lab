import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Baccarat Intelligence Lab",
  description: "A virtual No Commission Baccarat simulator and statistical analysis lab."
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}