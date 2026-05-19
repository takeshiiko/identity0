export default function Footer() {
  return (
    <footer className="relative py-16 px-6 ebru-bg">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-10">
          {/* Logo */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="font-cormorant text-3xl tracking-[0.3em] text-gold uppercase">
              DERVISH
            </span>
            <span className="font-inter text-[10px] tracking-[0.2em] uppercase text-white/25">
              Special Edition
            </span>
          </div>

          {/* Social links */}
          <div className="flex items-center gap-6">
            {[
              {
                label: "Twitter / X",
                href: "#",
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                ),
              },
              {
                label: "OpenSea",
                href: "#",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 360 360" fill="none" style={{ opacity: 0.6 }}>
                    <path d="M252.072 212.292C245.826 220.662 232.686 234.558 225.378 234.558H191.412V212.274H218.466C222.336 212.274 226.026 210.708 228.69 207.954C242.586 193.554 250.614 176.418 250.614 158.04C250.614 126.684 227.178 98.964 191.394 82.26V67.284C191.394 60.84 186.174 55.62 179.73 55.62C173.286 55.62 168.066 60.84 168.066 67.284V73.494C158.04 70.56 147.42 68.328 136.332 67.05C154.692 86.994 165.906 113.67 165.906 142.92C165.906 169.146 156.942 193.23 141.876 212.31H168.066V234.63H129.726C124.542 234.63 120.33 230.436 120.33 225.234V215.478C120.33 213.768 118.944 212.364 117.216 212.364H66.672C65.682 212.364 64.836 213.174 64.836 214.164C64.8 254.088 96.39 284.058 134.172 284.058H240.822C266.382 284.058 277.812 251.298 292.788 230.454C298.602 222.39 312.552 215.91 316.782 214.11C317.556 213.786 318.006 213.066 318.006 212.22V199.26C318.006 197.946 316.71 196.956 315.432 197.316C315.432 197.316 253.782 211.482 253.062 211.68C252.342 211.896 252.072 212.31 252.072 212.31V212.292Z" fill="white"/>
                    <path d="M146.16 142.83C146.16 122.724 139.266 104.22 127.746 89.586L69.732 189.972H132.138C141.012 176.436 146.178 160.236 146.178 142.848L146.16 142.83Z" fill="white"/>
                    <path d="M181.566 0C80.91-0.828 -0.828 80.91 0 181.566C0.846 279.306 80.694 359.172 178.416 359.982C279.072 360.846 360.846 279.072 359.982 178.416C359.172 80.712 279.306 0.846 181.566 0ZM127.746 89.586C139.266 104.22 146.16 122.742 146.16 142.83C146.16 160.236 140.994 176.436 132.12 189.954H69.714L127.728 89.568L127.746 89.586ZM318.006 199.242V212.202C318.006 213.048 317.556 213.768 316.782 214.092C312.552 215.892 298.602 222.372 292.788 230.436C277.812 251.28 266.382 284.04 240.822 284.04H134.172C96.408 284.04 64.818 254.07 64.836 214.146C64.836 213.156 65.682 212.346 66.672 212.346H117.216C118.962 212.346 120.33 213.75 120.33 215.46V225.216C120.33 230.4 124.524 234.612 129.726 234.612H168.066V212.292H141.876C156.942 193.212 165.906 169.128 165.906 142.902C165.906 113.652 154.692 86.976 136.332 67.032C147.438 68.328 158.058 70.542 168.066 73.476V67.266C168.066 60.822 173.286 55.602 179.73 55.602C186.174 55.602 191.394 60.822 191.394 67.266V82.242C227.178 98.946 250.614 126.666 250.614 158.022C250.614 176.418 242.568 193.536 228.69 207.936C226.026 210.69 222.336 212.256 218.466 212.256H191.412V234.54H225.378C232.704 234.54 245.844 220.644 252.072 212.274C252.072 212.274 252.342 211.86 253.062 211.644C253.782 211.428 315.432 197.28 315.432 197.28C316.728 196.92 318.006 197.91 318.006 199.224V199.242Z" fill="#0086FF"/>
                  </svg>
                ),
              },
            ].map((s) => (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                className="w-9 h-9 flex items-center justify-center border border-gold/20
                  text-white/35 hover:text-gold hover:border-gold/45
                  transition-all duration-300"
              >
                {s.icon}
              </a>
            ))}
          </div>

          {/* Nav */}
          <div className="flex gap-8">
            {[
              { label: "Mint", href: "#mint" },
              { label: "Gallery", href: "#gallery" },
              { label: "Dervish", href: "#about" },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="font-inter text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-gold/70 transition-colors duration-300"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>

        {/* Bottom row */}
        <div className="gold-divider opacity-20 mt-12 mb-6" />
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="font-inter text-[10px] tracking-[0.1em] text-white/18">
            © 2026 DERVISH NFT. All rights reserved.
          </p>
          <p className="font-cormorant italic text-xs text-gold/20">
            Art that dances on water, lives on the chain.
          </p>
        </div>
      </div>
    </footer>
  );
}
