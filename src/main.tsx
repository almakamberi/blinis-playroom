import '@fontsource-variable/nunito';
import './styles.css';
import './pwa';
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { ParentCorner } from './parent/ParentCorner';
import { Playroom } from './playroom/Playroom';
import { applySetupFromUrl, useSettings } from './settings/store';
import { applyThemeToDocument, THEMES } from './settings/themes';
import { isParentPath } from './paths';

registerSW({ immediate: true });
applySetupFromUrl();

const isParent = isParentPath();

function App() {
  const settings = useSettings();
  useEffect(() => {
    if (!isParent) applyThemeToDocument(THEMES[settings.theme]);
  }, [settings.theme]);
  return isParent ? <ParentCorner /> : <Playroom />;
}

document.body.classList.toggle('is-playroom', !isParent);
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
