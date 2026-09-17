import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import SetPasswordModal from "./modals/SetPasswordModal";

/** Balk boven de hoofdinhoud (niet boven de zijbalk) — begint dus precies
 * boven het SIPOC-bord/de Procesketens-view. Links de SIPOC/Procesketens-
 * schakelaar (verplaatst uit de zijbalk), rechts "Wachtwoord". Wie is
 * ingelogd blijft, samen met "Uitloggen", linksboven in de zijbalk staan. */
export default function TopBar() {
  const location = useLocation();
  const onChains = location.pathname.startsWith("/procesketens");
  const [settingPassword, setSettingPassword] = useState(false);

  return (
    <header className="top-bar flex shrink-0 items-center justify-between border-b border-border bg-panel px-6 py-3">
      <nav className="flex items-center gap-2">
        <Link
          to="/"
          className={`text-sm font-semibold ${onChains ? "text-grey-text hover:text-header-text" : "text-header-text"}`}
        >
          SIPOC
        </Link>
        <span className="text-grey-text">·</span>
        <Link
          to="/procesketens"
          className={`text-sm font-semibold ${onChains ? "text-header-text" : "text-grey-text hover:text-header-text"}`}
        >
          Procesketens
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
