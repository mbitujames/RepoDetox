// RepoDetox main: unfollow nonfollowers with mass unfollow, theme, stats

function saveAuth(username, token) {
  localStorage.setItem('repodetox_username', username);
  localStorage.setItem('repodetox_token', token);
  sessionStorage.setItem('repodetox_username', username);
  sessionStorage.setItem('repodetox_token', token);
}
function getAuth() {
  return {
    username: localStorage.getItem('repodetox_username') || sessionStorage.getItem('repodetox_username') || '',
    token: localStorage.getItem('repodetox_token') || sessionStorage.getItem('repodetox_token') || '',
  };
}
function saveStats(followers, nonfollowers) {
  localStorage.setItem('repodetox_followers', followers);
  localStorage.setItem('repodetox_nonfollowers', nonfollowers);
  if (document.getElementById('mini-followers')) document.getElementById('mini-followers').textContent = followers;
  if (document.getElementById('mini-nonfollowers')) document.getElementById('mini-nonfollowers').textContent = nonfollowers;
}

const form = document.getElementById('userForm');
const usernameInput = document.getElementById('username');
const tokenInput = document.getElementById('token');
const resultDiv = document.getElementById('result');
const loadingDiv = document.getElementById('loading');
const resultsSection = document.getElementById('results-section');
const userSearchInput = document.getElementById('userSearch');
const filterOption = document.getElementById('filterOption');
const massActionBar = document.getElementById('mass-action-bar');
const selectAllCb = document.getElementById('selectAll');
const massUnfollowBtn = document.getElementById('massUnfollowBtn');
const statsSection = document.getElementById('stats-section');
const statFollowers = document.getElementById('stat-followers');
const statNonfollowers = document.getElementById('stat-nonfollowers');

let allNotFollowingBack = [];
let allFollowers = [];
let selectedUsers = new Set();

function getRankClass(rank) {
  switch(rank) {
    case 1: return 'rank-1';
    case 2: return 'rank-2';
    case 3: return 'rank-3';
    case 4: return 'rank-4';
    case 5: return 'rank-5';
    default: return 'rank-other';
  }
}

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

async function fetchFollowingWithTimestamps(username, token) {
  const following = await fetchWithPagination(`https://api.github.com/users/${username}/following?per_page=100`, token);
  let followTimestamps = {};
  try {
    const events = await fetchWithPagination(`https://api.github.com/users/${username}/events?per_page=100`, token);
    events.forEach(ev => {
      if (ev.type === "FollowEvent" && ev.payload && ev.payload.target && ev.created_at) {
        followTimestamps[ev.payload.target.login] = ev.created_at;
      }
    });
  } catch (e) {}
  return following.map(u => ({
    ...u,
    followed_at: followTimestamps[u.login] || null
  }));
}

function renderNotFollowingBack(list) {
  if (list.length === 0) {
    massActionBar.style.display = "none";
    resultDiv.innerHTML = `<p>🎉 Everyone you follow follows you back!</p>`;
    return;
  }
  massActionBar.style.display = "";
  let html = `
    <p>
      <b>Users you follow who do <u>not</u> follow you back (${list.length}):</b>
    </p>
    <ul id="not-following-list">
      ${list.map((u, i) => {
        const rank = i + 1;
        const rankClass = getRankClass(rank);
        let timestampStr = '';
        if (u.followed_at) {
          const d = new Date(u.followed_at);
          timestampStr = `<span class="timestamp-str">(${d.toLocaleString()})</span>`;
        }
        const checked = selectedUsers.has(u.login) ? 'checked' : '';
        return `
          <li class="user-list-item" data-login="${u.login}">
            <input type="checkbox" class="user-select" data-login="${u.login}" ${checked}>
            <span class="rank-badge ${rankClass}">${rank}</span>
            <img src="${u.avatar_url}&s=40" alt="${u.login}" />
            <a href="https://github.com/${u.login}" target="_blank">${u.login}</a>
            ${timestampStr}
            <button class="unfollow-btn" data-user="${u.login}">Unfollow</button>
          </li>
        `;
      }).join('')}
    </ul>
  `;
  resultDiv.innerHTML = html;
  updateMassUnfollowBtn();
}

function applySearchFilter() {
  let filtered = allNotFollowingBack.slice();

  const filterVal = filterOption.value;
  if (filterVal === "recent") {
    filtered.sort((a, b) => {
      if (a.followed_at && b.followed_at) {
        return new Date(b.followed_at) - new Date(a.followed_at);
      }
      if (a.followed_at) return -1;
      if (b.followed_at) return 1;
      return 0;
    });
  } else if (filterVal === "oldest") {
    filtered.sort((a, b) => {
      if (a.followed_at && b.followed_at) {
        return new Date(a.followed_at) - new Date(b.followed_at);
      }
      if (a.followed_at) return 1;
      if (b.followed_at) return -1;
      return 0;
    });
  }
  const searchVal = userSearchInput.value.trim().toLowerCase();
  if (searchVal) {
    filtered = filtered.filter(u =>
      u.login.toLowerCase().includes(searchVal)
    );
  }
  renderNotFollowingBack(filtered);
}

