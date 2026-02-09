/**
 * AgentForge Platform Theme - Apply saved theme on load
 * Run early in <head> so theme is applied before first paint (no flash).
 * Uses localStorage key: agentforge-theme (same as Settings → Theme).
 */
(function () {
    var theme = localStorage.getItem('agentforge-theme') || 'dark';
    if (theme && theme !== 'dark') {
        document.documentElement.setAttribute('data-theme', theme);
    }
})();
