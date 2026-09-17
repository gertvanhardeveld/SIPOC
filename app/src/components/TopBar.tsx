import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import SetPasswordModal from "./modals/SetPasswordModal";

/** Balk boven de hoofdinhoud (niet boven de zijbalk) — begint dus precies
 * boven het SIPOC-bord/de Procesketens-/Organogram-view. Links de
 * SIPOC/Procesketens/Organogram-schakelaar (verplaatst uit de zijbalk),
 * rechts "Wachtwoord" — allemaal hetzelfde lettertype/dezelfde grootte.
 * Wie is ingelogd blijft, samen met "Uitloggen", linksboven in de
 * zijbalk staan. */
export default function TopBar() {
  const location = useLocation();
  const isChains = location.pathname.startsWith("/procesketens");
  const isOrgChart = location.pathname.startsWith("/organogram");
  const isSipoc = !isChains && !isOrgChart;
  const [settingPassword, setSettingPassword] = useState(false);

  function linkClass(active: boolean) {
    return `text-sm font-semibold ${active ? "text-header-text" : "text-grey-text hover:text-header-text"}`;
  }

  return (
    <header className="top-bar flex shrink-0 items-center justify-between border-b border-border bg-panel px-6 py-3">
      <nav className="flex items-center gap-2">
        <Link to="/" className={linkClass(isSipoc)}>
          SIPOC
        </Link>
        <span className="text-grey-text">·</span>
        <Link to="/procesketens" className={linkClass(isChains)}>
          Procesketens
        </Link>
        <span className="text-grey-text">·</span>
        <Link to="/organogram" className={linkClass(isOrgChart)}>
          Organogram
        </Link>
      </nav>
      <button
        type="button"
        onClick={() => setSettingPassword(true)}
        className="text-sm font-semibold text-grey-text hover:text-header-text"
      >
        Wachtwoord
      </button>
      {settingPassword && <SetPasswordModal onClose={() => setSettingPassword(false)} />}
    </header>
  );
}
