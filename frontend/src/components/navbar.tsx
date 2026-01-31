"use client";
import React from "react";
import { Link } from "@heroui/link";
import { ThemeSwitch } from "@/components/theme-switch";
import { Brain } from "lucide-react";
import { siteConfig } from "@/config/site";
import { ConnectButton } from "thirdweb/react";
import { createWallet } from "thirdweb/wallets";
import { client } from "@/config/thirdwebConfig";
import { useTheme } from "@heroui/use-theme";

const wallets = [
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("io.rabby"),
  createWallet("io.zerion.wallet"),
];

const NavLink = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => (
  <Link
    href={href}
    className="text-sm font-medium text-gray-400 hover:text-[#13ec5b] transition-all duration-300 relative group"
  >
    {children}
    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#13ec5b] transition-all duration-300 group-hover:w-full" />
  </Link>
);

export const Navbar = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <nav className="fixed top-0 w-full z-[100] border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl h-16">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="p-2 rounded-xl bg-[#13ec5b]/10 group-hover:bg-[#13ec5b]/20 transition-all duration-300">
            <Brain className="text-[#13ec5b] w-6 h-6 animate-pulse" />
          </div>
          <span className="font-bold tracking-tighter text-xl text-white">
            Aura<span className="text-[#13ec5b]">Farm</span>
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-10">
          {siteConfig.navItems.map((item) => (
            <NavLink key={item.href} href={item.href}>
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-6">
          <ThemeSwitch />
          <div className="h-6 w-[1px] bg-white/10 hidden sm:block" />

          <ConnectButton
            client={client}
            wallets={wallets}
            theme={isDark ? "dark" : "light"}
            connectButton={{
              label: "Launch App",
              style: {
                all: "unset",
                backgroundColor: "#13ec5b",
                color: "#050505",
                borderRadius: "12px",
                fontWeight: "800",
                fontSize: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                padding: "0.6rem 1.25rem",
                cursor: "pointer",
                transition: "all 0.3s ease",
                boxShadow: "0 4px 20px rgba(19,236,91,0.2)",
              },
            }}
            connectModal={{
              title: "Connect to Aura",
              showThirdwebBranding: false,
            }}
          />
        </div>
      </div>
    </nav>
  );
};