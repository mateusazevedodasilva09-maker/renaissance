/**
 * Fond dégradé décoratif, plein écran, placé DERRIÈRE le contenu
 * (position fixe, z-index négatif, sans interaction). Purement visuel : à
 * poser une fois en tête d'une page.
 *
 * Usage :
 *   <>
 *     <GradientBackground />
 *     {/* … contenu … *\/}
 *   </>
 *
 * Les teintes suivent le thème (variables CSS) : douces en clair, discrètes en
 * sombre. Le style vit dans globals.css (.gradient-bg).
 */
export default function GradientBackground() {
  return <div aria-hidden="true" className="gradient-bg" />;
}
