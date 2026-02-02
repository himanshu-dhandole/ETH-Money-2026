"use client";

import React, { useState } from "react";
import { Link } from "@heroui/link";
import { useLocation } from "react-router-dom";
import { ConnectButton } from "thirdweb/react";
import { createWallet } from "thirdweb/wallets";
import { client } from "@/config/thirdwebConfig";
import { Diamond, Menu, X } from "lucide-react";

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
  active = false,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) => (
  <Link
    href={href}
    onClick={onClick}
    className={`px-4 py-2 text-xs font-medium rounded-full transition-all duration-200 ${
      active
        ? "text-white bg-[#135bec]/20 border border-[#135bec]/30 shadow-[0_0_20px_rgba(19,91,236,0.15)]"
        : "text-white/60 hover:text-white hover:bg-white/10 border border-transparent"
    }`}
  >
    {children}
  </Link>
);

export const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { href: "/portfolio", label: "Portfolio" },
    { href: "/vault", label: "Vaults" },
    { href: "/deposit", label: "Deposit" },
    { href: "/profile", label: "Profile" },
    { href: "/docs", label: "Docs" },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <>
      <nav className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4">
        <div
          className="
            flex items-center justify-between gap-4 md:gap-8
            px-3 py-2
            w-full md:w-auto md:min-w-[600px] max-w-4xl
            rounded-full
            backdrop-blur-xl
            bg-[#0B0C10]/80
            border border-white/15
            shadow-[0_8px_32px_rgba(0,0,0,0.3)]
            transition-all duration-300
          "
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 pl-2 md:pl-4 group">
            <div className="size-8 flex items-center justify-center rounded-full bg-[#135bec]/10 border border-[#135bec]/20 group-hover:bg-[#135bec]/20 transition">
              <Diamond className="w-4 h-4 text-[#135bec]" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-white">
              AuraVault
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                active={isActive(item.href)}
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          {/* Desktop Wallet Button */}
          <div className="hidden md:block">
            <ConnectButton
              client={client}
              wallets={wallets}
              theme="dark"
              connectButton={{
                label: "Connect",
                className:
                  "!flex !items-center !gap-2 !px-5 !py-2.5 !rounded-full !text-xs !font-semibold \
                   !bg-gradient-to-r !from-[#135bec] !to-[#0d47b8] \
                   !border !border-[#135bec]/30 \
                   hover:!shadow-[0_0_20px_rgba(19,91,236,0.4)] \
                   !transition-all !duration-300 \
                   !text-white",
              }}
              connectModal={{
                title: "Connect to AuraVault",
                showThirdwebBranding: false,
              }}
            />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-full hover:bg-white/10 transition"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 text-white" />
            ) : (
              <Menu className="w-5 h-5 text-white/70" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fadeIn"
            onClick={closeMobileMenu}
          />

          {/* Mobile Menu Panel */}
          <div className="fixed top-24 left-4 right-4 z-50 md:hidden animate-scaleIn">
            <div className="glass-panel rounded-3xl p-6 space-y-4">
              {/* Navigation Links */}
              <nav className="flex flex-col gap-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className={`px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                      isActive(item.href)
                        ? "text-white bg-[#135bec]/20 border border-[#135bec]/30"
                        : "text-white/70 hover:text-white hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              {/* Mobile Connect Button */}
              <div className="pt-4 border-t border-white/10">
                <ConnectButton
                  client={client}
                  wallets={wallets}
                  theme="dark"
                  connectButton={{
                    label: "Connect Wallet",
                    className:
                      "!w-full !flex !items-center !justify-center !gap-2 !px-5 !py-3 !rounded-xl !text-sm !font-semibold \
                       !bg-gradient-to-r !from-[#135bec] !to-[#0d47b8] \
                       !border !border-[#135bec]/30 \
                       hover:!shadow-[0_0_20px_rgba(19,91,236,0.4)] \
                       !transition-all !duration-300 \
                       !text-white",
                  }}
                  connectModal={{
                    title: "Connect to AuraVault",
                    showThirdwebBranding: false,
                  }}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};
