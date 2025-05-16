// RepoDetox followers page: shows followers, uses cached auth, theme, stats
function saveStatsFollowers(followers) {
  localStorage.setItem('repodetox_followers', followers);
  if (document.getElementById('mini-followers')) document.getElementById('mini-followers').textContent = followers;
}
function getAuth() {
  return {
    username: localStorage.getItem('repodetox_username') || sessionStorage.getItem('repodetox_username') || '',
    token: localStorage.getItem('repodetox_token') || sessionStorage.getItem('repodetox_token') || '',
  };
}
const followersForm = document.getElementById('followersForm');
const followersUsernameInput = document.getElementById('followers_username');
const followersTokenInput = document.getElementById('followers_token');
const followersResultDiv = document.getElementById('followers_result');
const followersLoadingDiv = document.getElementById('followers_loading');
const followersResultsSection = document.getElementById('followers-results-section');
const followersUserSearchInput = document.getElementById('followersUserSearch');
const followersStatsSection = document.getElementById('followers-stats-section');
const statFollowersPg = document.getElementById('stat-followers-pg');
let allFollowers = [];

async function fetchWithPagination(url, token) {
  let results = [];
  let nextUrl = url;
  while (nextUrl) {
    const resp = await fetch(nextUrl, token ? {
      headers: {
        Authorization: `token ${token}`
      }
    } : {});
    if (!resp.ok) throw new Error('Failed to fetch: ' + url + ' (' + resp.status + ')');
    const data = await resp.json();
    results = results.concat(data);
    // Parse Link header for pagination
    const link = resp.headers.get('Link');
    if (link && link.includes('rel="next"')) {
      const match = link.match(/<([^>]+)>;\s*rel="next"/);
      nextUrl = match ? match[1] : null;
    } else {
      nextUrl = null;
    }
  }
  return results;
}
function renderFollowers(list) {
  if (list.length === 0) {
    followersResultDiv.innerHTML = `<p>No followers found.</p>`;
    return;
  }
  followersResultDiv.innerHTML = `
    <p>
      <b>Users following you (${list.length}):</b>
    </p>
    <ul id="followers-list">
      ${list.map((u, i) => {
        const rank = i + 1;
        const rankClass = (() => {
          switch(rank) {
            case 1: return 'rank-1';
            case 2: return 'rank-2';
            case 3: return 'rank-3';
            case 4: return 'rank-4';
            case 5: return 'rank-5';
            default: return 'rank-other';
          }
        })();
        return `
          <li class="follower-list-item" data-login="${u.login}">
            <span class="rank-badge ${rankClass}">${rank}</span>
            <img src="${u.avatar_url}&s=40" alt="${u.login}" />
            <a href="https://github.com/${u.login}" target="_blank">${u.login}</a>
          </li>
        `;
      }).join('')}
    </ul>
  `;
}
function applyFollowersSearch() {
  let filtered = allFollowers.slice();
  const searchVal = followersUserSearchInput.value.trim().toLowerCase();
  if (searchVal) {
    filtered = filtered.filter(u =>
      u.login.toLowerCase().includes(searchVal)
    );
  }
  renderFollowers(filtered);
}
function autoLoginFollowersIfPossible() {
  const { username, token } = getAuth();
  if (username && token) {
    document.getElementById('login-section-followers').style.display = 'none';
    runFollowersFetch(username, token);
  }
}
async function runFollowersFetch(username, token) {
  followersResultsSection.style.display = 'block';
  followersStatsSection.style.display = 'flex';
  followersLoadingDiv.style.display = 'block';
  try {
    const followers = await fetchWithPagination(`https://api.github.com/users/${username}/followers?per_page=100`, token);
    allFollowers = followers;
    statFollowersPg.textContent = followers.length;
    saveStatsFollowers(followers.length);
    applyFollowersSearch();
  } catch (err) {
    followersResultDiv.innerHTML = `<p style="color: #d73a49;">Error: ${err.message}</p>`;
  } finally {
    followersLoadingDiv.style.display = 'none';
  }
}
followersForm && followersForm.addEventListener('submit', function(e){
  e.preventDefault();
  const username = followersUsernameInput.value.trim();
  const token = followersTokenInput.value.trim();
  if (!username || !token) return;
  localStorage.setItem('repodetox_username', username);
  localStorage.setItem('repodetox_token', token);
  document.getElementById('login-section-followers').style.display = 'none';
  runFollowersFetch(username, token);
});
followersUserSearchInput && followersUserSearchInput.addEventListener('input', applyFollowersSearch);
window.addEventListener('DOMContentLoaded', autoLoginFollowersIfPossible);