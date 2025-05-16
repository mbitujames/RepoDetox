// Dynamically render the navigation bar with stats and theme toggle
function renderNavbar() {
  const theme = window.getRepoDetoxTheme ? window.getRepoDetoxTheme() : 'dark';
  const username = localStorage.getItem('repodetox_username') || '';
  const followers = localStorage.getItem('repodetox_followers') || '-';
  const nonfollowers = localStorage.getItem('repodetox_nonfollowers') || '-';
  let statsHTML = '';
  if (username) {
    statsHTML = `
      <span class="stats-mini">
        <span title="Followers">👥 <span id="mini-followers">${followers}</span></span>
        <span title="Not Following Back">🚫 <span id="mini-nonfollowers">${nonfollowers}</span></span>
      </span>`;
  }
  document.getElementById('navbar').innerHTML = `
    <div class="navbar-brand">
      <span class="logo">Repo<span class="logo-accent">Detox</span></span>
    </div>
    <div class="navbar-links">
      <a href="index.html" class="nav-link${location.pathname.endsWith('index.html') || location.pathname === '/' ? ' active' : ''}">Home</a>
      <a href="followers.html" class="nav-link${location.pathname.endsWith('followers.html') ? ' active' : ''}">Followers</a>
      <a href="about.html" class="nav-link${location.pathname.endsWith('about.html') ? ' active' : ''}">About</a>
      <a href="settings.html" class="nav-link${location.pathname.endsWith('settings.html') ? ' active' : ''}">Settings</a>
      ${statsHTML}
      <button class="theme-toggle" id="theme-toggle-btn" title="Toggle theme">
        <span class="theme-icon" id="theme-icon">${theme === 'light' ? '🌞' : '🌙'}</span>
      </button>
    </div>
  `;

  document.getElementById('theme-toggle-btn').onclick = () => {
    const newTheme = (window.getRepoDetoxTheme() === 'light') ? 'dark' : 'light';
    window.setRepoDetoxTheme(newTheme);
    document.getElementById('theme-icon').textContent = newTheme === 'light' ? '🌞' : '🌙';
  };
}
document.addEventListener('DOMContentLoaded', renderNavbar);