// /diag probe (perf-budget.md §3, §5.6). External file so the page's CSP can stay script-src 'self'.
(async () => {
  const rows = [];
  const add = (k, v) => rows.push([k, v]);
  const yesno = (b) => b ? '<span class="yes">oui</span>' : '<span class="no">non</span>';
  const png = new File([new Uint8Array([137,80,78,71])], 'card.png', { type: 'image/png' });
  const key = 'aec-diag-visits';
  let visits = 0, lsError = null;
  try { visits = Number(localStorage.getItem(key) || 0) + 1; localStorage.setItem(key, String(visits)); } catch (e) { lsError = String(e); }
  let persisted = null;
  try { persisted = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : null; } catch (e) { persisted = null; }
  add('navigator.share', yesno('share' in navigator));
  add('share avec fichiers (canShare files)', yesno(!!(navigator.canShare && navigator.canShare({ files: [png] }))));
  add('localStorage : visites (persistant si > 1 après fermeture)', lsError ? '<span class="no">erreur</span> ' + lsError : String(visits));
  add('storage.persisted()', persisted === null ? 'n/d' : yesno(persisted));
  add('Service worker', yesno('serviceWorker' in navigator));
  add('View Transitions (même document)', yesno('startViewTransition' in document));
  add('userAgentData.brands', navigator.userAgentData && navigator.userAgentData.brands ? navigator.userAgentData.brands.map(b => b.brand + ' ' + b.version).join(', ') : 'n/d');
  add('prefers-reduced-motion', yesno(matchMedia('(prefers-reduced-motion: reduce)').matches));
  add('prefers-color-scheme: dark', yesno(matchMedia('(prefers-color-scheme: dark)').matches));
  add('standalone (PWA)', navigator.standalone === undefined ? 'n/d' : yesno(navigator.standalone));
  add('viewport × DPR', innerWidth + ' × ' + innerHeight + ' @' + devicePixelRatio);
  const ua = navigator.userAgent;
  const inApp = /(Instagram|FBAN|FBAV|FB_IAB|Orca-Android|BytedanceWebview|musical_ly|TikTok|Telegram|WhatsApp)/i.exec(ua);
  const wv = /; wv\)/.test(ua);
  const iosNoSafari = /iPhone|iPad/.test(ua) && !/Safari\//.test(ua);
  add('Jeton in-app détecté (UA)', inApp ? inApp[1] : (wv ? 'WebView Android (wv)' : (iosNoSafari ? 'WKWebView (pas de Safari/)' : 'aucun : navigateur'))); 
  add('Heure', new Date().toISOString());
  document.getElementById('t').innerHTML = rows.map(([k, v]) => '<tr><td>' + k + '</td><td>' + v + '</td></tr>').join('');
  document.getElementById('ua').textContent = ua;
  const out = document.getElementById('shareResult');
  const url = location.origin + '/m/c12-s01-k01';
  document.getElementById('share').onclick = async () => {
    try { await navigator.share({ title: 'AEC Discover', text: 'Test de partage (texte + lien)', url }); out.textContent = 'Partage texte+lien : OK'; }
    catch (e) { out.textContent = 'Partage texte+lien : ' + (e && e.name) + ' ' + (e && e.message); }
  };
  document.getElementById('shareFiles').onclick = async () => {
    try {
      const res = await fetch('/og/m/c12-s01-k01.png?r=square');
      const blob = await res.blob();
      const file = new File([blob], 'aec-c12-s01-k01.png', { type: 'image/png' });
      if (navigator.canShare && !navigator.canShare({ files: [file] })) { out.textContent = 'canShare(files) = false'; return; }
      await navigator.share({ files: [file], title: 'AEC Discover', text: 'Test de partage avec image', url });
      out.textContent = 'Partage avec image : OK';
    } catch (e) { out.textContent = 'Partage avec image : ' + (e && e.name) + ' ' + (e && e.message); }
  };
})();
