export interface DeveloperSocialLink {
  id: "portfolio" | "github" | "telegram" | "instagram" | "tiktok" | "whatsapp";
  label: string;
  handle: string;
  url: string;
}

export const DEVELOPER_PROFILE = {
  fullName: "Rohmatulloh",
  brandName: "RHMT OFC",
  alias: "R_HMT OFC",
  role: "Student & Self-Taught Web Developer",
  location: "Indonesia",
  tagline: "Learning in Progress — membangun aplikasi web taktil, cepat, dan berorientasi privasi.",
  bio: "Pelajar MA dan self-taught web developer asal Indonesia yang berfokus pada frontend engineering, arsitektur aplikasi web modern, dan eksperimen AI mandiri melalui portofolio rhmt.biz.id.",
  avatarUrl: "https://rhmt.biz.id/images/pp.webp",
  portfolioUrl: "https://rhmt.biz.id/",
  skills: [
    "TypeScript",
    "React",
    "Frontend Engineering",
    "Web Audio API",
    "Node.js",
    "AI Integration",
  ],
  socials: [
    {
      id: "portfolio",
      label: "Portofolio Resmi",
      handle: "rhmt.biz.id",
      url: "https://rhmt.biz.id/",
    },
    {
      id: "github",
      label: "GitHub",
      handle: "@rhmt-ofc",
      url: "https://github.com/rhmt-ofc",
    },
    {
      id: "telegram",
      label: "Telegram",
      handle: "@rhmt_ofc",
      url: "https://t.me/rhmt_ofc",
    },
    {
      id: "instagram",
      label: "Instagram",
      handle: "@rahmt_nhw",
      url: "https://www.instagram.com/rahmt_nhw",
    },
    {
      id: "tiktok",
      label: "TikTok",
      handle: "@rhmtofc",
      url: "https://vt.tiktok.com/ZSpYGGvkB/",
    },
    {
      id: "whatsapp",
      label: "WhatsApp Channel",
      handle: "RHMT OFC Channel",
      url: "https://whatsapp.com/channel/0029VbBjyjlJ93wa6hwSWa0p",
    },
  ] as readonly DeveloperSocialLink[],
} as const;

export const APP_INFO = {
  name: "Meld Web",
  subtitle: "Studio Music Player & Lyrics Suite",
  version: "2.1.0",
  engine: "Client-Side Streaming + Web Audio DSP + Canvas Video Exporter",
  privacyNote: "Semua preferensi, playlist, riwayat dengar, dan pengaturan EQ disimpan 100% lokal di perangkat Anda tanpa pelacakan akun.",
  shortcuts: [
    { keys: "Space", desc: "Putar / Jeda" },
    { keys: "← / →", desc: "Mundur / Maju cepat" },
    { keys: "N / P", desc: "Lagu berikutnya / sebelumnya" },
    { keys: "M", desc: "Bisukan / Aktifkan suara" },
    { keys: "L / Q", desc: "Buka panel Lirik / Antrean" },
    { keys: "Ctrl + K", desc: "Pencarian cepat & impor URL" },
  ],
} as const;
