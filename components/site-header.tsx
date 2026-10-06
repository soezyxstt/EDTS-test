"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="site-header">
      <div className="container-wide site-header-inner">
        <Link className="brand-link" href="/" aria-label="Peluang franchise, beranda">
          <Image className="brand-mark" src="/logo.png" width={42} height={42} alt="" />
          <span className="brand-name">Peluang Franchise</span>
        </Link>
        <Button
          className="site-menu-toggle"
          size="icon"
          variant="outline"
          type="button"
          aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={menuOpen}
          aria-controls="site-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {menuOpen ? <path d="m6 6 12 12M18 6 6 18" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </Button>
        <nav id="site-nav" className={`site-nav${menuOpen ? " is-open" : ""}`} aria-label="Navigasi utama">
          <div className="site-nav-links">
            <Link href="/#programs" onClick={closeMenu}>Program</Link>
            <Link href="/#alur" onClick={closeMenu}>Cara kerja</Link>
          </div>
          <div className="site-nav-actions">
            <Link href="/applications" onClick={closeMenu}>Aplikasi saya</Link>
            <Button
              className="site-franchisor-link"
              nativeButton={false}
              render={<Link href="/manage" onClick={closeMenu} />}
              size="sm"
            >
              Portal franchisor
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