function updateStatsUI(followers, nonfollowers) {
  if (statFollowers) statFollowers.textContent = followers;
  if (statNonfollowers) statNonfollowers.textContent = nonfollowers;
  saveStats(followers, nonfollowers);
  renderNavbar();
}
function updateMassUnfollowBtn() {
  massUnfollowBtn.disabled = selectedUsers.size === 0;
  selectAllCb.checked = selectedUsers.size === allNotFollowingBack.length && allNotFollowingBack.length > 0;
}

function autoLoginIfPossible() {
  const auth = getAuth();
  if (auth.username && auth.token) {
    document.getElementById('login-section').style.display = 'none';
    runFetch(auth.username, auth.token);
  }
}
async function runFetch(username, token) {
  loadingDiv.style.display = 'block';
  resultsSection.style.display = 'block';
  statsSection.style.display = 'flex';
  try {
    const [followers, followingWithTimestamps] = await Promise.all([
      fetchWithPagination(`https://api.github.com/users/${username}/followers?per_page=100`, token),
      fetchFollowingWithTimestamps(username, token)
    ]);
    allFollowers = followers;
    const followerLogins = new Set(followers.map(u => u.login));
    let notFollowingBack = followingWithTimestamps.filter(u => !followerLogins.has(u.login));
    notFollowingBack.sort((a, b) => {
      if (a.followed_at && b.followed_at) {
        return new Date(b.followed_at) - new Date(a.followed_at);
      }
      if (a.followed_at) return -1;
      if (b.followed_at) return 1;
      return 0;
    });
    allNotFollowingBack = notFollowingBack;
    updateStatsUI(followers.length, notFollowingBack.length);
    applySearchFilter();
  } catch (err) {
    resultDiv.innerHTML = `<p style="color: var(--color-danger);">Error: ${err.message}</p>`;
  } finally {
    loadingDiv.style.display = 'none';
  }
}

form && form.addEventListener('submit', function(e){
  e.preventDefault();
  const username = usernameInput.value.trim();
  const token = tokenInput.value.trim();
  if (!username || !token) return;
  saveAuth(username, token);
  document.getElementById('login-section').style.display = 'none';
  runFetch(username, token);
});

userSearchInput && userSearchInput.addEventListener('input', applySearchFilter);
filterOption && filterOption.addEventListener('change', applySearchFilter);

resultDiv && resultDiv.addEventListener('click', async (e) => {
  // Individual unfollow
  if (e.target.classList.contains('unfollow-btn')) {
    const userToUnfollow = e.target.getAttribute('data-user');
    const { username, token } = getAuth();
    if (!username || !token || !userToUnfollow) return;
    e.target.disabled = true;
    e.target.textContent = 'Unfollowing...';
    try {
      const resp = await fetch(`https://api.github.com/user/following/${userToUnfollow}`, {
        method: 'DELETE',
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github+json"
        }
      });
      if (resp.status === 204) {
        allNotFollowingBack = allNotFollowingBack.filter(u => u.login !== userToUnfollow);
        selectedUsers.delete(userToUnfollow);
        updateStatsUI(allFollowers.length, allNotFollowingBack.length);
        applySearchFilter();
      } else {
        throw new Error(`Failed to unfollow ${userToUnfollow} (status: ${resp.status})`);
      }
    } catch (err) {
      alert('Error: ' + err.message);
      e.target.disabled = false;
      e.target.textContent = 'Unfollow';
    }
  }
  // Checkbox selection
  if (e.target.classList.contains('user-select')) {
    const login = e.target.getAttribute('data-login');
    if (e.target.checked) selectedUsers.add(login);
    else selectedUsers.delete(login);
    updateMassUnfollowBtn();
  }
});

// Mass unfollow select all
selectAllCb && selectAllCb.addEventListener('change', function() {
  if (selectAllCb.checked) {
    allNotFollowingBack.forEach(u => selectedUsers.add(u.login));
  } else {
    selectedUsers.clear();
  }
  applySearchFilter();
});
// Mass unfollow action
massUnfollowBtn && massUnfollowBtn.addEventListener('click', async function() {
  if (selectedUsers.size === 0) return;
  if (!confirm(`Unfollow ${selectedUsers.size} selected user(s)?`)) return;
  const toUnfollow = Array.from(selectedUsers);
  const { username, token } = getAuth();
  massUnfollowBtn.disabled = true;
  try {
    for (const userLogin of toUnfollow) {
      const resp = await fetch(`https://api.github.com/user/following/${userLogin}`, {
        method: 'DELETE',
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github+json"
        }
      });
      if (resp.status === 204) {
        allNotFollowingBack = allNotFollowingBack.filter(u => u.login !== userLogin);
        selectedUsers.delete(userLogin);
        updateStatsUI(allFollowers.length, allNotFollowingBack.length);
      }
      // For API rate limit: delay a bit (optional)
      await new Promise(r => setTimeout(r, 200));
    }
    applySearchFilter();
  } catch (err) {
    alert('Error: ' + err.message);
  }
  massUnfollowBtn.disabled = false;
});

window.addEventListener('DOMContentLoaded', autoLoginIfPossible);