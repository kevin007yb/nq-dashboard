import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "NQ Trading Core | 量化中樞",
  description: "AI-Driven NQ Futures Analytics and Trading Log",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="main-layout">
          {/* Sidebar */}
          <aside className="sidebar">
            <div className="sidebar-logo">
              <div className="logo-box">NQ</div>
              <span>CORE v2</span>
            </div>
            <nav className="sidebar-nav">
              <Link href="/" className="nav-item">
                <span className="icon">📊</span>
                <span className="label">量化中樞</span>
              </Link>
              <Link href="/trading-log" className="nav-item">
                <span className="icon">📝</span>
                <span className="label">交易紀錄</span>
              </Link>
            </nav>
            <div className="sidebar-footer">
              <div className="status-dot"></div>
              <span>System Active</span>
            </div>
          </aside>

          {/* Main Content */}
          <main className="content-area">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
