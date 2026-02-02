import { Link } from "@heroui/link";
import { Diamond, Github, Twitter, MessageCircle } from "lucide-react";

import { Navbar } from "@/components/navbar";
import { Toaster } from "sonner";

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="mx-auto w-full flex-grow">{children}</main>

      {/* Footer */}
      <footer className="relative w-full bg-[#0B0C10] border-t border-white/5 mt-auto">
        {/* Ambient glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-[#135bec]/5 blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {/* Brand Section */}
            <div className="flex flex-col gap-4">
              <Link href="/" className="flex items-center gap-2 group w-fit">
                <div className="size-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 group-hover:bg-white/10 transition">
                  <Diamond className="w-5 h-5 text-[#135bec]" />
                </div>
                <span className="text-lg font-semibold tracking-tight text-white">
                  AuraVault
                </span>
              </Link>
              <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
                Institutional-grade yield aggregation with tokenized risk
                management on Polygon.
              </p>
              {/* Social Links */}
              <div className="flex items-center gap-3 mt-2">
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[#135bec]/50 transition-all group"
                >
                  <Twitter className="w-4 h-4 text-gray-400 group-hover:text-[#135bec] transition" />
                </a>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[#135bec]/50 transition-all group"
                >
                  <Github className="w-4 h-4 text-gray-400 group-hover:text-[#135bec] transition" />
                </a>
                <a
                  href="https://discord.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[#135bec]/50 transition-all group"
                >
                  <MessageCircle className="w-4 h-4 text-gray-400 group-hover:text-[#135bec] transition" />
                </a>
              </div>
            </div>

            {/* Product Links */}
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                Product
              </h3>
              <nav className="flex flex-col gap-2">
                <Link
                  href="/vault"
                  className="text-sm text-gray-400 hover:text-white transition-colors w-fit"
                >
                  Vaults
                </Link>
                <Link
                  href="/deposit"
                  className="text-sm text-gray-400 hover:text-white transition-colors w-fit"
                >
                  Deposit
                </Link>
                <Link
                  href="/profile"
                  className="text-sm text-gray-400 hover:text-white transition-colors w-fit"
                >
                  Profile
                </Link>
                <Link
                  href="/"
                  className="text-sm text-gray-400 hover:text-white transition-colors w-fit"
                >
                  Risk NFT
                </Link>
              </nav>
            </div>

            {/* Resources */}
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                Resources
              </h3>
              <nav className="flex flex-col gap-2">
                <Link
                  href="/docs"
                  className="text-sm text-gray-400 hover:text-white transition-colors w-fit"
                >
                  Documentation
                </Link>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-400 hover:text-white transition-colors w-fit"
                >
                  GitHub
                </a>
                <a
                  href="#"
                  className="text-sm text-gray-400 hover:text-white transition-colors w-fit"
                >
                  Whitepaper
                </a>
                <a
                  href="#"
                  className="text-sm text-gray-400 hover:text-white transition-colors w-fit"
                >
                  Audit Reports
                </a>
              </nav>
            </div>

            {/* Legal */}
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                Legal
              </h3>
              <nav className="flex flex-col gap-2">
                <a
                  href="#"
                  className="text-sm text-gray-400 hover:text-white transition-colors w-fit"
                >
                  Terms of Service
                </a>
                <a
                  href="#"
                  className="text-sm text-gray-400 hover:text-white transition-colors w-fit"
                >
                  Privacy Policy
                </a>
                <a
                  href="#"
                  className="text-sm text-gray-400 hover:text-white transition-colors w-fit"
                >
                  Cookie Policy
                </a>
              </nav>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} AuraVault. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Built on</span>
              <span className="px-2 py-1 rounded-md bg-[#8247e5]/10 border border-[#8247e5]/20 text-[#8247e5] font-medium">
                Polygon
              </span>
            </div>
          </div>
        </div>
      </footer>

      <Toaster theme="dark" position="top-right" richColors />
    </div>
  );
}
