(function () {
  const state = loadState();

  // ---- Auth guard ----
  if (!state.profile || !state.profile.name) {
    window.location.href = "index.html";
    return;
  }

  const viewRoot = document.getElementById("viewRoot");
  const topbarTitle = document.getElementById("topbarTitle");
  const verseWidget = document.getElementById("verseWidget");

  document.getElementById("profileName").textContent = state.profile.name;
  document.getElementById("profileAvatar").textContent = initials(state.profile.name);
  const v = verseOfTheDay();
  verseWidget.innerHTML = `"${escapeHtml(v.text)}" <strong>— ${escapeHtml(v.ref)}</strong>`;

  document.getElementById("signOutBtn").addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.href = "index.html";
  });

  const ROUTE_TITLES = {
    wall: "Prayer Wall",
    groups: "Bible Study Groups",
    partner: "Prayer Partner",
    feed: "Testimony Feed",
  };

  function persist() { saveState(state); }

  // ---------------- Mobile sidebar ----------------
  const sidebarEl = document.querySelector(".sidebar");
  const sidebarBackdrop = document.getElementById("sidebarBackdrop");
  const menuToggleBtn = document.getElementById("menuToggleBtn");

  function closeSidebar() {
    sidebarEl.classList.remove("open");
    sidebarBackdrop.classList.remove("visible");
    menuToggleBtn.textContent = "☰";
  }
  function toggleSidebar() {
    const open = sidebarEl.classList.toggle("open");
    sidebarBackdrop.classList.toggle("visible", open);
    menuToggleBtn.textContent = open ? "✕" : "☰";
  }

  menuToggleBtn.addEventListener("click", toggleSidebar);
  sidebarBackdrop.addEventListener("click", closeSidebar);

  // ---------------- Video meeting (Jitsi Meet, no backend required) ----------------
  function openMeeting(label, roomName) {
    document.querySelectorAll(".meeting-modal-backdrop").forEach((el) => el.remove());
    const displayName = encodeURIComponent(state.profile.name);
    const src = `https://meet.jit.si/${encodeURIComponent(roomName)}#userInfo.displayName=%22${displayName}%22&config.prejoinPageEnabled=true&config.disableDeepLinking=true`;

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop meeting-modal-backdrop";
    backdrop.innerHTML = `
      <div class="modal meeting-modal">
        <div class="meeting-modal-header">
          <strong>🎥 ${escapeHtml(label)}</strong>
          <div style="display:flex; align-items:center; gap:14px;">
            <span class="meeting-modal-note">Powered by Jitsi Meet — free, no account needed</span>
            <button class="btn btn-outline btn-sm" id="closeMeetingBtn">Close</button>
          </div>
        </div>
        <iframe src="${src}" allow="camera; microphone; fullscreen; display-capture; autoplay" allowfullscreen></iframe>
      </div>
    `;
    document.body.appendChild(backdrop);
    document.getElementById("closeMeetingBtn").addEventListener("click", () => backdrop.remove());
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) backdrop.remove();
    });
  }

  // ---------------- Router ----------------
  function currentRoute() {
    const hash = window.location.hash.replace(/^#\/?/, "") || "wall";
    return hash;
  }

  function navigate(route) {
    window.location.hash = "#/" + route;
  }

  function render() {
    const route = currentRoute();
    const [base, param] = route.split("/");

    document.querySelectorAll(".nav-link").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.route === base);
    });
    topbarTitle.textContent = ROUTE_TITLES[base] || "Lumen";

    if (base === "wall") return renderWall();
    if (base === "groups" && param) return renderGroupDetail(param);
    if (base === "groups") return renderGroups();
    if (base === "partner") return renderPartner();
    if (base === "feed") return renderFeed();
    return renderWall();
  }

  window.addEventListener("hashchange", render);
  document.querySelectorAll(".nav-link[data-route]").forEach((btn) => {
    btn.addEventListener("click", () => {
      closeSidebar();
      navigate(btn.dataset.route);
    });
  });

  // ---------------- Prayer Wall ----------------
  const PRAYER_CATEGORIES = ["Healing", "Family", "Guidance", "Thanksgiving", "Other"];
  let wallFilter = { q: "", category: "All" };
  let editingPrayerId = null;

  function renderWall() {
    viewRoot.innerHTML = `
      <div class="view">
        <div class="view-head">
          <h2>Prayer Wall</h2>
          <p>Share a request, or pray for someone else's right now.</p>
        </div>

        <div class="card card-pad" style="margin-bottom:22px;">
          <form id="prayerForm">
            <div class="field">
              <label for="prayerText">Your prayer request</label>
              <textarea id="prayerText" rows="3" placeholder="What's on your heart today?" required></textarea>
            </div>
            <div class="row-between" style="align-items:flex-end;">
              <div style="display:flex; gap:14px; flex-wrap:wrap;">
                <div class="field" style="margin-bottom:0; min-width:160px;">
                  <label for="prayerCategory">Category</label>
                  <select id="prayerCategory">
                    ${PRAYER_CATEGORIES.map((c) => `<option>${c}</option>`).join("")}
                  </select>
                </div>
                <div class="checkbox-row" style="padding-bottom:10px;">
                  <input type="checkbox" id="prayerAnon" />
                  <label for="prayerAnon" style="font-weight:400; margin:0;">Post anonymously</label>
                </div>
              </div>
              <button class="btn btn-primary" type="submit">Post request</button>
            </div>
          </form>
        </div>

        <div class="filter-row">
          <input type="text" id="wallSearch" placeholder="Search requests..." value="${escapeHtml(wallFilter.q)}" />
          <select id="wallCategoryFilter">
            <option value="All" ${wallFilter.category === "All" ? "selected" : ""}>All categories</option>
            ${PRAYER_CATEGORIES.map((c) => `<option value="${c}" ${wallFilter.category === c ? "selected" : ""}>${c}</option>`).join("")}
          </select>
        </div>

        <div class="stack" id="prayerList"></div>
      </div>
    `;

    document.getElementById("prayerForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const text = document.getElementById("prayerText").value.trim();
      if (!text) return;
      const anon = document.getElementById("prayerAnon").checked;
      const category = document.getElementById("prayerCategory").value;
      state.prayers.push({
        id: "p" + Date.now(),
        owner: state.profile.name,
        name: anon ? "Anonymous" : state.profile.name,
        text,
        category,
        prayedBy: 0,
        createdAt: Date.now(),
      });
      persist();
      renderWall();
    });

    document.getElementById("wallSearch").addEventListener("input", (e) => {
      wallFilter.q = e.target.value;
      renderPrayerList();
    });
    document.getElementById("wallCategoryFilter").addEventListener("change", (e) => {
      wallFilter.category = e.target.value;
      renderPrayerList();
    });

    renderPrayerList();
  }

  function renderPrayerList() {
    const list = document.getElementById("prayerList");
    const q = wallFilter.q.trim().toLowerCase();
    const filtered = state.prayers
      .filter((p) => wallFilter.category === "All" || p.category === wallFilter.category)
      .filter((p) => !q || p.text.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
      .sort((a, b) => b.createdAt - a.createdAt);

    if (filtered.length === 0) {
      list.innerHTML = state.prayers.length
        ? `<div class="empty-state"><div class="big">🔍</div>No requests match your search.</div>`
        : `<div class="empty-state"><div class="big">🙏</div>No requests yet — be the first to share one.</div>`;
      return;
    }

    list.innerHTML = filtered
      .map((p) => {
        const prayed = state.prayedIds.includes(p.id);
        const mine = p.owner === state.profile.name;

        if (editingPrayerId === p.id) {
          return `
          <div class="card prayer-card">
            <div class="field" style="margin-bottom:10px;">
              <textarea class="edit-text" rows="3">${escapeHtml(p.text)}</textarea>
            </div>
            <div class="row-between">
              <select class="edit-category">
                ${PRAYER_CATEGORIES.map((c) => `<option ${p.category === c ? "selected" : ""}>${c}</option>`).join("")}
              </select>
              <div style="display:flex; gap:8px;">
                <button class="btn btn-outline btn-sm" data-cancel="${p.id}">Cancel</button>
                <button class="btn btn-primary btn-sm" data-save="${p.id}">Save</button>
              </div>
            </div>
          </div>`;
        }

        return `
        <div class="card prayer-card">
          <div class="prayer-meta">
            <span class="tag">${escapeHtml(p.category)}</span>
            <span>${escapeHtml(p.name)} · ${timeAgo(p.createdAt)}</span>
          </div>
          <p class="prayer-text">${escapeHtml(p.text)}</p>
          <div class="row-between">
            <button class="pray-btn ${prayed ? "active" : ""}" data-id="${p.id}">
              🙏 ${prayed ? "You're praying" : "I'm praying"} · ${p.prayedBy}
            </button>
            ${mine ? `<div class="card-actions"><button class="link-btn" data-edit="${p.id}">Edit</button><button class="link-btn link-btn-danger" data-delete="${p.id}">Delete</button></div>` : ""}
          </div>
        </div>`;
      })
      .join("");

    list.querySelectorAll(".pray-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const prayer = state.prayers.find((p) => p.id === id);
        if (!prayer) return;
        const already = state.prayedIds.includes(id);
        if (already) {
          state.prayedIds = state.prayedIds.filter((x) => x !== id);
          prayer.prayedBy = Math.max(0, prayer.prayedBy - 1);
        } else {
          state.prayedIds.push(id);
          prayer.prayedBy += 1;
        }
        persist();
        renderPrayerList();
      });
    });

    list.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        editingPrayerId = btn.dataset.edit;
        renderPrayerList();
      });
    });
    list.querySelectorAll("[data-cancel]").forEach((btn) => {
      btn.addEventListener("click", () => {
        editingPrayerId = null;
        renderPrayerList();
      });
    });
    list.querySelectorAll("[data-save]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.save;
        const prayer = state.prayers.find((p) => p.id === id);
        const card = btn.closest(".prayer-card");
        const text = card.querySelector(".edit-text").value.trim();
        const category = card.querySelector(".edit-category").value;
        if (!text) return;
        prayer.text = text;
        prayer.category = category;
        editingPrayerId = null;
        persist();
        renderPrayerList();
      });
    });
    list.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.delete;
        if (!confirm("Delete this prayer request?")) return;
        state.prayers = state.prayers.filter((p) => p.id !== id);
        state.prayedIds = state.prayedIds.filter((x) => x !== id);
        persist();
        renderPrayerList();
      });
    });
  }

  // ---------------- Bible Study Groups ----------------
  let groupsFilter = { q: "" };

  function renderGroups() {
    viewRoot.innerHTML = `
      <div class="view view-wide">
        <div class="view-head">
          <h2>Bible Study Groups</h2>
          <p>Join a small group and grow in the Word together.</p>
        </div>
        <div class="filter-row">
          <input type="text" id="groupsSearch" placeholder="Search by name, focus, or schedule..." value="${escapeHtml(groupsFilter.q)}" />
        </div>
        <div class="grid-cards" id="groupsGrid"></div>
      </div>
    `;

    document.getElementById("groupsSearch").addEventListener("input", (e) => {
      groupsFilter.q = e.target.value;
      renderGroupsGrid();
    });

    renderGroupsGrid();
  }

  function renderGroupsGrid() {
    const grid = document.getElementById("groupsGrid");
    const q = groupsFilter.q.trim().toLowerCase();
    const filtered = state.groups.filter(
      (g) =>
        !q ||
        g.name.toLowerCase().includes(q) ||
        g.focus.toLowerCase().includes(q) ||
        g.schedule.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q)
    );

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="big">🔍</div>No groups match your search.</div>`;
      return;
    }

    grid.innerHTML = filtered
      .map(
        (g) => `
      <div class="card group-card" data-id="${g.id}">
        <div class="row-between">
          <h3>${escapeHtml(g.name)}</h3>
          ${g.joined ? '<span class="tag tag-good">Joined</span>' : `<span class="tag">${escapeHtml(g.focus)}</span>`}
        </div>
        <p class="desc">${escapeHtml(g.description)}</p>
        <div class="meta-row">
          <span>🗓 ${escapeHtml(g.schedule)}</span>
          <span>👥 ${g.members.length} members</span>
        </div>
        <div class="member-avatars">
          ${g.members
            .slice(0, 5)
            .map((m) => `<div class="avatar">${initials(m)}</div>`)
            .join("")}
        </div>
      </div>`
      )
      .join("");

    grid.querySelectorAll(".group-card").forEach((card) => {
      card.addEventListener("click", () => navigate("groups/" + card.dataset.id));
    });
  }

  let editingMessageId = null;

  function renderGroupDetail(id) {
    const g = state.groups.find((x) => x.id === id);
    if (!g) return renderGroups();

    viewRoot.innerHTML = `
      <div class="view">
        <button class="back-link" id="backToGroups">← Back to all groups</button>
        <div class="view-head">
          <div class="row-between">
            <div>
              <h2>${escapeHtml(g.name)}</h2>
              <p>${escapeHtml(g.schedule)} · ${g.members.length} members</p>
            </div>
            <button class="btn ${g.joined ? "btn-outline" : "btn-primary"}" id="joinBtn">
              ${g.joined ? "Leave group" : "Join group"}
            </button>
          </div>
        </div>

        <div class="card card-pad" style="margin-bottom:20px;">
          <span class="tag tag-accent">This week</span>
          <h3 style="margin:10px 0 6px; font-size:1.05rem;">${escapeHtml(g.passage)}</h3>
          <p style="color:var(--text-muted); font-size:0.9rem; margin:0;">${escapeHtml(g.description)}</p>
        </div>

        <div class="card card-pad meeting-card" style="margin-bottom:20px;">
          <div>
            <span class="tag tag-good">🎥 Live meeting room</span>
            <h3>Weekly study call — ${escapeHtml(g.schedule)}</h3>
            <p>Everyone in this group joins the same room. No sign-up or download needed.</p>
          </div>
          <button class="btn btn-accent" id="joinMeetingBtn">🎥 Join Video Meeting</button>
        </div>

        <div class="card card-pad">
          <h3 style="font-size:1rem; margin:0 0 4px;">Discussion</h3>
          <div id="discussionList">
            ${
              g.discussion.length
                ? g.discussion
                    .map((m) => {
                      const mine = m.owner === state.profile.name;
                      if (m.id && editingMessageId === m.id) {
                        return `
                      <div class="discussion-msg">
                        <div class="avatar" style="width:32px;height:32px;font-size:0.75rem;">${initials(m.who)}</div>
                        <div class="body">
                          <input type="text" class="edit-msg-text" value="${escapeHtml(m.text)}" style="width:100%; margin-bottom:8px;" />
                          <div style="display:flex; gap:8px;">
                            <button class="btn btn-outline btn-sm" data-msg-cancel="${m.id}">Cancel</button>
                            <button class="btn btn-primary btn-sm" data-msg-save="${m.id}">Save</button>
                          </div>
                        </div>
                      </div>`;
                      }
                      return `
              <div class="discussion-msg">
                <div class="avatar" style="width:32px;height:32px;font-size:0.75rem;">${initials(m.who)}</div>
                <div class="body">
                  <span class="who">${escapeHtml(m.who)}<span class="when">${timeAgo(m.when)}</span></span>
                  <p>${escapeHtml(m.text)}</p>
                  ${mine ? `<div class="msg-actions"><button class="link-btn" data-msg-edit="${m.id}">Edit</button><button class="link-btn link-btn-danger" data-msg-delete="${m.id}">Delete</button></div>` : ""}
                </div>
              </div>`;
                    })
                    .join("")
                : `<p style="color:var(--text-muted); font-size:0.88rem;">No messages yet — start the discussion.</p>`
            }
          </div>
          ${
            g.joined
              ? `<form id="discussionForm" style="margin-top:14px; display:flex; gap:10px;">
                  <input type="text" id="discussionInput" placeholder="Share a thought on this week's passage..." style="flex:1;" />
                  <button class="btn btn-primary btn-sm" type="submit">Post</button>
                </form>`
              : `<p style="margin-top:14px; font-size:0.82rem; color:var(--text-muted);">Join the group to take part in the discussion.</p>`
          }
        </div>
      </div>
    `;

    document.getElementById("backToGroups").addEventListener("click", () => navigate("groups"));
    document.getElementById("joinBtn").addEventListener("click", () => {
      g.joined = !g.joined;
      if (g.joined && !g.members.includes(state.profile.name)) {
        g.members.push(state.profile.name);
      } else if (!g.joined) {
        g.members = g.members.filter((m) => m !== state.profile.name);
      }
      persist();
      renderGroupDetail(id);
    });

    document.getElementById("joinMeetingBtn").addEventListener("click", () => {
      openMeeting(`${g.name} — Weekly Call`, groupRoomName(g));
    });

    const form = document.getElementById("discussionForm");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = document.getElementById("discussionInput");
        const text = input.value.trim();
        if (!text) return;
        g.discussion.push({ id: "m" + Date.now(), who: state.profile.name, owner: state.profile.name, text, when: Date.now() });
        persist();
        renderGroupDetail(id);
      });
    }

    document.querySelectorAll("[data-msg-edit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        editingMessageId = btn.dataset.msgEdit;
        renderGroupDetail(id);
      });
    });
    document.querySelectorAll("[data-msg-cancel]").forEach((btn) => {
      btn.addEventListener("click", () => {
        editingMessageId = null;
        renderGroupDetail(id);
      });
    });
    document.querySelectorAll("[data-msg-save]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const msgId = btn.dataset.msgSave;
        const msg = g.discussion.find((m) => m.id === msgId);
        const input = btn.closest(".discussion-msg").querySelector(".edit-msg-text");
        const text = input.value.trim();
        if (!text || !msg) return;
        msg.text = text;
        editingMessageId = null;
        persist();
        renderGroupDetail(id);
      });
    });
    document.querySelectorAll("[data-msg-delete]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!confirm("Delete this message?")) return;
        g.discussion = g.discussion.filter((m) => m.id !== btn.dataset.msgDelete);
        persist();
        renderGroupDetail(id);
      });
    });
  }

  // ---------------- Prayer Partner ----------------
  const FOCUS_OPTIONS = ["Family & parenting", "Spiritual growth", "Health & healing", "Career & purpose"];
  const AVAILABILITY_OPTIONS = ["Mornings", "Evenings", "Weekends"];
  let selectedFocus = null;
  let selectedAvailability = null;

  function renderPartner() {
    if (state.partner) {
      const p = state.partner;
      viewRoot.innerHTML = `
        <div class="view">
          <div class="view-head">
            <h2>Prayer Partner</h2>
            <p>You've been matched. Check in regularly and pray for each other.</p>
          </div>
          <div class="card match-card" style="margin-bottom:20px;">
            <div class="avatar match-avatar">${initials(p.name)}</div>
            <h3 style="margin:0 0 4px;">${escapeHtml(p.name)}</h3>
            <p style="color:var(--text-muted); font-size:0.88rem; margin:0 0 10px;">${escapeHtml(p.bio)}</p>
            <p style="font-style:italic; color:var(--text-muted); font-size:0.85rem; margin:0 0 14px;">"Favorite verse: ${escapeHtml(p.verse)}"</p>
            <span class="tag">Focus: ${escapeHtml(p.focus)}</span>
            <p style="font-size:0.78rem; color:var(--text-muted); margin:14px 0 0;">Partnered since ${new Date(p.since).toLocaleDateString()}</p>
          </div>

          <div class="card card-pad meeting-card" style="margin-bottom:20px;">
            <div>
              <span class="tag tag-good">🎥 Private meeting room</span>
              <h3>Video call with ${escapeHtml(p.name)}</h3>
              <p>A private room just for the two of you. No sign-up or download needed.</p>
            </div>
            <button class="btn btn-accent" id="joinPartnerMeetingBtn">🎥 Join Video Meeting</button>
          </div>

          <div class="card card-pad" style="margin-bottom:20px;">
            <h3 style="font-size:1rem; margin:0 0 12px;">Log a check-in</h3>
            <form id="checkinForm" style="display:flex; gap:10px;">
              <input type="text" id="checkinInput" placeholder="e.g. Prayed for their job search today" style="flex:1;" />
              <button class="btn btn-primary btn-sm" type="submit">Log it</button>
            </form>
          </div>

          <div class="card card-pad">
            <h3 style="font-size:1rem; margin:0 0 6px;">Check-in history</h3>
            <div id="checkinList">
              ${
                p.checkins.length
                  ? p.checkins
                      .map(
                        (c) => `<div class="checkin-item"><span>${escapeHtml(c.note)}</span><span class="date">${new Date(c.at).toLocaleDateString()}</span></div>`
                      )
                      .join("")
                  : `<p style="color:var(--text-muted); font-size:0.88rem;">No check-ins logged yet.</p>`
              }
            </div>
          </div>

          <button class="btn btn-ghost btn-sm" id="endPartnerBtn" style="margin-top:16px; padding-left:0;">End this partnership</button>
        </div>
      `;

      document.getElementById("checkinForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const input = document.getElementById("checkinInput");
        const note = input.value.trim();
        if (!note) return;
        state.partner.checkins.unshift({ note, at: Date.now() });
        persist();
        renderPartner();
      });
      document.getElementById("endPartnerBtn").addEventListener("click", () => {
        state.partner = null;
        persist();
        renderPartner();
      });
      document.getElementById("joinPartnerMeetingBtn").addEventListener("click", () => {
        openMeeting(`Call with ${p.name}`, partnerRoomName(state.profile.name, p.name));
      });
      return;
    }

    // No partner yet — preference + matching flow
    viewRoot.innerHTML = `
      <div class="view">
        <div class="view-head">
          <h2>Find a Prayer Partner</h2>
          <p>Tell us your prayer focus and availability, and we'll match you with someone.</p>
        </div>
        <div class="card card-pad">
          <div class="pref-grid">
            <div>
              <label>What would you like prayer support with?</label>
              <div class="chip-select" id="focusChips">
                ${FOCUS_OPTIONS.map((f) => `<div class="chip-option ${selectedFocus === f ? "selected" : ""}" data-focus="${escapeHtml(f)}">${escapeHtml(f)}</div>`).join("")}
              </div>
            </div>
            <div>
              <label>When are you usually available?</label>
              <div class="chip-select" id="availChips">
                ${AVAILABILITY_OPTIONS.map((a) => `<div class="chip-option ${selectedAvailability === a ? "selected" : ""}" data-avail="${escapeHtml(a)}">${escapeHtml(a)}</div>`).join("")}
              </div>
            </div>
          </div>
          <button class="btn btn-primary" id="findMatchBtn" style="margin-top:22px;" ${!(selectedFocus && selectedAvailability) ? "disabled" : ""}>
            Find my match
          </button>
        </div>
        <div id="matchResult" style="margin-top:20px;"></div>
      </div>
    `;

    document.querySelectorAll("#focusChips .chip-option").forEach((chip) => {
      chip.addEventListener("click", () => {
        selectedFocus = chip.dataset.focus;
        renderPartner();
      });
    });
    document.querySelectorAll("#availChips .chip-option").forEach((chip) => {
      chip.addEventListener("click", () => {
        selectedAvailability = chip.dataset.avail;
        renderPartner();
      });
    });

    const findBtn = document.getElementById("findMatchBtn");
    if (findBtn) {
      findBtn.addEventListener("click", () => {
        const byFocus = state.partnerCandidates.find((c) => c.focus === selectedFocus);
        const candidate = byFocus || state.partnerCandidates[Math.floor(Math.random() * state.partnerCandidates.length)];
        const resultEl = document.getElementById("matchResult");
        resultEl.innerHTML = `
          <div class="card match-card">
            <div class="avatar match-avatar">${initials(candidate.name)}</div>
            <h3 style="margin:0 0 4px;">${escapeHtml(candidate.name)}</h3>
            <p style="color:var(--text-muted); font-size:0.88rem; margin:0 0 10px;">${escapeHtml(candidate.bio)}</p>
            <span class="tag">Focus: ${escapeHtml(candidate.focus)}</span>
            <div style="margin-top:18px;">
              <button class="btn btn-primary" id="confirmMatchBtn">Request partnership</button>
            </div>
          </div>
        `;
        document.getElementById("confirmMatchBtn").addEventListener("click", () => {
          state.partner = { ...candidate, since: Date.now(), checkins: [] };
          persist();
          selectedFocus = null;
          selectedAvailability = null;
          renderPartner();
        });
      });
    }
  }

  // ---------------- Testimony Feed ----------------
  let editingFeedId = null;

  function renderFeed() {
    const sorted = [...state.feed].sort((a, b) => b.createdAt - a.createdAt);
    viewRoot.innerHTML = `
      <div class="view">
        <div class="view-head">
          <h2>Testimony Feed</h2>
          <p>Share what God is doing in your life, and encourage one another.</p>
        </div>

        <div class="card card-pad" style="margin-bottom:22px;">
          <form id="feedForm">
            <div class="field">
              <label for="feedText">Share a testimony or word of encouragement</label>
              <textarea id="feedText" rows="3" placeholder="What has God been doing?" required></textarea>
            </div>
            <div class="row-between" style="align-items:flex-end;">
              <div class="field" style="margin-bottom:0; min-width:220px;">
                <label for="feedVerse">Verse reference (optional)</label>
                <input type="text" id="feedVerse" placeholder="e.g. Romans 8:28" />
              </div>
              <button class="btn btn-primary" type="submit">Share</button>
            </div>
          </form>
        </div>

        <div class="stack" id="feedList"></div>
      </div>
    `;

    const list = document.getElementById("feedList");
    if (sorted.length === 0) {
      list.innerHTML = `<div class="empty-state"><div class="big">✨</div>No testimonies yet — be the first to share one.</div>`;
    } else {
      list.innerHTML = sorted
        .map((f) => {
          const liked = state.likedFeedIds.includes(f.id);
          const mine = f.owner === state.profile.name;

          if (editingFeedId === f.id) {
            return `
            <div class="card feed-card">
              <div class="field" style="margin-bottom:10px;">
                <textarea class="edit-text" rows="3">${escapeHtml(f.text)}</textarea>
              </div>
              <div class="field" style="margin-bottom:10px;">
                <input type="text" class="edit-verse" placeholder="Verse reference (optional)" value="${escapeHtml(f.verseRef || "")}" />
              </div>
              <div style="display:flex; justify-content:flex-end; gap:8px;">
                <button class="btn btn-outline btn-sm" data-cancel="${f.id}">Cancel</button>
                <button class="btn btn-primary btn-sm" data-save="${f.id}">Save</button>
              </div>
            </div>`;
          }

          return `
        <div class="card feed-card">
          <div class="prayer-meta">
            <span>${escapeHtml(f.author)} · ${timeAgo(f.createdAt)}</span>
          </div>
          <p class="prayer-text" style="margin-bottom:8px;">${escapeHtml(f.text)}</p>
          ${f.verseRef ? `<span class="tag tag-accent">${escapeHtml(f.verseRef)}</span>` : ""}
          <div class="row-between" style="margin-top:8px;">
            <div class="feed-actions" style="margin-top:0;">
              <button class="feed-action ${liked ? "active" : ""}" data-id="${f.id}">
                ${liked ? "❤️" : "🤍"} ${f.likedBy}
              </button>
              <span class="feed-action" style="cursor:default;">💬 ${f.comments}</span>
            </div>
            ${mine ? `<div class="card-actions"><button class="link-btn" data-edit="${f.id}">Edit</button><button class="link-btn link-btn-danger" data-delete="${f.id}">Delete</button></div>` : ""}
          </div>
        </div>`;
        })
        .join("");
    }

    document.getElementById("feedForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const text = document.getElementById("feedText").value.trim();
      if (!text) return;
      const verseRef = document.getElementById("feedVerse").value.trim();
      state.feed.push({
        id: "f" + Date.now(),
        owner: state.profile.name,
        author: state.profile.name,
        text,
        verseRef: verseRef || null,
        likedBy: 0,
        comments: 0,
        createdAt: Date.now(),
      });
      persist();
      renderFeed();
    });

    list.querySelectorAll(".feed-action[data-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const post = state.feed.find((f) => f.id === id);
        if (!post) return;
        const already = state.likedFeedIds.includes(id);
        if (already) {
          state.likedFeedIds = state.likedFeedIds.filter((x) => x !== id);
          post.likedBy = Math.max(0, post.likedBy - 1);
        } else {
          state.likedFeedIds.push(id);
          post.likedBy += 1;
        }
        persist();
        renderFeed();
      });
    });

    list.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        editingFeedId = btn.dataset.edit;
        renderFeed();
      });
    });
    list.querySelectorAll("[data-cancel]").forEach((btn) => {
      btn.addEventListener("click", () => {
        editingFeedId = null;
        renderFeed();
      });
    });
    list.querySelectorAll("[data-save]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.save;
        const post = state.feed.find((f) => f.id === id);
        const card = btn.closest(".feed-card");
        const text = card.querySelector(".edit-text").value.trim();
        const verseRef = card.querySelector(".edit-verse").value.trim();
        if (!text || !post) return;
        post.text = text;
        post.verseRef = verseRef || null;
        editingFeedId = null;
        persist();
        renderFeed();
      });
    });
    list.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.delete;
        if (!confirm("Delete this testimony?")) return;
        state.feed = state.feed.filter((f) => f.id !== id);
        state.likedFeedIds = state.likedFeedIds.filter((x) => x !== id);
        persist();
        renderFeed();
      });
    });
  }

  render();
})();
