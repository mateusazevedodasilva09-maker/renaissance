import "./globals.css";

export const metadata = {
  title: "Essência — Coaching",
  description: "Essência — coaching sportif. A força vem de dentro.",
};

// Adaptation mobile : largeur réelle de l'appareil.
export const viewport = { width: "device-width", initialScale: 1 };

/** Applique le thème enregistré avant le premier rendu (évite le flash). */
const themeScript = `
try {
  var t = localStorage.getItem("renaissance-theme");
  if (t === "dark") document.documentElement.setAttribute("data-theme", "dark");
} catch (e) {}
`;

export default function RootLayout({ children }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
