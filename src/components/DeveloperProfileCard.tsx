import { useState } from "react";
import {
  ArrowUpRight,
  Code,
  GithubLogo,
  Globe,
  Info,
  InstagramLogo,
  Keyboard,
  ShieldCheck,
  TelegramLogo,
  TiktokLogo,
  WhatsappLogo,
} from "@phosphor-icons/react";
import { APP_INFO, DEVELOPER_PROFILE, type DeveloperSocialLink } from "../lib/developerInfo";
import { BrandMark } from "./BrandMark";

interface DeveloperProfileCardProps {
  compact?: boolean;
  onOpenFullSettings?: () => void;
}

function SocialIcon({ id }: { id: DeveloperSocialLink["id"] }) {
  switch (id) {
    case "portfolio":
      return <Globe size={16} weight="bold" />;
    case "github":
      return <GithubLogo size={16} weight="bold" />;
    case "telegram":
      return <TelegramLogo size={16} weight="bold" />;
    case "instagram":
      return <InstagramLogo size={16} weight="bold" />;
    case "tiktok":
      return <TiktokLogo size={16} weight="bold" />;
    case "whatsapp":
      return <WhatsappLogo size={16} weight="bold" />;
  }
}

export function DeveloperProfileCard({
  compact = false,
  onOpenFullSettings,
}: DeveloperProfileCardProps) {
  const [avatarError, setAvatarError] = useState(false);

  return (
    <div className={`dev-info-stack${compact ? " is-compact" : ""}`}>
      {/* Developer Profile Hero Card */}
      <div className="dev-profile-card">
        <div className="dev-profile-head">
          <div className="dev-avatar-ring">
            {!avatarError ? (
              <img
                src={`/api/artwork?url=${encodeURIComponent(DEVELOPER_PROFILE.avatarUrl)}`}
                alt={`${DEVELOPER_PROFILE.fullName} (${DEVELOPER_PROFILE.brandName})`}
                width={72}
                height={72}
                className="dev-avatar-img"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="dev-avatar-fallback" aria-label={DEVELOPER_PROFILE.brandName}>
                RH
              </div>
            )}
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h3 className="dev-name">{DEVELOPER_PROFILE.fullName}</h3>
              <span className="dev-brand-badge">{DEVELOPER_PROFILE.brandName}</span>
            </div>
            <div className="dev-role">
              {DEVELOPER_PROFILE.role} · {DEVELOPER_PROFILE.location}
            </div>
            <a
              href={DEVELOPER_PROFILE.portfolioUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="dev-portfolio-link"
            >
              <span>rhmt.biz.id</span>
              <ArrowUpRight size={13} weight="bold" />
            </a>
          </div>
        </div>

        <p className="dev-bio">{DEVELOPER_PROFILE.bio}</p>

        {/* Skills Chips */}
        <div className="dev-skills-row">
          {DEVELOPER_PROFILE.skills.map((skill) => (
            <span key={skill} className="dev-skill-pill">
              <Code size={12} weight="bold" style={{ color: "var(--accent)" }} />
              <span>{skill}</span>
            </span>
          ))}
        </div>

        {/* Social Links Grid */}
        <div className="dev-socials-grid">
          {DEVELOPER_PROFILE.socials.map((soc) => (
            <a
              key={soc.id}
              href={soc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="dev-social-link"
            >
              <span className="dev-social-icon">
                <SocialIcon id={soc.id} />
              </span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span className="dev-social-label">{soc.label}</span>
                <span className="dev-social-handle">{soc.handle}</span>
              </span>
              <ArrowUpRight size={14} style={{ color: "var(--ink-muted)", flexShrink: 0 }} />
            </a>
          ))}
        </div>
      </div>

      {/* App Architecture & Privacy Card */}
      <div className="dev-app-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BrandMark size={32} />
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.98rem" }}>
                {APP_INFO.name}
              </div>
              <div style={{ fontSize: "0.76rem", color: "var(--ink-muted)" }}>
                {APP_INFO.subtitle}
              </div>
            </div>
          </div>
          <span className="dev-version-pill">v{APP_INFO.version}</span>
        </div>

        <div className="dev-meta-item">
          <Info size={16} weight="bold" style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
          <span>{APP_INFO.engine}</span>
        </div>

        <div className="dev-meta-item">
          <ShieldCheck size={16} weight="bold" style={{ color: "var(--status-success)", flexShrink: 0, marginTop: 2 }} />
          <span>{APP_INFO.privacyNote}</span>
        </div>

        {!compact && (
          <div className="dev-shortcuts-box">
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: "0.82rem", marginBottom: 8 }}>
              <Keyboard size={15} style={{ color: "var(--accent)" }} />
              <span>Pintasan Keyboard</span>
            </div>
            <div className="dev-shortcuts-grid">
              {APP_INFO.shortcuts.map((s) => (
                <div key={s.keys} className="dev-shortcut-row">
                  <kbd className="dev-kbd">{s.keys}</kbd>
                  <span>{s.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {onOpenFullSettings && (
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: 4 }}
            onClick={onOpenFullSettings}
          >
            <span>Buka Halaman Pengaturan Lengkap</span>
            <ArrowUpRight size={16} weight="bold" />
          </button>
        )}
      </div>
    </div>
  );
}
