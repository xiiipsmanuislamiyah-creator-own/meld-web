import React, { useEffect, useState } from "react";
import {
  AndroidLogo,
  ArrowUpRight,
  CheckCircle,
  Desktop,
  DownloadSimple,
  GithubLogo,
  Globe,
  Sparkle,
  X,
} from "@phosphor-icons/react";

const OFFICIAL_APK_DOWNLOAD_URL = "/downloads/meld-music-rhmt.apk";
const OFFICIAL_GITHUB_RELEASE_URL = "https://github.com/xiiipsmanuislamiyah-creator-own/meld-web/releases";
const DEVELOPER_PORTFOLIO_URL = "https://rhmt.biz.id";

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
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
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

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Fallback direct APK download if browser doesn't expose beforeinstallprompt
      window.location.href = OFFICIAL_APK_DOWNLOAD_URL;
    }
  };

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
                Aplikasi Android Resmi (RHMT OFC)
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--ink-muted)" }}>
                Meld Music APK v2.1.0 · Audio Latar Belakang Penuh
              </div>
            </div>
          </div>
          <span className="native-app-pill">RHMT OFC</span>
        </div>

        <p style={{ fontSize: "0.76rem", color: "var(--ink-secondary)", lineHeight: 1.45, margin: 0 }}>
          Ingin musik tetap menyala saat tombol Home ditekan atau layar HP mati? Unduh dan pasang APK resmi buatan Rohmatulloh (RHMT OFC) langsung dari web ini.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <a
            href={OFFICIAL_APK_DOWNLOAD_URL}
            download="meld-music-rhmt.apk"
            className="btn btn-primary"
            style={{ flex: 1, minHeight: 34, fontSize: "0.76rem", padding: "0 10px", justifyContent: "center", gap: 6 }}
          >
            <DownloadSimple size={14} weight="bold" />
            <span>Unduh APK Resmi</span>
            <ArrowUpRight size={13} weight="bold" />
          </a>

          {deferredPrompt && !installed && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ minHeight: 34, fontSize: "0.76rem", padding: "0 10px" }}
              onClick={handleInstallPwa}
            >
              Pasang di HP
            </button>
          )}

          <a
            href={OFFICIAL_GITHUB_RELEASE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ minHeight: 34, fontSize: "0.76rem", padding: "0 10px", justifyContent: "center", gap: 4 }}
            title="Rilis GitHub Resmi (RHMT OFC)"
            aria-label="GitHub Release"
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
                Pasang Aplikasi Resmi Meld Music (Versi RHMT OFC)
              </span>
              <span className="native-app-pill" style={{ fontSize: "0.65rem", padding: "1px 6px" }}>
                APK RESMI
              </span>
            </div>
            <p style={{ fontSize: "0.74rem", color: "var(--ink-muted)", marginTop: 2, whiteSpace: "normal" }}>
              Bebas batasan browser HP! Putar audio lancar saat layar mati dengan mengunduh APK resmi buatan Rohmatulloh.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <a
            href={OFFICIAL_APK_DOWNLOAD_URL}
            download="meld-music-rhmt.apk"
            className="btn btn-primary"
            style={{ minHeight: 32, fontSize: "0.74rem", padding: "0 10px", gap: 5 }}
          >
            <DownloadSimple size={14} weight="bold" />
            <span>Unduh APK</span>
            <ArrowUpRight size={12} weight="bold" />
          </a>

          {deferredPrompt && !installed && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ minHeight: 32, fontSize: "0.74rem", padding: "0 8px" }}
              onClick={handleInstallPwa}
            >
              Pasang App
            </button>
          )}

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
            <span className="native-app-pill">APLIKASI ANDROID RESMI</span>
            <span className="native-app-pill" style={{ color: "var(--status-success)" }}>
              BY ROHMATULLOH (RHMT OFC)
            </span>
            <span className="native-app-pill">v2.1.0</span>
          </div>
          <h3 className="native-app-title">Aplikasi Android Native Resmi (Versi Buatan RHMT OFC)</h3>
          <p className="native-app-desc" style={{ marginTop: 4 }}>
            Agar musik tetap berputar tanpa jeda saat tombol Home ditekan atau layar HP mati, Anda dapat memasang aplikasi Android native resmi Meld Music yang dibangun langsung oleh <strong>Rohmatulloh (RHMT OFC)</strong>.
          </p>
        </div>
      </div>

      <div className="native-app-perks">
        <div className="native-app-perk-item">
          <CheckCircle size={16} weight="fill" style={{ color: "var(--status-success)", flexShrink: 0, marginTop: 2 }} />
          <span>
            <strong>Audio Latar Belakang Penuh:</strong> Bebas jeda saat ponsel dimatikan layarnya atau saat membuka aplikasi chat, game, dan media sosial lainnya.
          </span>
        </div>
        <div className="native-app-perk-item">
          <CheckCircle size={16} weight="fill" style={{ color: "var(--status-success)", flexShrink: 0, marginTop: 2 }} />
          <span>
            <strong>Bilah Status &amp; Media Lockscreen:</strong> Integrasi pemutar kontrol langsung di notifikasi atas HP tanpa gangguan pembatasan tab Chromium.
          </span>
        </div>
        <div className="native-app-perk-item">
          <CheckCircle size={16} weight="fill" style={{ color: "var(--status-success)", flexShrink: 0, marginTop: 2 }} />
          <span>
            <strong>100% Bebas Iklan &amp; Aman:</strong> Kode rilis resmi terverifikasi dari portofolio rhmt.biz.id dan repositori resmi pengembang.
          </span>
        </div>
      </div>

      <div className="native-app-actions">
        <a
          href={OFFICIAL_APK_DOWNLOAD_URL}
          download="meld-music-rhmt.apk"
          className="btn btn-primary"
          style={{ minHeight: 40, padding: "0 16px", gap: 7 }}
        >
          <DownloadSimple size={17} weight="bold" />
          <span>Unduh Berkas APK (Langsung dari Web)</span>
          <ArrowUpRight size={15} weight="bold" />
        </a>

        {deferredPrompt && !installed && (
          <button
            type="button"
            className="btn btn-secondary"
            style={{ minHeight: 40, padding: "0 14px", gap: 6 }}
            onClick={handleInstallPwa}
          >
            <Sparkle size={17} weight="bold" style={{ color: "var(--accent)" }} />
            <span>Pasang WebApp di Layar Utama HP</span>
          </button>
        )}

        <a
          href={OFFICIAL_GITHUB_RELEASE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
          style={{ minHeight: 40, padding: "0 14px", gap: 6 }}
        >
          <GithubLogo size={17} weight="bold" />
          <span>Rilis GitHub (RHMT OFC)</span>
        </a>

        <a
          href={DEVELOPER_PORTFOLIO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost"
          style={{ minHeight: 40, padding: "0 12px", gap: 6 }}
        >
          <Globe size={16} />
          <span>rhmt.biz.id</span>
        </a>
      </div>

      <div className="native-app-tip">
        <Desktop size={18} weight="bold" style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong style={{ color: "var(--ink)", display: "block", marginBottom: 2 }}>
            Alternatif Cepat di Browser (Tanpa Instal Aplikasi):
          </strong>
          Jika Anda tetap ingin menggunakan pemutar langsung di browser Google Chrome ponsel tanpa memasang file APK, cukup aktifkan opsi <strong>"Situs Desktop" (Desktop site)</strong> pada menu titik tiga Chrome.
        </div>
      </div>
    </div>
  );
}
