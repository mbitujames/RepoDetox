// Theme toggle with localStorage persistence
(function () {
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('repodetox_theme', theme);
  }
  function getTheme() {
    return localStorage.getItem('repodetox_theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  window.setRepoDetoxTheme = setTheme;
  window.getRepoDetoxTheme = getTheme;

  setTheme(getTheme());
})();