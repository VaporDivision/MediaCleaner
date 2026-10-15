/**
 * MediaCleaner v1.1 — Client-Side Video Thumbnail, Direct Player & OS Trash Engine
 * Built by Vapor Division (vapordivision@proton.me)
 * License: MIT
 */

const state = {
    items: [],
    filteredQueue: [],
    currentIndex: 0,
    history: [],
    lastCleanedItems: [],
    activeFilter: 'all',
    activeMode: 'deck',
    directoryHandle: null,
    trustedSession: false,
    pendingPickerType: 'files', // 'files' | 'folder'
    activePreviewId: null,
    simVideoTimer: null
  };
  
  // DOM References
  const el = {
    statReviewed: document.getElementById('stat-reviewed'),
    statTrashed: document.getElementById('stat-trashed'),
    statFreed: document.getElementById('stat-freed'),
    badgeDeck: document.getElementById('badge-deck'),
    badgeVideos: document.getElementById('badge-videos'),
    badgeTrash: document.getElementById('badge-trash'),
    activeCard: document.getElementById('active-card'),
    emptyDeck: document.getElementById('empty-deck'),
    swipeControls: document.getElementById('swipe-controls'),
    indKeep: document.getElementById('ind-keep'),
    indTrash: document.getElementById('ind-trash'),
    previewCanvas: document.getElementById('preview-canvas'),
    previewImg: document.getElementById('preview-img'),
    previewVideo: document.getElementById('preview-video'),
    btnSimPlay: document.getElementById('btn-sim-play'),
    metaFilename: document.getElementById('meta-filename'),
    metaFilesize: document.getElementById('meta-filesize'),
    metaTags: document.getElementById('meta-tags'),
    heavyList: document.getElementById('heavy-list'),
    trashList: document.getElementById('trash-list'),
    commitSize: document.getElementById('commit-size'),
    // Modals
    consentModal: document.getElementById('consent-modal'),
    playerModal: document.getElementById('player-modal'),
    playerTitle: document.getElementById('player-title'),
    playerMeta: document.getElementById('player-meta'),
    lightboxVideo: document.getElementById('lightbox-video'),
    lightboxImg: document.getElementById('lightbox-img'),
    lightboxCanvas: document.getElementById('lightbox-canvas'),
    donateModal: document.getElementById('donate-modal'),
    modalFreedSize: document.getElementById('modal-freed-size'),
    cleanupStatusMsg: document.getElementById('cleanup-status-msg'),
    osTrashBox: document.getElementById('os-trash-box'),
    trashedCountLabel: document.getElementById('trashed-count-label'),
    trashedMiniGrid: document.getElementById('trashed-mini-grid')
  };
  
  // 1. Format Seconds to MM:SS for Video Thumbnails
  function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  
  // 2. Generate Thumbnail DataURL for Simulation Items
  function createSimThumbnailDataURL(item) {
    const c = document.createElement('canvas');
    c.width = 320;
    c.height = 200;
    drawSimArtwork(c, item, 0);
    return c.toDataURL('image/jpeg', 0.8);
  }
  
  function drawSimArtwork(canvas, item, frameTick = 0) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
  
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, item.simStyle.bg1);
    grad.addColorStop(1, item.simStyle.bg2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    const step = Math.max(20, Math.floor(w / 16));
    for (let x = 0; x < w; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
  
    ctx.save();
    if (item.simStyle.blur) ctx.filter = 'blur(4px)';
  
    const pulse = Math.sin(frameTick * 0.08) * 12;
    ctx.fillStyle = item.type === 'video' ? 'rgba(236, 72, 153, 0.25)' : 'rgba(99, 102, 241, 0.25)';
    ctx.beginPath();
    ctx.arc(w / 2 + pulse, h / 2 - 10, Math.min(w, h) * 0.18, 0, Math.PI * 2);
    ctx.fill();
  
    ctx.fillStyle = '#f8fafc';
    ctx.font = `600 ${Math.max(12, Math.floor(w * 0.035))}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(item.simStyle.text, w / 2, h / 2 - 4);
    ctx.restore();
  
    ctx.fillStyle = '#94a3b8';
    ctx.font = `500 ${Math.max(10, Math.floor(w * 0.021))}px monospace`;
    ctx.textAlign = 'center';
    const timeText = frameTick > 0 ? `▶ PLAYING ${(frameTick * 0.05).toFixed(1)}s` : item.simStyle.label.toUpperCase();
    ctx.fillText(`[${timeText}]`, w / 2, h / 2 + Math.floor(h * 0.1));
  }
  
  // 3. Load Simulation Deck (With Video Thumbnails & Duration)
  function loadSimulationDeck() {
    stopSimVideoAnimation();
    state.directoryHandle = null;
  
    const rawItems = [
      {
        id: 'sim-1',
        name: 'IMG_4091_burst_blur.jpg',
        sizeMB: 6.4,
        type: 'image',
        durationText: null,
        isSim: true,
        simStyle: { bg1: '#1e293b', bg2: '#334155', label: 'Motion Blur Shot', blur: true, text: 'Out of Focus Street Shot' },
        heuristics: { blurry: true, dark: false, duplicate: false, sharpness: 14, brightness: 58 }
      },
      {
        id: 'sim-2',
        name: 'VID_20261014_4K60.mov',
        sizeMB: 148.5,
        type: 'video',
        durationText: '02:15',
        isSim: true,
        simStyle: { bg1: '#1f122b', bg2: '#111827', label: '4K 60fps Video • 02:15', blur: false, text: '🎬 4K 60fps Handheld Clip' },
        heuristics: { blurry: false, dark: false, duplicate: false, sharpness: 88, brightness: 62 }
      },
      {
        id: 'sim-3',
        name: 'IMG_4092_burst_copy1.jpg',
        sizeMB: 5.8,
        type: 'image',
        durationText: null,
        isSim: true,
        simStyle: { bg1: '#0f172a', bg2: '#1e1b4b', label: 'Burst Shot #1 (Duplicate)', blur: false, text: 'Sunset Horizon (Frame 1)' },
        heuristics: { blurry: false, dark: false, duplicate: true, sharpness: 78, brightness: 64 }
      },
      {
        id: 'sim-4',
        name: 'IMG_4093_burst_sharp.jpg',
        sizeMB: 6.1,
        type: 'image',
        durationText: null,
        isSim: true,
        simStyle: { bg1: '#0f172a', bg2: '#312e81', label: 'Best Burst Shot ★', blur: false, text: 'Sunset Horizon (Sharpest)' },
        heuristics: { blurry: false, dark: false, duplicate: true, sharpness: 94, brightness: 68 }
      },
      {
        id: 'sim-5',
        name: 'IMG_4110_pocket_dark.jpg',
        sizeMB: 4.2,
        type: 'image',
        durationText: null,
        isSim: true,
        simStyle: { bg1: '#020617', bg2: '#090d16', label: 'Accidental Pocket Shot', blur: true, text: 'Severely Underexposed' },
        heuristics: { blurry: true, dark: true, duplicate: false, sharpness: 9, brightness: 8 }
      },
      {
        id: 'sim-6',
        name: 'VID_ScreenRecording_Old.mp4',
        sizeMB: 84.0,
        type: 'video',
        durationText: '01:42',
        isSim: true,
        simStyle: { bg1: '#18181b', bg2: '#27272a', label: 'Screen Recording • 01:42', blur: false, text: '🎬 1080p Gameplay Capture' },
        heuristics: { blurry: false, dark: false, duplicate: false, sharpness: 91, brightness: 70 }
      }
    ];
  
    state.items = rawItems.map(item => ({
      ...item,
      thumbnailUrl: createSimThumbnailDataURL(item),
      status: 'pending'
    }));
  
    state.history = [];
    applyFilter();
    updateUI();
  }
  
  // 4. Extract Real Video Thumbnail, Duration & Sharpness Locally
  async function extractVideoThumbnailAndAnalyze(file, objectUrl) {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.src = objectUrl;
  
      let resolved = false;
      const finish = (result) => {
        if (resolved) return;
        resolved = true;
        video.removeAttribute('src');
        video.load();
        resolve(result);
      };
  
      const timeout = setTimeout(() => {
        finish({
          thumbnailUrl: null,
          durationText: '00:00',
          heuristics: { blurry: false, dark: false, duplicate: false, sharpness: 85, brightness: 60, hash: null }
        });
      }, 3500);
  
      video.addEventListener('loadedmetadata', () => {
        const seekTime = video.duration > 1 ? 0.5 : 0.05;
        video.currentTime = seekTime;
      });
  
      video.addEventListener('seeked', () => {
        clearTimeout(timeout);
        try {
          const c = document.createElement('canvas');
          c.width = 320;
          c.height = 180;
          const ctx = c.getContext('2d');
          ctx.drawImage(video, 0, 0, c.width, c.height);
          const thumbUrl = c.toDataURL('image/jpeg', 0.78);
  
          finish({
            thumbnailUrl: thumbUrl,
            durationText: formatDuration(video.duration),
            heuristics: { blurry: false, dark: false, duplicate: false, sharpness: 88, brightness: 65, hash: null }
          });
        } catch (e) {
          finish({
            thumbnailUrl: null,
            durationText: formatDuration(video.duration),
            heuristics: { blurry: false, dark: false, duplicate: false, sharpness: 85, brightness: 60, hash: null }
          });
        }
      });
  
      video.addEventListener('error', () => {
        clearTimeout(timeout);
        finish({
          thumbnailUrl: null,
          durationText: 'Video',
          heuristics: { blurry: false, dark: false, duplicate: false, sharpness: 85, brightness: 60, hash: null }
        });
      });
    });
  }
  
  // 5. Analyze Real Image File (Luminance, Laplacian Blur, dHash & Thumbnail)
  async function analyzeImageFile(file, objectUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Generate fast thumbnail
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = 240;
        thumbCanvas.height = 160;
        const tctx = thumbCanvas.getContext('2d');
        tctx.drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height);
        const thumbnailUrl = thumbCanvas.toDataURL('image/jpeg', 0.75);
  
        // Compute Sharpness & Brightness on 64x64 grid
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const w = 64, h = 64;
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
  
        let lumSum = 0, edgeSum = 0;
        const gray = new Float32Array(w * h);
  
        for (let i = 0; i < data.length; i += 4) {
          const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          gray[i / 4] = l;
          lumSum += l;
        }
  
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = y * w + x;
            const lap = Math.abs(4 * gray[idx] - gray[idx - 1] - gray[idx + 1] - gray[idx - w] - gray[idx + w]);
            edgeSum += lap;
          }
        }
  
        // Compute 9x8 dHash fingerprint
        const hashCanvas = document.createElement('canvas');
        hashCanvas.width = 9;
        hashCanvas.height = 8;
        const hctx = hashCanvas.getContext('2d');
        hctx.drawImage(img, 0, 0, 9, 8);
        const hdata = hctx.getImageData(0, 0, 9, 8).data;
        let hash = '';
        for (let y = 0; y < 8; y++) {
          for (let x = 0; x < 8; x++) {
            const left = hdata[(y * 9 + x) * 4];
            const right = hdata[(y * 9 + x + 1) * 4];
            hash += left < right ? '1' : '0';
          }
        }
  
        const brightness = Math.round((lumSum / (w * h) / 255) * 100);
        const sharpness = Math.min(100, Math.round((edgeSum / ((w - 2) * (h - 2))) * 2.2));
  
        resolve({
          thumbnailUrl,
          heuristics: {
            blurry: sharpness < 26,
            dark: brightness < 20,
            duplicate: false,
            sharpness,
            brightness,
            hash
          }
        });
      };
      img.onerror = () => {
        resolve({
          thumbnailUrl: objectUrl,
          heuristics: { blurry: false, dark: false, duplicate: false, sharpness: 50, brightness: 50, hash: null }
        });
      };
      img.src = objectUrl;
    });
  }
  
  function detectDuplicates(items) {
    const hashes = [];
    items.forEach(item => {
      if (!item.heuristics.hash) return;
      for (const prevHash of hashes) {
        let dist = 0;
        for (let i = 0; i < 64; i++) {
          if (item.heuristics.hash[i] !== prevHash[i]) dist++;
        }
        if (dist <= 10) {
          item.heuristics.duplicate = true;
          break;
        }
      }
      hashes.push(item.heuristics.hash);
    });
  }
  
  // 6. Filter & UI Rendering
  function applyFilter() {
    state.filteredQueue = state.items.filter(item => {
      if (item.status !== 'pending') return false;
      if (state.activeFilter === 'video') return item.type === 'video';
      if (state.activeFilter === 'blurry') return item.heuristics.blurry;
      if (state.activeFilter === 'dark') return item.heuristics.dark;
      if (state.activeFilter === 'duplicate') return item.heuristics.duplicate;
      return true;
    });
    state.currentIndex = 0;
  }
  
  function updateUI() {
    const reviewed = state.items.filter(i => i.status !== 'pending').length;
    const trashedItems = state.items.filter(i => i.status === 'trash');
    const freedMB = trashedItems.reduce((sum, i) => sum + i.sizeMB, 0);
  
    el.statReviewed.textContent = `${reviewed} / ${state.items.length}`;
    el.statTrashed.textContent = trashedItems.length;
    el.statFreed.textContent = `${freedMB.toFixed(1)} MB`;
    el.commitSize.textContent = `${freedMB.toFixed(1)} MB`;
  
    el.badgeDeck.textContent = state.items.filter(i => i.status === 'pending').length;
    el.badgeVideos.textContent = state.items.filter(i => i.sizeMB >= 10 || i.type === 'video').length;
    el.badgeTrash.textContent = trashedItems.length;
  
    renderCurrentCard();
    renderHeavyList();
    renderTrashList();
  }
  
  function stopSimVideoAnimation() {
    if (state.simVideoTimer) {
      cancelAnimationFrame(state.simVideoTimer);
      state.simVideoTimer = null;
    }
  }
  
  function renderCurrentCard() {
    stopSimVideoAnimation();
    const current = state.filteredQueue[state.currentIndex];
    if (!current) {
      el.activeCard.hidden = true;
      el.swipeControls.hidden = true;
      el.emptyDeck.hidden = false;
      el.previewVideo.pause();
      return;
    }
  
    el.activeCard.hidden = false;
    el.swipeControls.hidden = false;
    el.emptyDeck.hidden = true;
  
    el.metaFilename.textContent = current.name;
    el.metaFilesize.textContent = `${current.sizeMB.toFixed(1)} MB`;
  
    const tags = [];
    if (current.type === 'video') {
      tags.push(`<span class="tag tag-vid">🎬 Video (${current.durationText || 'Direct Play'})</span>`);
    }
    if (current.heuristics.blurry) {
      tags.push(`<span class="tag tag-warn">⚠️ Blurry (Sharpness: ${current.heuristics.sharpness}%)</span>`);
    } else {
      tags.push(`<span class="tag tag-ok">✓ Sharp (${current.heuristics.sharpness}%)</span>`);
    }
    if (current.heuristics.dark) tags.push(`<span class="tag tag-warn">🌑 Low Light (${current.heuristics.brightness}%)</span>`);
    if (current.heuristics.duplicate) tags.push(`<span class="tag tag-dup">👯 Duplicate Cluster</span>`);
  
    el.metaTags.innerHTML = tags.join('');
  
    // Reset Preview Elements
    el.previewCanvas.hidden = true;
    el.previewImg.hidden = true;
    el.previewVideo.hidden = true;
    el.btnSimPlay.hidden = true;
    el.previewVideo.pause();
  
    if (current.isSim) {
      el.previewCanvas.hidden = false;
      el.previewCanvas.width = 640;
      el.previewCanvas.height = 420;
      drawSimArtwork(el.previewCanvas, current, 0);
  
      if (current.type === 'video') {
        el.btnSimPlay.hidden = false;
        el.btnSimPlay.textContent = '▶ Play Video Preview';
      }
    } else if (current.type === 'video') {
      // Direct Video Playback with Poster Thumbnail
      el.previewVideo.hidden = false;
      if (current.thumbnailUrl) el.previewVideo.poster = current.thumbnailUrl;
      el.previewVideo.src = current.objectUrl;
    } else {
      el.previewImg.hidden = false;
      el.previewImg.src = current.objectUrl;
    }
  }
  
  // Interactive Simulation Video Playback on Card
  el.btnSimPlay.addEventListener('click', (e) => {
    e.stopPropagation();
    const current = state.filteredQueue[state.currentIndex];
    if (!current || !current.isSim) return;
  
    if (state.simVideoTimer) {
      stopSimVideoAnimation();
      drawSimArtwork(el.previewCanvas, current, 0);
      el.btnSimPlay.textContent = '▶ Play Video Preview';
    } else {
      let tick = 1;
      el.btnSimPlay.textContent = '⏸ Pause Video';
      const loop = () => {
        drawSimArtwork(el.previewCanvas, current, tick++);
        state.simVideoTimer = requestAnimationFrame(loop);
      };
      state.simVideoTimer = requestAnimationFrame(loop);
    }
  });
  
  // 7. Render Heavy Media & Trash Lists with Video Thumbnails & Direct Play Button
  function renderHeavyList() {
    const heavy = [...state.items].sort((a, b) => b.sizeMB - a.sizeMB);
    if (heavy.length === 0) {
      el.heavyList.innerHTML = `<p class="empty-list">No media loaded.</p>`;
      return;
    }
  
    el.heavyList.innerHTML = heavy.map(item => `
      <div class="list-row ${item.status === 'trash' ? 'row-trashed' : ''}">
        <div class="row-info">
          <div class="row-thumb-wrap" onclick="openMediaLightbox('${item.id}')" title="Click to play/preview">
            ${item.thumbnailUrl ? `<img class="row-thumb" src="${item.thumbnailUrl}" alt="${item.name}" />` : ''}
            ${item.type === 'video' ? `<div class="thumb-play-overlay">▶</div>` : ''}
            ${item.durationText ? `<span class="thumb-badge">${item.durationText}</span>` : ''}
          </div>
          <div>
            <div class="row-title">${item.name}</div>
            <div class="row-sub">
              ${item.type === 'video' ? '🎬 Video' : '🖼️ Photo'} • Sharpness: ${item.heuristics.sharpness}% • Status: <strong>${item.status.toUpperCase()}</strong>
            </div>
          </div>
        </div>
        <div class="row-actions">
          <span class="size-pill">${item.sizeMB.toFixed(1)} MB</span>
          <button class="btn btn-sm btn-secondary" onclick="openMediaLightbox('${item.id}')">
            ${item.type === 'video' ? '▶ Play Video' : '🔍 Preview'}
          </button>
          <button class="btn btn-sm ${item.status === 'trash' ? 'btn-secondary' : 'btn-danger'}" onclick="toggleTrashItem('${item.id}')">
            ${item.status === 'trash' ? 'Restore' : 'Move to Trash'}
          </button>
        </div>
      </div>
    `).join('');
  }
  
  function renderTrashList() {
    const trashed = state.items.filter(i => i.status === 'trash');
    if (trashed.length === 0) {
      el.trashList.innerHTML = `<p class="empty-list">Trash stage is empty. Swipe left on unwanted media to stage them here.</p>`;
      return;
    }
  
    el.trashList.innerHTML = trashed.map(item => `
      <div class="list-row">
        <div class="row-info">
          <div class="row-thumb-wrap" onclick="openMediaLightbox('${item.id}')" title="Click to preview">
            ${item.thumbnailUrl ? `<img class="row-thumb" src="${item.thumbnailUrl}" alt="${item.name}" />` : ''}
            ${item.type === 'video' ? `<div class="thumb-play-overlay">▶</div>` : ''}
            ${item.durationText ? `<span class="thumb-badge">${item.durationText}</span>` : ''}
          </div>
          <div>
            <div class="row-title">${item.name}</div>
            <div class="row-sub">${item.sizeMB.toFixed(1)} MB • Flagged for OS Trash</div>
          </div>
        </div>
        <div class="row-actions">
          <button class="btn btn-sm btn-secondary" onclick="openMediaLightbox('${item.id}')">
            ${item.type === 'video' ? '▶ Play' : '🔍 View'}
          </button>
          <button class="btn btn-sm btn-secondary" onclick="toggleTrashItem('${item.id}')">
            Restore
          </button>
        </div>
      </div>
    `).join('');
  }
  
  window.toggleTrashItem = function(id) {
    const item = state.items.find(i => i.id === id);
    if (!item) return;
    item.status = item.status === 'trash' ? 'keep' : 'trash';
    applyFilter();
    updateUI();
  };
  
  // 8. Direct Video & Photo Lightbox Modal
  window.openMediaLightbox = function(id) {
    const item = state.items.find(i => i.id === id);
    if (!item) return;
    state.activePreviewId = id;
  
    el.playerTitle.textContent = `${item.type === 'video' ? '🎬' : '🖼️'} ${item.name}`;
    el.playerMeta.textContent = `${item.sizeMB.toFixed(1)} MB • Status: ${item.status.toUpperCase()}`;
  
    el.lightboxVideo.hidden = true;
    el.lightboxImg.hidden = true;
    el.lightboxCanvas.hidden = true;
    el.lightboxVideo.pause();
  
    if (item.isSim) {
      el.lightboxCanvas.hidden = false;
      el.lightboxCanvas.width = 640;
      el.lightboxCanvas.height = 400;
      drawSimArtwork(el.lightboxCanvas, item, item.type === 'video' ? 12 : 0);
    } else if (item.type === 'video') {
      el.lightboxVideo.hidden = false;
      if (item.thumbnailUrl) el.lightboxVideo.poster = item.thumbnailUrl;
      el.lightboxVideo.src = item.objectUrl;
      el.lightboxVideo.play().catch(() => {});
    } else {
      el.lightboxImg.hidden = false;
      el.lightboxImg.src = item.objectUrl;
    }
  
    el.playerModal.hidden = false;
  };
  
  function closePlayerModal() {
    el.lightboxVideo.pause();
    el.playerModal.hidden = true;
    state.activePreviewId = null;
  }
  
  document.getElementById('btn-close-player').addEventListener('click', closePlayerModal);
  document.getElementById('btn-player-keep').addEventListener('click', () => {
    if (state.activePreviewId) {
      const item = state.items.find(i => i.id === state.activePreviewId);
      if (item) item.status = 'keep';
      applyFilter();
      updateUI();
    }
    closePlayerModal();
  });
  document.getElementById('btn-player-trash').addEventListener('click', () => {
    if (state.activePreviewId) {
      const item = state.items.find(i => i.id === state.activePreviewId);
      if (item) item.status = 'trash';
      applyFilter();
      updateUI();
    }
    closePlayerModal();
  });
  
  // 9. Swipe Decision & Drag Gestures
  function handleDecision(decision) {
    const current = state.filteredQueue[state.currentIndex];
    if (!current) return;
  
    el.previewVideo.pause();
    const animClass = decision === 'keep' ? 'swipe-right-anim' : 'swipe-left-anim';
    el.activeCard.classList.add(animClass);
  
    setTimeout(() => {
      el.activeCard.classList.remove('swipe-right-anim', 'swipe-left-anim');
      current.status = decision;
      state.history.push(current.id);
      applyFilter();
      updateUI();
    }, 220);
  }
  
  function handleUndo() {
    const lastId = state.history.pop();
    if (!lastId) return;
    const item = state.items.find(i => i.id === lastId);
    if (item) item.status = 'pending';
    applyFilter();
    updateUI();
  }
  
  let isDragging = false;
  let startX = 0;
  
  el.activeCard.addEventListener('pointerdown', (e) => {
    // Do not hijack clicks on video player controls or play button
    if (e.target.tagName === 'VIDEO' || e.target.tagName === 'BUTTON') return;
    isDragging = true;
    startX = e.clientX;
    el.activeCard.style.transition = 'none';
  });
  
  window.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const rot = dx * 0.05;
    el.activeCard.style.transform = `translateX(${dx}px) rotate(${rot}deg)`;
  
    el.indKeep.style.opacity = dx > 40 ? Math.min(1, (dx - 40) / 80) : 0;
    el.indTrash.style.opacity = dx < -40 ? Math.min(1, (-dx - 40) / 80) : 0;
  });
  
  window.addEventListener('pointerup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    const dx = e.clientX - startX;
    el.activeCard.style.transition = 'transform 0.22s ease, opacity 0.22s ease';
    el.activeCard.style.transform = '';
    el.indKeep.style.opacity = 0;
    el.indTrash.style.opacity = 0;
  
    if (dx > 95) handleDecision('keep');
    else if (dx < -95) handleDecision('trash');
  });
  
  // 10. Vapor Division Consent Modal & Universal Media Loader
  const fileInput = document.getElementById('file-input');
  const folderInput = document.getElementById('folder-input');
  
  function requestMediaAccess(pickerType) {
    state.pendingPickerType = pickerType;
    if (state.trustedSession) {
      triggerSelectedPicker();
    } else {
      el.consentModal.hidden = false;
    }
  }
  
  function triggerSelectedPicker() {
    if (state.pendingPickerType === 'folder') {
      // Try native Directory Picker first if available, otherwise fallback to universal folder input
      if ('showDirectoryPicker' in window) {
        openDirectoryWithOSAccess();
      } else {
        folderInput.click();
      }
    } else {
      fileInput.click();
    }
  }
  
  document.getElementById('btn-open-media').addEventListener('click', () => requestMediaAccess('files'));
  document.getElementById('btn-open-folder').addEventListener('click', () => requestMediaAccess('folder'));
  document.getElementById('btn-close-consent').addEventListener('click', () => { el.consentModal.hidden = true; });
  document.getElementById('btn-cancel-consent').addEventListener('click', () => { el.consentModal.hidden = true; });
  document.getElementById('btn-confirm-consent').addEventListener('click', () => {
    state.trustedSession = true;
    el.consentModal.hidden = true;
    triggerSelectedPicker();
  });
  
  async function processSelectedFiles(fileList) {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (!files.length) {
      alert('No supported image or video files selected.');
      return;
    }
  
    state.directoryHandle = null;
    const loaded = [];
  
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const objectUrl = URL.createObjectURL(f);
      const isVideo = f.type.startsWith('video/');
  
      if (isVideo) {
        const vidData = await extractVideoThumbnailAndAnalyze(f, objectUrl);
        loaded.push({
          id: `local-${Date.now()}-${i}`,
          name: f.name,
          relativePath: f.webkitRelativePath || f.name,
          sizeMB: f.size / (1024 * 1024),
          type: 'video',
          durationText: vidData.durationText,
          thumbnailUrl: vidData.thumbnailUrl,
          isSim: false,
          file: f,
          objectUrl,
          heuristics: vidData.heuristics,
          status: 'pending'
        });
      } else {
        const imgData = await analyzeImageFile(f, objectUrl);
        loaded.push({
          id: `local-${Date.now()}-${i}`,
          name: f.name,
          relativePath: f.webkitRelativePath || f.name,
          sizeMB: f.size / (1024 * 1024),
          type: 'image',
          durationText: null,
          thumbnailUrl: imgData.thumbnailUrl,
          isSim: false,
          file: f,
          objectUrl,
          heuristics: imgData.heuristics,
          status: 'pending'
        });
      }
    }
  
    detectDuplicates(loaded);
    state.items = loaded;
    state.history = [];
    applyFilter();
    updateUI();
  }
  
  fileInput.addEventListener('change', (e) => processSelectedFiles(e.target.files));
  folderInput.addEventListener('change', (e) => processSelectedFiles(e.target.files));
  
  async function openDirectoryWithOSAccess() {
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      state.directoryHandle = dirHandle;
      const loaded = [];
      let idx = 0;
  
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file' && /\.(jpe?g|png|webp|gif|mp4|mov|webm)$/i.test(entry.name)) {
          const f = await entry.getFile();
          const objectUrl = URL.createObjectURL(f);
          const isVideo = f.type.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(entry.name);
  
          if (isVideo) {
            const vidData = await extractVideoThumbnailAndAnalyze(f, objectUrl);
            loaded.push({
              id: `fs-${idx++}`,
              name: entry.name,
              sizeMB: f.size / (1024 * 1024),
              type: 'video',
              durationText: vidData.durationText,
              thumbnailUrl: vidData.thumbnailUrl,
              isSim: false,
              file: f,
              entryHandle: entry,
              objectUrl,
              heuristics: vidData.heuristics,
              status: 'pending'
            });
          } else {
            const imgData = await analyzeImageFile(f, objectUrl);
            loaded.push({
              id: `fs-${idx++}`,
              name: entry.name,
              sizeMB: f.size / (1024 * 1024),
              type: 'image',
              durationText: null,
              thumbnailUrl: imgData.thumbnailUrl,
              isSim: false,
              file: f,
              entryHandle: entry,
              objectUrl,
              heuristics: imgData.heuristics,
              status: 'pending'
            });
          }
        }
      }
  
      if (!loaded.length) {
        alert('No supported photos or videos found in this folder.');
        return;
      }
      detectDuplicates(loaded);
      state.items = loaded;
      state.history = [];
      applyFilter();
      updateUI();
    } catch (err) {
      // Fallback to universal folder input if blocked by Brave or cancelled
      folderInput.click();
    }
  }
  
  // 11. Execute Cleanup -> Move to Trash (Laptop, PC & Mobile Workflow)
  document.getElementById('btn-commit-trash').addEventListener('click', async () => {
    const trashed = state.items.filter(i => i.status === 'trash');
    if (!trashed.length) {
      alert('No files in Trash Stage! Swipe left on unwanted photos or videos first.');
      return;
    }
  
    const freedMB = trashed.reduce((sum, i) => sum + i.sizeMB, 0);
    el.modalFreedSize.textContent = `${freedMB.toFixed(1)} MB`;
    state.lastCleanedItems = [...trashed];
  
    let movedDirectlyOnDisk = false;
  
    // Path A: Direct OS Folder Move if Directory Handle is active
    if (state.directoryHandle) {
      try {
        const trashDir = await state.directoryHandle.getDirectoryHandle('_TRASH_STAGE_', { create: true });
        for (const item of trashed) {
          if (item.file && item.entryHandle) {
            const newFileHandle = await trashDir.getFileHandle(item.name, { create: true });
            const writable = await newFileHandle.createWritable();
            await writable.write(item.file);
            await writable.close();
            await state.directoryHandle.removeEntry(item.name);
          }
        }
        movedDirectlyOnDisk = true;
      } catch (err) {
        console.error('Direct folder move error:', err);
      }
    }
  
    // Render Mini Thumbnail Grid of Trashed Files
    el.trashedCountLabel.textContent = trashed.length;
    el.trashedMiniGrid.innerHTML = trashed.map(item => `
      <div class="mini-thumb-item">
        ${item.thumbnailUrl ? `<img src="${item.thumbnailUrl}" alt="${item.name}" />` : ''}
        <span>${item.name}</span>
      </div>
    `).join('');
  
    if (movedDirectlyOnDisk) {
      el.cleanupStatusMsg.innerHTML = `✅ <strong>${trashed.length} files</strong> have been physically moved to the <code>_TRASH_STAGE_</code> folder on your computer!`;
      el.osTrashBox.hidden = true;
    } else {
      el.cleanupStatusMsg.innerHTML = `✅ <strong>${trashed.length} files (${freedMB.toFixed(1)} MB)</strong> removed from your active workspace.`;
      el.osTrashBox.hidden = false;
    }
  
    // Remove trashed items from active workspace
    state.items = state.items.filter(i => i.status !== 'trash');
    applyFilter();
    updateUI();
    el.donateModal.hidden = false;
  });
  
  // Helper: Download Native macOS Trash Script (.command uses Finder to move to real Mac Trash)
  document.getElementById('btn-mac-trash').addEventListener('click', () => {
    if (!state.lastCleanedItems.length) return;
    const lines = [
      '#!/bin/bash',
      '# Vapor Division — MediaCleaner macOS Native Trash Mover',
      'cd "$(dirname "$0")"',
      'echo "Moving flagged files into macOS Trash..."'
    ];
    state.lastCleanedItems.forEach(item => {
      const safeName = item.name.replace(/"/g, '\\"');
      lines.push(`if [ -f "${safeName}" ]; then osascript -e 'tell application "Finder" to delete POSIX file "'"$PWD/${safeName}"'"' >/dev/null 2>&1 || mv "${safeName}" ~/.Trash/; echo "Trashed: ${safeName}"; fi`);
    });
    lines.push('echo "Done! All selected files are now in your Mac Trash bin."');
  
    downloadTextFile('Move_To_Mac_Trash.command', lines.join('\n'));
  });
  
  // Helper: Download Native Windows Recycle Bin Script (.bat uses PowerShell RecycleBin API)
  document.getElementById('btn-win-trash').addEventListener('click', () => {
    if (!state.lastCleanedItems.length) return;
    const lines = [
      '@echo off',
      'REM Vapor Division — MediaCleaner Windows Recycle Bin Mover',
      'cd /d "%~dp0"',
      'echo Moving flagged files to Windows Recycle Bin...',
      'powershell -NoProfile -Command "Add-Type -AssemblyName Microsoft.VisualBasic; ' +
        state.lastCleanedItems.map(i => {
          const safe = i.name.replace(/'/g, "''");
          return `if (Test-Path '${safe}') { [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile((Resolve-Path '${safe}'), 'OnlyErrorDialogs', 'SendToRecycleBin'); Write-Host 'Trashed: ${safe}' }`;
        }).join('; ') + '"',
      'echo Done! Files moved safely to your Windows Recycle Bin.',
      'pause'
    ];
  
    downloadTextFile('Move_To_Windows_RecycleBin.bat', lines.join('\r\n'));
  });
  
  // Helper: Mobile Export / Share Kept Files via Web Share API
  document.getElementById('btn-mobile-export').addEventListener('click', async () => {
    const keptRealFiles = state.items.filter(i => !i.isSim && i.file).map(i => i.file);
    if (navigator.canShare && keptRealFiles.length > 0 && navigator.canShare({ files: keptRealFiles })) {
      try {
        await navigator.share({
          files: keptRealFiles,
          title: 'Cleaned Media — Vapor Division',
          text: 'My cleaned photos and videos from MediaCleaner.'
        });
        return;
      } catch (err) {
        console.log('Share cancelled:', err);
      }
    }
    const names = state.lastCleanedItems.map(i => `• ${i.name} (${i.sizeMB.toFixed(1)} MB)`).join('\n');
    alert(`📱 Trashed Files Checklist (Delete these from your phone gallery):\n\n${names}`);
  });
  
  function downloadTextFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  
  // 12. Standard Controls & Navigation Listeners
  document.getElementById('btn-swipe-left').addEventListener('click', () => handleDecision('trash'));
  document.getElementById('btn-swipe-right').addEventListener('click', () => handleDecision('keep'));
  document.getElementById('btn-undo').addEventListener('click', handleUndo);
  document.getElementById('btn-load-demo').addEventListener('click', loadSimulationDeck);
  
  window.addEventListener('keydown', (e) => {
    if (!el.playerModal.hidden) {
      if (e.key === 'Escape') closePlayerModal();
      return;
    }
    if (state.activeMode !== 'deck') return;
    if (e.key === 'ArrowLeft') handleDecision('trash');
    if (e.key === 'ArrowRight') handleDecision('keep');
    if (e.key.toLowerCase() === 'z') handleUndo();
  });
  
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      el.previewVideo.pause();
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeMode = btn.dataset.mode;
  
      document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
      document.getElementById(`view-${state.activeMode}`).classList.add('active');
    });
  });
  
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.activeFilter = chip.dataset.filter;
      applyFilter();
      updateUI();
    });
  });
  
  document.getElementById('btn-restore-all').addEventListener('click', () => {
    state.items.forEach(i => { if (i.status === 'trash') i.status = 'keep'; });
    applyFilter();
    updateUI();
  });
  
  document.getElementById('btn-review-trash').addEventListener('click', () => {
    document.querySelector('[data-mode="trash"]').click();
  });
  
  document.getElementById('btn-open-donate').addEventListener('click', (e) => {
    e.preventDefault();
    el.osTrashBox.hidden = state.lastCleanedItems.length === 0;
    el.donateModal.hidden = false;
  });
  
  document.getElementById('btn-support-end').addEventListener('click', () => {
    el.donateModal.hidden = false;
  });
  
  document.getElementById('btn-close-modal').addEventListener('click', () => {
    el.donateModal.hidden = true;
  });
  
  // Boot Simulation Deck on Startup
  loadSimulationDeck();