import React, { useState } from "react";
import {
  AndroidLogo,
  ArrowUpRight,
  CheckCircle,
  Desktop,
  DownloadSimple,
  GithubLogo,
  X,
} from "@phosphor-icons/react";

const OFFICIAL_REPO_URL = "https://github.com/FrancescoGrazioso/Meld";
const OFFICIAL_RELEASES_URL = "https://github.com/FrancescoGrazioso/Meld/releases";

export interface OfficialNativeAppCardProps {
  variant?: "card" | "banner" | "compact";
  onDismiss?: () => void;
  style?: React.CSSProperties;
}

export function OfficialNativeAppCard({
  variant = "card",
  onDismiss,
  style,
}: OfficialNativeAppCardProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (variant === "banner") {
      try {
        return localStorage.getItem("meld_native_banner_dismissed") === "true";
      } catch {
        return false;
      }
    }
    return false;
  });

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem("meld_native_banner_dismissed", "true");
    } catch {
      // ignore storage quota error
    }
    onDismiss?.();
  };

  if (dismissed && variant === "banner") {
    return null;
  }

  // Variant 1: Compact (for QuickSettingsModal drawer)
  if (variant === "compact") {
    return (
      <div className="native-app-compact" style={style}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="native-app-icon-wrap" style={{ width: 34, height: 34, borderRadius: 10 }}>
              <AndroidLogo size={18} weight="bold" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--ink)" }}>
                Aplikasi Android Native Resmi
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--ink-muted)" }}>
                Pemutaran latar belakang penuh (ExoPlayer)
              </div>
            </div>
          </div>
          <span className="native-app-pill">APK FOSS</span>
        </div>

        <p style={{ fontSize: "0.76rem", color: "var(--ink-secondary)", lineHeight: 1.45, margin: 0 }}>
          Ingin audio tidak terhenti saat tombol Home ditekan atau layar HP mati? Pasang APK resmi langsung dari rilis GitHub pengembangnya.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <a
            href={OFFICIAL_RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ flex: 1, minHeight: 34, fontSize: "0.76rem", padding: "0 10px", justifyContent: "center", gap: 6 }}
          >
            <DownloadSimple size={14} weight="bold" />
            <span>Unduh APK Resmi</span>
            <ArrowUpRight size={13} weight="bold" />
          </a>
          <a
            href={OFFICIAL_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ minHeight: 34, fontSize: "0.76rem", padding: "0 10px", justifyContent: "center", gap: 4 }}
            title="Repositori GitHub FrancescoGrazioso/Meld"
            aria-label="GitHub Repository"
          >
            <GithubLogo size={15} />
          </a>
        </div>
      </div>
    );
  }

  // Variant 2: Banner (for Home feed top notification)
  if (variant === "banner") {
    return (
      <div className="native-app-banner" style={style}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
          <div className="native-app-icon-wrap" style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0 }}>
            <AndroidLogo size={20} weight="bold" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--ink)" }}>
                Butuh Musik Tetap Nyala Saat Layar HP Mati?
              </span>
              <span className="native-app-pill" style={{ fontSize: "0.65rem", padding: "1px 6px" }}>
                APK RESMI
              </span>
            </div>
            <p style={{ fontSize: "0.74rem", color: "var(--ink-muted)", marginTop: 2, whiteSpace: "normal" }}>
              Pasang aplikasi Android native resmi Meld via GitHub Releases untuk audio latar belakang tanpa batas browser.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <a
            href={OFFICIAL_RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ minHeight: 32, fontSize: "0.74rem", padding: "0 10px", gap: 5 }}
          >
            <DownloadSimple size={14} weight="bold" />
            <span>Unduh APK</span>
            <ArrowUpRight size={12} weight="bold" />
          </a>
          <button
            type="button"
            className="icon-btn"
            style={{ width: 28, height: 28 }}
            onClick={handleDismiss}
            aria-label="Tutup rekomendasi ini"
            title="Tutup"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  // Variant 3: Full Rich Card (default for SettingsView)
  return (
    <div className="native-app-card" style={style}>
      <div className="native-app-head">
        <div className="native-app-icon-wrap">
          <AndroidLogo size={26} weight="bold" />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="native-app-badge-row">
            <span className="native-app-pill">APLIKASI RESMI ANDROID</span>
            <span className="native-app-pill" style={{ color: "var(--status-success)" }}>100% OPEN SOURCE (FOSS)</span>
          </div>
          <h3 className="native-app-title">Aplikasi Android Native (APK Resmi Meld)</h3>
          <p className="native-app-desc" style={{ marginTop: 4 }}>
            Membutuhkan pemutaran musik tetap berjalan tanpa henti saat menekan tombol Home atau saat layar HP mati? Karena Chrome Android membatasi iframe YouTube di background, Anda sangat disarankan memasang aplikasi Android native resmi Meld yang dikembangkan langsung oleh <strong>Francesco Grazioso</strong>.
          </p>
        </div>
      </div>

      <div className="native-app-perks">
        <div className="native-app-perk-item">
          <CheckCircle size={16} weight="fill" style={{ color: "var(--status-success)", flexShrink: 0, marginTop: 2 }} />
          <span>
            <strong>Android Foreground Service:</strong> Audio berputar bebas tanpa jeda di latar belakang meskipun layar terkunci atau saat berpindah ke aplikasi lain.
          </span>
        </div>
        <div className="native-app-perk-item">
          <CheckCircle size={16} weight="fill" style={{ color: "var(--status-success)", flexShrink: 0, marginTop: 2 }} />
          <span>
            <strong>Integrasi Media Lockscreen:</strong> Kontrol notifikasi status bar responsif langsung dari sistem operasi tanpa batasan sandbox browser.
          </span>
        </div>
        <div className="native-app-perk-item">
          <CheckCircle size={16} weight="fill" style={{ color: "var(--status-success)", flexShrink: 0, marginTop: 2 }} />
          <span>
            <strong>Bebas Iklan &amp; Aman:</strong> Kode sumber terbuka transparan, ringan, dan bebas pelacakan pihak ketiga.
          </span>
        </div>
      </div>

      <div className="native-app-actions">
        <a
          href={OFFICIAL_RELEASES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
          style={{ minHeight: 40, padding: "0 16px", gap: 7 }}
        >
          <DownloadSimple size={17} weight="bold" />
          <span>Unduh APK Resmi (GitHub Releases)</span>
          <ArrowUpRight size={15} weight="bold" />
        </a>

        <a
          href={OFFICIAL_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
          style={{ minHeight: 40, padding: "0 14px", gap: 6 }}
        >
          <GithubLogo size={17} weight="bold" />
          <span>Repositori GitHub (FrancescoGrazioso/Meld)</span>
        </a>
      </div>

      <div className="native-app-tip">
        <Desktop size={18} weight="bold" style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong style={{ color: "var(--ink)", display: "block", marginBottom: 2 }}>
            Tips Browser (Tanpa Pasang Aplikasi):
          </strong>
          Jika tetap ingin menggunakan versi web ini di HP Android tanpa aplikasi tambahan, Anda dapat mencentang opsi <strong>"Situs Desktop" (Desktop site)</strong> di menu titik tiga Google Chrome. Mode desktop memungkinkan audio tetap menyala di latar belakang.
        </div>
      </div>
    </div>
  );
}
