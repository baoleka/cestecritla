/** Root index: the « Effacer ma progression » button (privacy.clear_button, D0.22). */
import { loadStrings, progress, toast, t } from './shared/ui.js';

await loadStrings();
document.getElementById('clear')?.addEventListener('click', () => {
  progress.clear();
  toast(t('privacy.cleared_toast'));
});
