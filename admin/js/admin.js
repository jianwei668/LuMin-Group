/* ============================================================
   LuMin Group Admin Panel — Main Script
   ============================================================ */

;(function () {
  'use strict';

  // ========== Auth Check ==========
  var token = localStorage.getItem('admin-token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  var currentSection = 'hero';

  // ========== Helpers ==========
  function authHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    };
  }

  function showToast(msg, type) {
    var t = document.createElement('div');
    t.className = 'toast toast-' + (type || 'success');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function() { t.remove(); }, 3000);
  }

  async function apiGet(name) {
    var res = await fetch('/api/data/' + name);
    if (res.status === 401) { logout(); return null; }
    return res.json();
  }

  async function apiSave(name, data) {
    var res = await fetch('/api/data/' + name, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    if (res.status === 401) { logout(); return null; }
    var result = await res.json();
    if (res.ok) {
      showToast('保存成功！');
    } else {
      showToast(result.error || '保存失败', 'error');
    }
    return result;
  }

  async function apiUpload(file) {
    var fd = new FormData();
    fd.append('image', file);
    var res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token },
      body: fd
    });
    if (res.status === 401) { logout(); return null; }
    return res.json();
  }

  function logout() {
    localStorage.removeItem('admin-token');
    localStorage.removeItem('admin-user');
    window.location.href = 'login.html';
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function nextId(arr) {
    if (!arr || arr.length === 0) return 1;
    return Math.max.apply(null, arr.map(function(it) { return it.id || 0; })) + 1;
  }

  // ========== Sidebar Navigation ==========
  var sidebarNav = document.querySelectorAll('.nav-item');
  var pageTitle = document.getElementById('pageTitle');
  var content = document.getElementById('adminContent');

  sidebarNav.forEach(function(item) {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      sidebarNav.forEach(function(n) { n.classList.remove('active'); });
      item.classList.add('active');
      currentSection = item.dataset.section;
      pageTitle.textContent = item.textContent.trim();
      loadSection(currentSection);
      // Close mobile sidebar
      document.getElementById('sidebar').classList.remove('open');
    });
  });

  // Mobile menu
  document.getElementById('menuBtn').addEventListener('click', function() {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', function() {
    logout();
  });

  // Show username
  document.getElementById('adminUser').textContent = localStorage.getItem('admin-user') || 'admin';

  // ========== Section Loader ==========
  async function loadSection(section) {
    content.innerHTML = '<div class="loading"><i class="ph ph-spinner"></i> 加载中...</div>';

    switch (section) {
      case 'hero': await renderHero(); break;
      case 'research': await renderResearch(); break;
      case 'publications': await renderPublications(); break;
      case 'news': await renderNews(); break;
      case 'members': await renderMembers(); break;
      case 'about': await renderAbout(); break;
      case 'contact': await renderContact(); break;
      case 'site': await renderSite(); break;
      case 'images': await renderImages(); break;
      case 'password': renderPassword(); break;
    }
  }

  // ========== Helper: Image Upload Field ==========
  function imageField(label, currentVal, onUpload) {
    var id = 'img_' + Math.random().toString(36).substr(2, 9);
    var html = '<div class="form-group">';
    html += '<label>' + escapeHtml(label) + '</label>';
    if (currentVal) {
      html += '<div style="margin-bottom:8px;"><img src="/' + escapeHtml(currentVal) + '" class="img-preview-lg" onerror="this.style.display=\'none\'"></div>';
    }
    html += '<input type="file" id="' + id + '" accept="image/*" style="font-size:0.85rem;">';
    html += '<input type="text" id="' + id + '_path" value="' + escapeHtml(currentVal || '') + '" placeholder="图片路径（上传后自动填充）" style="margin-top:6px;">';
    html += '</div>';
    return { html: html, id: id };
  }

  function bindImageUpload(fieldId, callback) {
    var fileInput = document.getElementById(fieldId);
    var pathInput = document.getElementById(fieldId + '_path');
    if (!fileInput) return;
    fileInput.addEventListener('change', async function() {
      if (!fileInput.files[0]) return;
      var result = await apiUpload(fileInput.files[0]);
      if (result && result.path) {
        pathInput.value = result.path;
        showToast('图片上传成功');
        if (callback) callback(result.path);
      }
    });
  }

  // ========== HERO Section ==========
  async function renderHero() {
    var data = await apiGet('hero');
    if (!data) return;
    var slides = data.slides || [];

    var html = '<div class="action-bar"><h3 style="margin:0;">轮播幻灯片管理</h3>';
    html += '<button class="btn btn-primary" id="addSlide"><i class="ph ph-plus"></i> 添加幻灯片</button></div>';

    slides.forEach(function(slide, i) {
      html += '<div class="admin-card">';
      html += '<h3><i class="ph ph-slideshow"></i> 幻灯片 ' + (i + 1) + '</h3>';
      html += '<div class="form-row">';
      html += '<div class="form-group"><label>标题（中文）</label><input type="text" data-field="titleZh" data-idx="' + i + '" value="' + escapeHtml(slide.titleZh) + '"></div>';
      html += '<div class="form-group"><label>标题（英文）</label><input type="text" data-field="titleEn" data-idx="' + i + '" value="' + escapeHtml(slide.titleEn) + '"></div>';
      html += '</div>';
      html += '<div class="form-row">';
      html += '<div class="form-group"><label>副标题（中文）</label><input type="text" data-field="subtitleZh" data-idx="' + i + '" value="' + escapeHtml(slide.subtitleZh) + '"></div>';
      html += '<div class="form-group"><label>副标题（英文）</label><input type="text" data-field="subtitleEn" data-idx="' + i + '" value="' + escapeHtml(slide.subtitleEn) + '"></div>';
      html += '</div>';
      html += '<div class="form-row">';
      html += '<div class="form-group"><label>描述（中文）</label><textarea data-field="descZh" data-idx="' + i + '">' + escapeHtml(slide.descZh) + '</textarea></div>';
      html += '<div class="form-group"><label>描述（英文）</label><textarea data-field="descEn" data-idx="' + i + '">' + escapeHtml(slide.descEn) + '</textarea></div>';
      html += '</div>';
      html += '<div class="form-row">';
      html += '<div class="form-group"><label>按钮文字（中文）</label><input type="text" data-field="btnTextZh" data-idx="' + i + '" value="' + escapeHtml(slide.btnTextZh) + '"></div>';
      html += '<div class="form-group"><label>按钮文字（英文）</label><input type="text" data-field="btnTextEn" data-idx="' + i + '" value="' + escapeHtml(slide.btnTextEn) + '"></div>';
      html += '</div>';
      html += '<div class="form-row">';
      html += '<div class="form-group"><label>按钮链接</label><input type="text" data-field="btnLink" data-idx="' + i + '" value="' + escapeHtml(slide.btnLink) + '"></div>';
      html += '<div class="form-group"><label>按钮图标</label><input type="text" data-field="btnIcon" data-idx="' + i + '" value="' + escapeHtml(slide.btnIcon) + '"></div>';
      html += '</div>';
      var bgImgF = imageField('背景图片', slide.bgImage);
      html += '<div data-slide-img="' + i + '">' + bgImgF.html + '</div>';
      html += '<button class="btn btn-danger btn-sm" onclick="window._deleteSlide(' + i + ')"><i class="ph ph-trash"></i> 删除此幻灯片</button>';
      html += '</div>';
    });

    html += '<button class="btn btn-success" id="saveHero"><i class="ph ph-floppy-disk"></i> 保存所有更改</button>';
    content.innerHTML = html;

    document.getElementById('addSlide').addEventListener('click', function() {
      slides.push({
        id: nextId(slides),
        bgImage: '',
        titleZh: '', titleEn: '', subtitleZh: '', subtitleEn: '',
        descZh: '', descEn: '', btnTextZh: '', btnTextEn: '',
        btnLink: '', btnIcon: 'ph-arrow-right'
      });
      data.slides = slides;
      renderHero();
    });

    window._deleteSlide = function(idx) {
      if (confirm('确定删除此幻灯片？')) {
        slides.splice(idx, 1);
        data.slides = slides;
        renderHero();
      }
    };

    document.getElementById('saveHero').addEventListener('click', function() {
      content.querySelectorAll('[data-field][data-idx]').forEach(function(el) {
        var idx = parseInt(el.dataset.idx);
        var field = el.dataset.field;
        slides[idx][field] = el.value;
      });
      content.querySelectorAll('[data-slide-img]').forEach(function(wrap) {
        var idx = parseInt(wrap.dataset.slideImg);
        var pathInput = wrap.querySelector('input[id$="_path"]');
        if (pathInput) slides[idx].bgImage = pathInput.value;
      });
      data.slides = slides;
      apiSave('hero', data);
    });
  }

  // ========== RESEARCH Section ==========
  async function renderResearch() {
    var data = await apiGet('research');
    if (!data) return;

    var html = '<div class="admin-card">';
    html += '<h3><i class="ph ph-text-t"></i> 首页板块标题</h3>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>板块标题（中文）</label><input type="text" id="resSectionTitleZh" value="' + escapeHtml(data.sectionTitleZh) + '"></div>';
    html += '<div class="form-group"><label>板块标题（英文）</label><input type="text" id="resSectionTitleEn" value="' + escapeHtml(data.sectionTitleEn) + '"></div>';
    html += '</div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>板块副标题（中文）</label><input type="text" id="resSectionSubZh" value="' + escapeHtml(data.sectionSubtitleZh) + '"></div>';
    html += '<div class="form-group"><label>板块副标题（英文）</label><input type="text" id="resSectionSubEn" value="' + escapeHtml(data.sectionSubtitleEn) + '"></div>';
    html += '</div>';
    html += '</div>';

    html += '<div class="admin-card">';
    html += '<h3><i class="ph ph-flask"></i> 研究概述</h3>';
    html += '<div class="form-group"><label>概述（中文）</label><textarea id="resOverviewZh" rows="3">' + escapeHtml(data.overviewZh) + '</textarea></div>';
    html += '<div class="form-group"><label>概述（英文）</label><textarea id="resOverviewEn" rows="3">' + escapeHtml(data.overviewEn) + '</textarea></div>';
    var imgF = imageField('概述配图', data.overviewImage);
    html += imgF.html;
    html += '</div>';

    html += '<div class="action-bar"><h3 style="margin:0;">研究方向</h3>';
    html += '<button class="btn btn-primary" id="addDirection"><i class="ph ph-plus"></i> 添加方向</button></div>';

    var dirs = data.directions || [];
    dirs.forEach(function(dir, i) {
      html += '<div class="admin-card">';
      html += '<h3><i class="ph ' + escapeHtml(dir.icon || 'ph-atom') + '"></i> 方向 ' + (i + 1) + '</h3>';
      html += '<div class="form-row">';
      html += '<div class="form-group"><label>标题（中文）</label><input type="text" data-field="titleZh" data-idx="' + i + '" value="' + escapeHtml(dir.titleZh) + '"></div>';
      html += '<div class="form-group"><label>标题（英文）</label><input type="text" data-field="titleEn" data-idx="' + i + '" value="' + escapeHtml(dir.titleEn) + '"></div>';
      html += '</div>';
      html += '<div class="form-row">';
      html += '<div class="form-group"><label>简介（中文）</label><textarea data-field="descZh" data-idx="' + i + '">' + escapeHtml(dir.descZh) + '</textarea></div>';
      html += '<div class="form-group"><label>简介（英文）</label><textarea data-field="descEn" data-idx="' + i + '">' + escapeHtml(dir.descEn) + '</textarea></div>';
      html += '</div>';
      html += '<div class="form-row">';
      html += '<div class="form-group"><label>详细描述（中文）</label><textarea data-field="detailDescZh" data-idx="' + i + '" rows="3">' + escapeHtml(dir.detailDescZh) + '</textarea></div>';
      html += '<div class="form-group"><label>详细描述（英文）</label><textarea data-field="detailDescEn" data-idx="' + i + '" rows="3">' + escapeHtml(dir.detailDescEn) + '</textarea></div>';
      html += '</div>';
      html += '<div class="form-row">';
      html += '<div class="form-group"><label>图标 class</label><input type="text" data-field="icon" data-idx="' + i + '" value="' + escapeHtml(dir.icon) + '"></div>';
      html += '<div class="form-group"><label>颜色</label><input type="text" data-field="color" data-idx="' + i + '" value="' + escapeHtml(dir.color) + '"></div>';
      html += '</div>';
      var dirImgF = imageField('方向配图', dir.image, null);
      html += '<div data-img-idx="' + i + '">' + dirImgF.html + '</div>';
      html += '<button class="btn btn-danger btn-sm" onclick="window._deleteDir(' + i + ')"><i class="ph ph-trash"></i> 删除</button>';
      html += '</div>';
    });

    html += '<button class="btn btn-success" id="saveResearch"><i class="ph ph-floppy-disk"></i> 保存所有更改</button>';
    content.innerHTML = html;

    bindImageUpload(imgF.id);

    document.getElementById('addDirection').addEventListener('click', function() {
      dirs.push({
        id: nextId(dirs), titleZh: '', titleEn: '', descZh: '', descEn: '',
        detailDescZh: '', detailDescEn: '', icon: 'ph-atom', color: 'var(--accent)',
        accentStart: 'rgba(10,61,143,0.88)', accentEnd: 'rgba(37,99,176,0.92)', image: ''
      });
      data.directions = dirs;
      renderResearch();
    });

    window._deleteDir = function(idx) {
      if (confirm('确定删除此方向？')) {
        dirs.splice(idx, 1);
        data.directions = dirs;
        renderResearch();
      }
    };

    document.getElementById('saveResearch').addEventListener('click', function() {
      data.sectionTitleZh = document.getElementById('resSectionTitleZh').value;
      data.sectionTitleEn = document.getElementById('resSectionTitleEn').value;
      data.sectionSubtitleZh = document.getElementById('resSectionSubZh').value;
      data.sectionSubtitleEn = document.getElementById('resSectionSubEn').value;
      data.overviewZh = document.getElementById('resOverviewZh').value;
      data.overviewEn = document.getElementById('resOverviewEn').value;
      var overviewPathEl = document.getElementById(imgF.id + '_path');
      if (overviewPathEl) data.overviewImage = overviewPathEl.value;

      content.querySelectorAll('[data-field][data-idx]').forEach(function(el) {
        var idx = parseInt(el.dataset.idx);
        var field = el.dataset.field;
        dirs[idx][field] = el.value;
      });
      // Get direction images
      content.querySelectorAll('[data-img-idx]').forEach(function(wrap) {
        var idx = parseInt(wrap.dataset.imgIdx);
        var pathInput = wrap.querySelector('input[id$="_path"]');
        if (pathInput) dirs[idx].image = pathInput.value;
      });
      data.directions = dirs;
      apiSave('research', data);
    });
  }

  // ========== PUBLICATIONS Section ==========
  async function renderPublications() {
    var data = await apiGet('publications');
    if (!data) return;
    var pubs = data.publications || [];

    var html = '<div class="admin-card">';
    html += '<h3><i class="ph ph-text-t"></i> 页面横幅 & 首页板块标题</h3>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>横幅标题（中文）</label><input type="text" id="pubBannerTitleZh" value="' + escapeHtml(data.bannerTitleZh || '') + '"></div>';
    html += '<div class="form-group"><label>横幅标题（英文）</label><input type="text" id="pubBannerTitleEn" value="' + escapeHtml(data.bannerTitleEn || '') + '"></div>';
    html += '</div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>横幅副标题（中文）</label><input type="text" id="pubBannerSubZh" value="' + escapeHtml(data.bannerSubtitleZh || '') + '"></div>';
    html += '<div class="form-group"><label>横幅副标题（英文）</label><input type="text" id="pubBannerSubEn" value="' + escapeHtml(data.bannerSubtitleEn || '') + '"></div>';
    html += '</div>';
    html += '<div class="form-group"><label>横幅图标 class</label><input type="text" id="pubBannerIcon" value="' + escapeHtml(data.bannerIcon || '') + '"></div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>首页板块标题（中文）</label><input type="text" id="pubSectionTitleZh" value="' + escapeHtml(data.sectionTitleZh || '') + '"></div>';
    html += '<div class="form-group"><label>首页板块标题（英文）</label><input type="text" id="pubSectionTitleEn" value="' + escapeHtml(data.sectionTitleEn || '') + '"></div>';
    html += '</div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>首页板块副标题（中文）</label><input type="text" id="pubSectionSubZh" value="' + escapeHtml(data.sectionSubtitleZh || '') + '"></div>';
    html += '<div class="form-group"><label>首页板块副标题（英文）</label><input type="text" id="pubSectionSubEn" value="' + escapeHtml(data.sectionSubtitleEn || '') + '"></div>';
    html += '</div>';
    html += '</div>';

    html += '<div class="action-bar"><h3 style="margin:0;">论文列表（共 ' + pubs.length + ' 篇）</h3>';
    html += '<button class="btn btn-primary" id="addPub"><i class="ph ph-plus"></i> 添加论文</button></div>';

    html += '<div class="admin-card"><table class="data-table"><thead><tr>';
    html += '<th>年份</th><th>标题</th><th>期刊</th><th>操作</th>';
    html += '</tr></thead><tbody>';

    pubs.forEach(function(pub, i) {
      html += '<tr>';
      html += '<td>' + pub.year + '</td>';
      html += '<td>' + escapeHtml(pub.title).substring(0, 50) + '...</td>';
      html += '<td>' + escapeHtml(pub.journal) + '</td>';
      html += '<td class="actions">';
      html += '<button class="btn btn-outline btn-sm" onclick="window._editPub(' + i + ')"><i class="ph ph-pencil"></i></button>';
      html += '<button class="btn btn-danger btn-sm" onclick="window._deletePub(' + i + ')"><i class="ph ph-trash"></i></button>';
      html += '</td></tr>';
    });

    html += '</tbody></table></div>';
    html += '<div id="pubEditArea"></div>';
    html += '<button class="btn btn-success" id="savePubSettings" style="margin-top:16px;"><i class="ph ph-floppy-disk"></i> 保存页面设置</button>';
    content.innerHTML = html;

    document.getElementById('savePubSettings').addEventListener('click', function() {
      data.bannerTitleZh = document.getElementById('pubBannerTitleZh').value;
      data.bannerTitleEn = document.getElementById('pubBannerTitleEn').value;
      data.bannerSubtitleZh = document.getElementById('pubBannerSubZh').value;
      data.bannerSubtitleEn = document.getElementById('pubBannerSubEn').value;
      data.bannerIcon = document.getElementById('pubBannerIcon').value;
      data.sectionTitleZh = document.getElementById('pubSectionTitleZh').value;
      data.sectionTitleEn = document.getElementById('pubSectionTitleEn').value;
      data.sectionSubtitleZh = document.getElementById('pubSectionSubZh').value;
      data.sectionSubtitleEn = document.getElementById('pubSectionSubEn').value;
      apiSave('publications', data);
    });

    document.getElementById('addPub').addEventListener('click', function() {
      pubs.unshift({
        id: nextId(pubs), title: '', authors: '', corresponding: 'LuMin*',
        journal: '', year: new Date().getFullYear(), volume: '', pages: '',
        doi: '#', coverImage: '', tocImage: ''
      });
      data.publications = pubs;
      renderPublications();
      window._editPub(0);
    });

    window._deletePub = function(idx) {
      if (confirm('确定删除此论文？')) {
        pubs.splice(idx, 1);
        data.publications = pubs;
        apiSave('publications', data).then(function() { renderPublications(); });
      }
    };

    window._editPub = function(idx) {
      var pub = pubs[idx];
      var area = document.getElementById('pubEditArea');
      var html = '<div class="admin-card">';
      html += '<h3><i class="ph ph-pencil"></i> 编辑论文</h3>';
      html += '<div class="form-group"><label>论文标题</label><input type="text" id="pubTitle" value="' + escapeHtml(pub.title) + '"></div>';
      html += '<div class="form-row">';
      html += '<div class="form-group"><label>作者（不含通讯）</label><input type="text" id="pubAuthors" value="' + escapeHtml(pub.authors) + '"></div>';
      html += '<div class="form-group"><label>通讯作者</label><input type="text" id="pubCorr" value="' + escapeHtml(pub.corresponding) + '"></div>';
      html += '</div>';
      html += '<div class="form-row">';
      html += '<div class="form-group"><label>期刊名</label><input type="text" id="pubJournal" value="' + escapeHtml(pub.journal) + '"></div>';
      html += '<div class="form-group"><label>年份</label><input type="number" id="pubYear" value="' + pub.year + '"></div>';
      html += '</div>';
      html += '<div class="form-row">';
      html += '<div class="form-group"><label>卷号</label><input type="text" id="pubVolume" value="' + escapeHtml(pub.volume) + '"></div>';
      html += '<div class="form-group"><label>页码</label><input type="text" id="pubPages" value="' + escapeHtml(pub.pages) + '"></div>';
      html += '</div>';
      html += '<div class="form-group"><label>DOI链接</label><input type="text" id="pubDoi" value="' + escapeHtml(pub.doi) + '"></div>';

      var tocF = imageField('TOC 图片', pub.tocImage);
      var coverF = imageField('封面图片', pub.coverImage);
      html += tocF.html + coverF.html;

      html += '<div style="display:flex;gap:10px;margin-top:16px;">';
      html += '<button class="btn btn-success" id="savePubEdit"><i class="ph ph-floppy-disk"></i> 保存论文</button>';
      html += '<button class="btn btn-outline" id="cancelPubEdit"><i class="ph ph-x"></i> 取消</button>';
      html += '</div></div>';

      area.innerHTML = html;
      area.scrollIntoView({ behavior: 'smooth' });

      bindImageUpload(tocF.id);
      bindImageUpload(coverF.id);

      document.getElementById('savePubEdit').addEventListener('click', function() {
        pubs[idx] = Object.assign({}, pubs[idx], {
          title: document.getElementById('pubTitle').value,
          authors: document.getElementById('pubAuthors').value,
          corresponding: document.getElementById('pubCorr').value,
          journal: document.getElementById('pubJournal').value,
          year: parseInt(document.getElementById('pubYear').value) || pub.year,
          volume: document.getElementById('pubVolume').value,
          pages: document.getElementById('pubPages').value,
          doi: document.getElementById('pubDoi').value,
          tocImage: document.getElementById(tocF.id + '_path').value,
          coverImage: document.getElementById(coverF.id + '_path').value
        });
        data.publications = pubs;
        apiSave('publications', data).then(function() { renderPublications(); });
      });

      document.getElementById('cancelPubEdit').addEventListener('click', function() {
        area.innerHTML = '';
      });
    };
  }

  // ========== NEWS Section ==========
  async function renderNews() {
    var data = await apiGet('news');
    if (!data) return;
    var news = data.news || [];

    var html = '<div class="admin-card">';
    html += '<h3><i class="ph ph-text-t"></i> 页面横幅 & 首页板块标题</h3>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>横幅标题（中文）</label><input type="text" id="newsBannerTitleZh" value="' + escapeHtml(data.bannerTitleZh || '') + '"></div>';
    html += '<div class="form-group"><label>横幅标题（英文）</label><input type="text" id="newsBannerTitleEn" value="' + escapeHtml(data.bannerTitleEn || '') + '"></div>';
    html += '</div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>横幅副标题（中文）</label><input type="text" id="newsBannerSubZh" value="' + escapeHtml(data.bannerSubtitleZh || '') + '"></div>';
    html += '<div class="form-group"><label>横幅副标题（英文）</label><input type="text" id="newsBannerSubEn" value="' + escapeHtml(data.bannerSubtitleEn || '') + '"></div>';
    html += '</div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>横幅图标 class</label><input type="text" id="newsBannerIcon" value="' + escapeHtml(data.bannerIcon || '') + '"></div>';
    html += '<div class="form-group"><label>首页板块标题（中文）</label><input type="text" id="newsSectionTitleZh" value="' + escapeHtml(data.sectionTitleZh || '') + '"></div>';
    html += '</div>';
    html += '<div class="form-group"><label>首页板块标题（英文）</label><input type="text" id="newsSectionTitleEn" value="' + escapeHtml(data.sectionTitleEn || '') + '"></div>';
    html += '</div>';

    html += '<div class="action-bar"><h3 style="margin:0;">新闻列表（共 ' + news.length + ' 条）</h3>';
    html += '<button class="btn btn-primary" id="addNews"><i class="ph ph-plus"></i> 添加新闻</button></div>';

    news.forEach(function(item, i) {
      html += '<div class="admin-card">';
      html += '<h3><i class="ph ph-newspaper"></i> ' + escapeHtml(item.titleZh || '新闻 ' + (i+1)) + '</h3>';
      html += '<div class="form-row">';
      html += '<div class="form-group"><label>标题（中文）</label><input type="text" data-field="titleZh" data-idx="' + i + '" value="' + escapeHtml(item.titleZh) + '"></div>';
      html += '<div class="form-group"><label>标题（英文）</label><input type="text" data-field="titleEn" data-idx="' + i + '" value="' + escapeHtml(item.titleEn) + '"></div>';
      html += '</div>';
      html += '<div class="form-row">';
      html += '<div class="form-group"><label>日期</label><input type="date" data-field="date" data-idx="' + i + '" value="' + escapeHtml(item.date) + '"></div>';
      html += '<div class="form-group"><label>链接</label><input type="text" data-field="link" data-idx="' + i + '" value="' + escapeHtml(item.link) + '"></div>';
      html += '</div>';
      html += '<div class="form-row">';
      html += '<div class="form-group"><label>摘要（中文）</label><textarea data-field="excerptZh" data-idx="' + i + '">' + escapeHtml(item.excerptZh) + '</textarea></div>';
      html += '<div class="form-group"><label>摘要（英文）</label><textarea data-field="excerptEn" data-idx="' + i + '">' + escapeHtml(item.excerptEn) + '</textarea></div>';
      html += '</div>';
      var newsImgF = imageField('新闻图片', item.image);
      html += '<div data-img-idx="' + i + '">' + newsImgF.html + '</div>';
      html += '<button class="btn btn-danger btn-sm" onclick="window._deleteNews(' + i + ')"><i class="ph ph-trash"></i> 删除</button>';
      html += '</div>';
    });

    html += '<button class="btn btn-success" id="saveNews"><i class="ph ph-floppy-disk"></i> 保存所有更改</button>';
    content.innerHTML = html;

    document.getElementById('addNews').addEventListener('click', function() {
      news.unshift({
        id: nextId(news), titleZh: '', titleEn: '',
        date: new Date().toISOString().split('T')[0],
        excerptZh: '', excerptEn: '', image: '', link: '#'
      });
      data.news = news;
      renderNews();
    });

    window._deleteNews = function(idx) {
      if (confirm('确定删除此新闻？')) {
        news.splice(idx, 1);
        data.news = news;
        renderNews();
      }
    };

    document.getElementById('saveNews').addEventListener('click', function() {
      data.bannerTitleZh = document.getElementById('newsBannerTitleZh').value;
      data.bannerTitleEn = document.getElementById('newsBannerTitleEn').value;
      data.bannerSubtitleZh = document.getElementById('newsBannerSubZh').value;
      data.bannerSubtitleEn = document.getElementById('newsBannerSubEn').value;
      data.bannerIcon = document.getElementById('newsBannerIcon').value;
      data.sectionTitleZh = document.getElementById('newsSectionTitleZh').value;
      data.sectionTitleEn = document.getElementById('newsSectionTitleEn').value;
      content.querySelectorAll('[data-field][data-idx]').forEach(function(el) {
        var idx = parseInt(el.dataset.idx);
        var field = el.dataset.field;
        news[idx][field] = el.value;
      });
      content.querySelectorAll('[data-img-idx]').forEach(function(wrap) {
        var idx = parseInt(wrap.dataset.imgIdx);
        var pathInput = wrap.querySelector('input[id$="_path"]');
        if (pathInput) news[idx].image = pathInput.value;
      });
      data.news = news;
      apiSave('news', data);
    });
  }

  // ========== MEMBERS Section ==========
  async function renderMembers() {
    var data = await apiGet('members');
    if (!data) return;
    var members = data.members || [];
    var alumni = data.alumni || [];
    var categories = data.categories || [];

    // Group photo
    var gpF = imageField('团队合照', data.groupPhoto);
    var html = '<div class="admin-card">';
    html += '<h3><i class="ph ph-text-t"></i> 页面板块标题</h3>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>在组成员标题（中文）</label><input type="text" id="memCurTitleZh" value="' + escapeHtml(data.currentMembersTitleZh || '') + '"></div>';
    html += '<div class="form-group"><label>在组成员标题（英文）</label><input type="text" id="memCurTitleEn" value="' + escapeHtml(data.currentMembersTitleEn || '') + '"></div>';
    html += '</div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>毕业校友标题（中文）</label><input type="text" id="memAlumTitleZh" value="' + escapeHtml(data.alumniTitleZh || '') + '"></div>';
    html += '<div class="form-group"><label>毕业校友标题（英文）</label><input type="text" id="memAlumTitleEn" value="' + escapeHtml(data.alumniTitleEn || '') + '"></div>';
    html += '</div>';
    html += '</div>';

    html += '<div class="admin-card">';
    html += '<h3><i class="ph ph-camera"></i> 团队合照</h3>';
    html += gpF.html;
    html += '</div>';

    // Members
    html += '<div class="action-bar"><h3 style="margin:0;">在组成员（共 ' + members.length + ' 人）</h3>';
    html += '<button class="btn btn-primary" id="addMember"><i class="ph ph-plus"></i> 添加成员</button></div>';

    members.forEach(function(m, i) {
      html += '<div class="admin-card">';
      html += '<h3><i class="ph ph-user"></i> ' + escapeHtml(m.name) + '</h3>';
      html += '<div class="form-row">';
      html += '<div class="form-group"><label>姓名</label><input type="text" data-field="name" data-idx="' + i + '" value="' + escapeHtml(m.name) + '"></div>';
      html += '<div class="form-group"><label>缩写</label><input type="text" data-field="initials" data-idx="' + i + '" value="' + escapeHtml(m.initials) + '"></div>';
      html += '</div>';
      html += '<div class="form-row">';
      html += '<div class="form-group"><label>角色</label><input type="text" data-field="role" data-idx="' + i + '" value="' + escapeHtml(m.role) + '"></div>';
      html += '<div class="form-group"><label>分类</label><select data-field="category" data-idx="' + i + '">';
      categories.forEach(function(cat) {
        html += '<option value="' + cat.id + '"' + (m.category === cat.id ? ' selected' : '') + '>' + escapeHtml(cat.nameZh) + '</option>';
      });
      html += '</select></div>';
      html += '</div>';
      var mImgF = imageField('头像', m.avatar);
      html += '<div data-member-img="' + i + '">' + mImgF.html + '</div>';
      html += '<button class="btn btn-danger btn-sm" onclick="window._deleteMember(' + i + ')"><i class="ph ph-trash"></i> 删除</button>';
      html += '</div>';
    });

    // Alumni
    html += '<div class="action-bar"><h3 style="margin:0;">毕业校友（共 ' + alumni.length + ' 人）</h3>';
    html += '<button class="btn btn-primary" id="addAlumni"><i class="ph ph-plus"></i> 添加校友</button></div>';

    alumni.forEach(function(a, i) {
      html += '<div class="admin-card">';
      html += '<div class="form-row">';
      html += '<div class="form-group"><label>姓名</label><input type="text" data-alumni-field="name" data-alumni-idx="' + i + '" value="' + escapeHtml(a.name) + '"></div>';
      html += '<div class="form-group"><label>缩写</label><input type="text" data-alumni-field="initials" data-alumni-idx="' + i + '" value="' + escapeHtml(a.initials) + '"></div>';
      html += '</div>';
      html += '<div class="form-group"><label>毕业去向</label><input type="text" data-alumni-field="destination" data-alumni-idx="' + i + '" value="' + escapeHtml(a.destination) + '"></div>';
      html += '<button class="btn btn-danger btn-sm" onclick="window._deleteAlumni(' + i + ')"><i class="ph ph-trash"></i> 删除</button>';
      html += '</div>';
    });

    html += '<button class="btn btn-success" id="saveMembers"><i class="ph ph-floppy-disk"></i> 保存所有更改</button>';
    content.innerHTML = html;

    bindImageUpload(gpF.id);

    document.getElementById('addMember').addEventListener('click', function() {
      members.push({ id: nextId(members), name: '', initials: '', role: '', category: 'master', avatar: '' });
      data.members = members;
      renderMembers();
    });

    document.getElementById('addAlumni').addEventListener('click', function() {
      alumni.push({ id: nextId(alumni), name: '', initials: '', destination: '' });
      data.alumni = alumni;
      renderMembers();
    });

    window._deleteMember = function(idx) {
      if (confirm('确定删除？')) { members.splice(idx, 1); data.members = members; renderMembers(); }
    };

    window._deleteAlumni = function(idx) {
      if (confirm('确定删除？')) { alumni.splice(idx, 1); data.alumni = alumni; renderMembers(); }
    };

    document.getElementById('saveMembers').addEventListener('click', function() {
      var gpPath = document.getElementById(gpF.id + '_path');
      if (gpPath) data.groupPhoto = gpPath.value;
      data.currentMembersTitleZh = document.getElementById('memCurTitleZh').value;
      data.currentMembersTitleEn = document.getElementById('memCurTitleEn').value;
      data.alumniTitleZh = document.getElementById('memAlumTitleZh').value;
      data.alumniTitleEn = document.getElementById('memAlumTitleEn').value;

      content.querySelectorAll('[data-field][data-idx]').forEach(function(el) {
        var idx = parseInt(el.dataset.idx);
        members[idx][el.dataset.field] = el.value;
      });

      content.querySelectorAll('[data-member-img]').forEach(function(wrap) {
        var idx = parseInt(wrap.dataset.memberImg);
        var pi = wrap.querySelector('input[id$="_path"]');
        if (pi) members[idx].avatar = pi.value;
      });

      content.querySelectorAll('[data-alumni-field][data-alumni-idx]').forEach(function(el) {
        var idx = parseInt(el.dataset.alumniIdx);
        alumni[idx][el.dataset.alumniField] = el.value;
      });

      data.members = members;
      data.alumni = alumni;
      apiSave('members', data);
    });
  }

  // ========== ABOUT Section ==========
  async function renderAbout() {
    var data = await apiGet('about');
    if (!data) return;

    var html = '<div class="admin-card">';
    html += '<h3><i class="ph ph-text-t"></i> 页面横幅</h3>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>横幅标题（中文）</label><input type="text" id="aboutBannerTitleZh" value="' + escapeHtml(data.bannerTitleZh || '') + '"></div>';
    html += '<div class="form-group"><label>横幅标题（英文）</label><input type="text" id="aboutBannerTitleEn" value="' + escapeHtml(data.bannerTitleEn || '') + '"></div>';
    html += '</div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>横幅副标题（中文）</label><input type="text" id="aboutBannerSubZh" value="' + escapeHtml(data.bannerSubtitleZh || '') + '"></div>';
    html += '<div class="form-group"><label>横幅副标题（英文）</label><input type="text" id="aboutBannerSubEn" value="' + escapeHtml(data.bannerSubtitleEn || '') + '"></div>';
    html += '</div>';
    html += '<div class="form-group"><label>横幅图标 class</label><input type="text" id="aboutBannerIcon" value="' + escapeHtml(data.bannerIcon || '') + '"></div>';
    html += '</div>';

    html += '<div class="admin-card">';
    html += '<h3><i class="ph ph-user-circle"></i> 基本信息</h3>';
    html += '<div class="form-group"><label>姓名</label><input type="text" id="aboutName" value="' + escapeHtml(data.name) + '"></div>';
    html += '<div class="form-group"><label>头衔</label><input type="text" id="aboutTitle" value="' + escapeHtml(data.title) + '"></div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>院校（中文）</label><input type="text" id="aboutAffZh" value="' + escapeHtml(data.affiliationZh) + '"></div>';
    html += '<div class="form-group"><label>院校（英文）</label><input type="text" id="aboutAffEn" value="' + escapeHtml(data.affiliationEn) + '"></div>';
    html += '</div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>学院（中文）</label><input type="text" id="aboutColZh" value="' + escapeHtml(data.collegeZh) + '"></div>';
    html += '<div class="form-group"><label>学院（英文）</label><input type="text" id="aboutColEn" value="' + escapeHtml(data.collegeEn) + '"></div>';
    html += '</div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>邮箱</label><input type="email" id="aboutEmail" value="' + escapeHtml(data.email) + '"></div>';
    html += '<div class="form-group"><label>电话</label><input type="text" id="aboutPhone" value="' + escapeHtml(data.phone) + '"></div>';
    html += '</div>';
    html += '<div class="form-group"><label>办公室</label><input type="text" id="aboutOffice" value="' + escapeHtml(data.office) + '"></div>';
    var photoF = imageField('个人照片', data.photo);
    html += photoF.html;
    html += '</div>';

    // Education
    html += '<div class="admin-card">';
    html += '<h3><i class="ph ph-graduation-cap"></i> 教育经历 <button class="btn btn-outline btn-sm" id="addEdu" style="margin-left:auto;"><i class="ph ph-plus"></i></button></h3>';
    (data.education || []).forEach(function(edu, i) {
      html += '<div class="form-row" style="margin-bottom:12px;border-bottom:1px solid #eee;padding-bottom:12px;">';
      html += '<div class="form-group"><label>年份</label><input type="text" data-edu="years" data-eidx="' + i + '" value="' + escapeHtml(edu.years) + '"></div>';
      html += '<div class="form-group"><label>描述（中文）</label><textarea data-edu="descZh" data-eidx="' + i + '">' + escapeHtml(edu.descZh) + '</textarea></div>';
      html += '</div>';
    });
    html += '</div>';

    // Experience
    html += '<div class="admin-card">';
    html += '<h3><i class="ph ph-briefcase"></i> 工作经历 <button class="btn btn-outline btn-sm" id="addExp" style="margin-left:auto;"><i class="ph ph-plus"></i></button></h3>';
    (data.experience || []).forEach(function(exp, i) {
      html += '<div class="form-row" style="margin-bottom:12px;border-bottom:1px solid #eee;padding-bottom:12px;">';
      html += '<div class="form-group"><label>年份</label><input type="text" data-exp="years" data-xidx="' + i + '" value="' + escapeHtml(exp.years) + '"></div>';
      html += '<div class="form-group"><label>描述（中文）</label><textarea data-exp="descZh" data-xidx="' + i + '">' + escapeHtml(exp.descZh) + '</textarea></div>';
      html += '</div>';
    });
    html += '</div>';

    // Awards
    html += '<div class="admin-card">';
    html += '<h3><i class="ph ph-trophy"></i> 获奖情况 <button class="btn btn-outline btn-sm" id="addAward" style="margin-left:auto;"><i class="ph ph-plus"></i></button></h3>';
    (data.awards || []).forEach(function(aw, i) {
      html += '<div class="form-row" style="margin-bottom:8px;">';
      html += '<div class="form-group"><label>年份</label><input type="text" data-aw="year" data-aidx="' + i + '" value="' + escapeHtml(aw.year) + '"></div>';
      html += '<div class="form-group"><label>奖项（中文）</label><input type="text" data-aw="titleZh" data-aidx="' + i + '" value="' + escapeHtml(aw.titleZh) + '"></div>';
      html += '</div>';
    });
    html += '</div>';

    // Research Interests
    html += '<div class="admin-card">';
    html += '<h3><i class="ph ph-magnifying-glass"></i> 研究兴趣 <button class="btn btn-outline btn-sm" id="addRI" style="margin-left:auto;"><i class="ph ph-plus"></i></button></h3>';
    (data.researchInterests || []).forEach(function(ri, i) {
      html += '<div class="form-row" style="margin-bottom:8px;">';
      html += '<div class="form-group"><label>中文</label><input type="text" data-ri="zh" data-ridx="' + i + '" value="' + escapeHtml(ri.zh) + '"></div>';
      html += '<div class="form-group"><label>英文</label><input type="text" data-ri="en" data-ridx="' + i + '" value="' + escapeHtml(ri.en) + '"></div>';
      html += '</div>';
    });
    html += '</div>';

    // Academic Services
    html += '<div class="admin-card">';
    html += '<h3><i class="ph ph-users"></i> 学术服务 <button class="btn btn-outline btn-sm" id="addAS" style="margin-left:auto;"><i class="ph ph-plus"></i></button></h3>';
    (data.academicServices || []).forEach(function(as, i) {
      html += '<div class="form-row" style="margin-bottom:8px;">';
      html += '<div class="form-group"><label>中文</label><input type="text" data-as="zh" data-asidx="' + i + '" value="' + escapeHtml(as.zh) + '"></div>';
      html += '<div class="form-group"><label>英文</label><input type="text" data-as="en" data-asidx="' + i + '" value="' + escapeHtml(as.en) + '"></div>';
      html += '</div>';
    });
    html += '</div>';

    html += '<button class="btn btn-success" id="saveAbout"><i class="ph ph-floppy-disk"></i> 保存所有更改</button>';
    content.innerHTML = html;

    bindImageUpload(photoF.id);

    // Add buttons
    document.getElementById('addEdu').addEventListener('click', function() {
      data.education = data.education || [];
      data.education.push({ id: nextId(data.education), years: '', descZh: '', descEn: '' });
      renderAbout();
    });
    document.getElementById('addExp').addEventListener('click', function() {
      data.experience = data.experience || [];
      data.experience.push({ id: nextId(data.experience), years: '', descZh: '', descEn: '' });
      renderAbout();
    });
    document.getElementById('addAward').addEventListener('click', function() {
      data.awards = data.awards || [];
      data.awards.push({ id: nextId(data.awards), year: '', titleZh: '', titleEn: '' });
      renderAbout();
    });
    document.getElementById('addRI').addEventListener('click', function() {
      data.researchInterests = data.researchInterests || [];
      data.researchInterests.push({ id: nextId(data.researchInterests), zh: '', en: '' });
      renderAbout();
    });
    document.getElementById('addAS').addEventListener('click', function() {
      data.academicServices = data.academicServices || [];
      data.academicServices.push({ id: nextId(data.academicServices), zh: '', en: '' });
      renderAbout();
    });

    // Save
    document.getElementById('saveAbout').addEventListener('click', function() {
      data.bannerTitleZh = document.getElementById('aboutBannerTitleZh').value;
      data.bannerTitleEn = document.getElementById('aboutBannerTitleEn').value;
      data.bannerSubtitleZh = document.getElementById('aboutBannerSubZh').value;
      data.bannerSubtitleEn = document.getElementById('aboutBannerSubEn').value;
      data.bannerIcon = document.getElementById('aboutBannerIcon').value;
      data.name = document.getElementById('aboutName').value;
      data.title = document.getElementById('aboutTitle').value;
      data.affiliationZh = document.getElementById('aboutAffZh').value;
      data.affiliationEn = document.getElementById('aboutAffEn').value;
      data.collegeZh = document.getElementById('aboutColZh').value;
      data.collegeEn = document.getElementById('aboutColEn').value;
      data.email = document.getElementById('aboutEmail').value;
      data.phone = document.getElementById('aboutPhone').value;
      data.office = document.getElementById('aboutOffice').value;
      var pp = document.getElementById(photoF.id + '_path');
      if (pp) data.photo = pp.value;

      content.querySelectorAll('[data-edu][data-eidx]').forEach(function(el) {
        var idx = parseInt(el.dataset.eidx);
        data.education[idx][el.dataset.edu] = el.value;
      });
      content.querySelectorAll('[data-exp][data-xidx]').forEach(function(el) {
        var idx = parseInt(el.dataset.xidx);
        data.experience[idx][el.dataset.exp] = el.value;
      });
      content.querySelectorAll('[data-aw][data-aidx]').forEach(function(el) {
        var idx = parseInt(el.dataset.aidx);
        data.awards[idx][el.dataset.aw] = el.value;
      });
      content.querySelectorAll('[data-ri][data-ridx]').forEach(function(el) {
        var idx = parseInt(el.dataset.ridx);
        data.researchInterests[idx][el.dataset.ri] = el.value;
      });
      content.querySelectorAll('[data-as][data-asidx]').forEach(function(el) {
        var idx = parseInt(el.dataset.asidx);
        data.academicServices[idx][el.dataset.as] = el.value;
      });

      apiSave('about', data);
    });
  }

  // ========== CONTACT Section ==========
  async function renderContact() {
    var data = await apiGet('contact');
    if (!data) return;

    var html = '<div class="admin-card">';
    html += '<h3><i class="ph ph-text-t"></i> 页面横幅 & 首页板块标题</h3>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>横幅标题（中文）</label><input type="text" id="ctBannerTitleZh" value="' + escapeHtml(data.bannerTitleZh || '') + '"></div>';
    html += '<div class="form-group"><label>横幅标题（英文）</label><input type="text" id="ctBannerTitleEn" value="' + escapeHtml(data.bannerTitleEn || '') + '"></div>';
    html += '</div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>横幅副标题（中文）</label><input type="text" id="ctBannerSubZh" value="' + escapeHtml(data.bannerSubtitleZh || '') + '"></div>';
    html += '<div class="form-group"><label>横幅副标题（英文）</label><input type="text" id="ctBannerSubEn" value="' + escapeHtml(data.bannerSubtitleEn || '') + '"></div>';
    html += '</div>';
    html += '<div class="form-group"><label>横幅图标 class</label><input type="text" id="ctBannerIcon" value="' + escapeHtml(data.bannerIcon || '') + '"></div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>招贤纳士板块标题（中文）</label><input type="text" id="ctPosTitleZh" value="' + escapeHtml(data.posSectionTitleZh || '') + '"></div>';
    html += '<div class="form-group"><label>招贤纳士板块标题（英文）</label><input type="text" id="ctPosTitleEn" value="' + escapeHtml(data.posSectionTitleEn || '') + '"></div>';
    html += '</div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>招贤纳士板块副标题（中文）</label><input type="text" id="ctPosSubZh" value="' + escapeHtml(data.posSectionSubtitleZh || '') + '"></div>';
    html += '<div class="form-group"><label>招贤纳士板块副标题（英文）</label><input type="text" id="ctPosSubEn" value="' + escapeHtml(data.posSectionSubtitleEn || '') + '"></div>';
    html += '</div>';
    html += '</div>';

    html += '<div class="admin-card">';
    html += '<h3><i class="ph ph-phone"></i> 联系信息</h3>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>邮箱</label><input type="email" id="ctEmail" value="' + escapeHtml(data.email) + '"></div>';
    html += '<div class="form-group"><label>电话</label><input type="text" id="ctPhone" value="' + escapeHtml(data.phone) + '"></div>';
    html += '</div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>地址（中文）</label><input type="text" id="ctAddrZh" value="' + escapeHtml(data.addressZh) + '"></div>';
    html += '<div class="form-group"><label>地址（英文）</label><input type="text" id="ctAddrEn" value="' + escapeHtml(data.addressEn) + '"></div>';
    html += '</div>';
    html += '<div class="form-group"><label>办公室</label><input type="text" id="ctOffice" value="' + escapeHtml(data.office) + '"></div>';
    html += '<div class="form-group"><label>地图嵌入URL</label><input type="text" id="ctMap" value="' + escapeHtml(data.mapUrl) + '"></div>';
    html += '</div>';

    // Join Us text
    html += '<div class="admin-card">';
    html += '<h3><i class="ph ph-hand-waving"></i> 招生信息</h3>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>招生语（中文）</label><textarea id="ctJoinZh">' + escapeHtml(data.joinUsZh) + '</textarea></div>';
    html += '<div class="form-group"><label>招生语（英文）</label><textarea id="ctJoinEn">' + escapeHtml(data.joinUsEn) + '</textarea></div>';
    html += '</div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>详细说明（中文）</label><textarea id="ctJoinDetailZh">' + escapeHtml(data.joinUsDetailZh) + '</textarea></div>';
    html += '<div class="form-group"><label>详细说明（英文）</label><textarea id="ctJoinDetailEn">' + escapeHtml(data.joinUsDetailEn) + '</textarea></div>';
    html += '</div>';
    html += '</div>';

    // Positions
    html += '<div class="action-bar"><h3 style="margin:0;">招聘岗位</h3>';
    html += '<button class="btn btn-primary" id="addPosition"><i class="ph ph-plus"></i> 添加岗位</button></div>';

    var positions = data.positions || [];
    positions.forEach(function(pos, i) {
      html += '<div class="admin-card">';
      html += '<div class="form-row">';
      html += '<div class="form-group"><label>岗位名（中文）</label><input type="text" data-pos="titleZh" data-pidx="' + i + '" value="' + escapeHtml(pos.titleZh) + '"></div>';
      html += '<div class="form-group"><label>岗位名（英文）</label><input type="text" data-pos="titleEn" data-pidx="' + i + '" value="' + escapeHtml(pos.titleEn) + '"></div>';
      html += '</div>';
      html += '<div class="form-row">';
      html += '<div class="form-group"><label>描述（中文）</label><textarea data-pos="descZh" data-pidx="' + i + '">' + escapeHtml(pos.descZh) + '</textarea></div>';
      html += '<div class="form-group"><label>描述（英文）</label><textarea data-pos="descEn" data-pidx="' + i + '">' + escapeHtml(pos.descEn) + '</textarea></div>';
      html += '</div>';
      html += '<div class="form-group"><label>图标 class</label><input type="text" data-pos="icon" data-pidx="' + i + '" value="' + escapeHtml(pos.icon) + '"></div>';
      html += '<button class="btn btn-danger btn-sm" onclick="window._deletePos(' + i + ')"><i class="ph ph-trash"></i> 删除</button>';
      html += '</div>';
    });

    html += '<button class="btn btn-success" id="saveContact"><i class="ph ph-floppy-disk"></i> 保存所有更改</button>';
    content.innerHTML = html;

    document.getElementById('addPosition').addEventListener('click', function() {
      positions.push({ id: nextId(positions), titleZh: '', titleEn: '', descZh: '', descEn: '', icon: 'ph-fill ph-briefcase' });
      data.positions = positions;
      renderContact();
    });

    window._deletePos = function(idx) {
      if (confirm('确定删除？')) { positions.splice(idx, 1); data.positions = positions; renderContact(); }
    };

    document.getElementById('saveContact').addEventListener('click', function() {
      data.bannerTitleZh = document.getElementById('ctBannerTitleZh').value;
      data.bannerTitleEn = document.getElementById('ctBannerTitleEn').value;
      data.bannerSubtitleZh = document.getElementById('ctBannerSubZh').value;
      data.bannerSubtitleEn = document.getElementById('ctBannerSubEn').value;
      data.bannerIcon = document.getElementById('ctBannerIcon').value;
      data.posSectionTitleZh = document.getElementById('ctPosTitleZh').value;
      data.posSectionTitleEn = document.getElementById('ctPosTitleEn').value;
      data.posSectionSubtitleZh = document.getElementById('ctPosSubZh').value;
      data.posSectionSubtitleEn = document.getElementById('ctPosSubEn').value;
      data.email = document.getElementById('ctEmail').value;
      data.phone = document.getElementById('ctPhone').value;
      data.addressZh = document.getElementById('ctAddrZh').value;
      data.addressEn = document.getElementById('ctAddrEn').value;
      data.office = document.getElementById('ctOffice').value;
      data.mapUrl = document.getElementById('ctMap').value;
      data.joinUsZh = document.getElementById('ctJoinZh').value;
      data.joinUsEn = document.getElementById('ctJoinEn').value;
      data.joinUsDetailZh = document.getElementById('ctJoinDetailZh').value;
      data.joinUsDetailEn = document.getElementById('ctJoinDetailEn').value;

      content.querySelectorAll('[data-pos][data-pidx]').forEach(function(el) {
        var idx = parseInt(el.dataset.pidx);
        positions[idx][el.dataset.pos] = el.value;
      });
      data.positions = positions;
      apiSave('contact', data);
    });
  }

  // ========== SITE Section ==========
  async function renderSite() {
    var data = await apiGet('site');
    if (!data) return;

    var html = '<div class="admin-card">';
    html += '<h3><i class="ph ph-globe"></i> 网站全局设置</h3>';
    html += '<div class="form-group"><label>课题组名称</label><input type="text" id="siteName" value="' + escapeHtml(data.groupName) + '"></div>';
    html += '<div class="form-row">';
    html += '<div class="form-group"><label>页脚描述（中文）</label><textarea id="siteFootZh">' + escapeHtml(data.footerDescZh) + '</textarea></div>';
    html += '<div class="form-group"><label>页脚描述（英文）</label><textarea id="siteFootEn">' + escapeHtml(data.footerDescEn) + '</textarea></div>';
    html += '</div>';
    html += '<div class="form-group"><label>版权信息</label><input type="text" id="siteCopy" value="' + escapeHtml(data.copyright) + '"></div>';
    var logoF = imageField('Logo', data.logo);
    html += logoF.html;
    html += '</div>';

    // Nav items
    var navItems = data.navItems || [];
    html += '<div class="admin-card">';
    html += '<h3><i class="ph ph-list"></i> 导航菜单项</h3>';
    html += '<p style="color:var(--admin-muted);font-size:0.85rem;margin-bottom:12px;">修改导航栏和页脚快速链接的显示文字</p>';
    navItems.forEach(function(item, i) {
      html += '<div class="form-row" style="margin-bottom:8px;border-bottom:1px solid #eee;padding-bottom:8px;">';
      html += '<div class="form-group"><label>链接 (' + escapeHtml(item.href) + ')</label><input type="text" data-nav="href" data-nidx="' + i + '" value="' + escapeHtml(item.href) + '"></div>';
      html += '<div class="form-group"><label>中文</label><input type="text" data-nav="zh" data-nidx="' + i + '" value="' + escapeHtml(item.zh) + '"></div>';
      html += '<div class="form-group"><label>英文</label><input type="text" data-nav="en" data-nidx="' + i + '" value="' + escapeHtml(item.en) + '"></div>';
      html += '</div>';
    });
    html += '</div>';

    html += '<button class="btn btn-success" id="saveSite"><i class="ph ph-floppy-disk"></i> 保存更改</button>';
    content.innerHTML = html;

    bindImageUpload(logoF.id);

    document.getElementById('saveSite').addEventListener('click', function() {
      data.groupName = document.getElementById('siteName').value;
      data.footerDescZh = document.getElementById('siteFootZh').value;
      data.footerDescEn = document.getElementById('siteFootEn').value;
      data.copyright = document.getElementById('siteCopy').value;
      var lp = document.getElementById(logoF.id + '_path');
      if (lp) data.logo = lp.value;
      // Save nav items
      content.querySelectorAll('[data-nav][data-nidx]').forEach(function(el) {
        var idx = parseInt(el.dataset.nidx);
        if (!data.navItems[idx]) return;
        data.navItems[idx][el.dataset.nav] = el.value;
      });
      apiSave('site', data);
    });
  }

  // ========== IMAGES Section ==========
  async function renderImages() {
    var html = '<div class="admin-card">';
    html += '<h3><i class="ph ph-upload"></i> 上传图片</h3>';
    html += '<div class="img-upload-area" id="uploadArea">';
    html += '<i class="ph ph-cloud-arrow-up"></i>';
    html += '<p>点击选择图片上传（最大 5MB）</p>';
    html += '<input type="file" id="imgFileInput" accept="image/*" style="display:none;">';
    html += '</div></div>';

    html += '<div class="admin-card">';
    html += '<h3><i class="ph ph-images"></i> 已上传图片</h3>';
    html += '<div class="images-grid" id="imagesGrid"><div class="loading"><i class="ph ph-spinner"></i> 加载中...</div></div>';
    html += '</div>';

    content.innerHTML = html;

    // Upload area click
    document.getElementById('uploadArea').addEventListener('click', function() {
      document.getElementById('imgFileInput').click();
    });

    document.getElementById('imgFileInput').addEventListener('change', async function() {
      if (!this.files[0]) return;
      var result = await apiUpload(this.files[0]);
      if (result && result.path) {
        showToast('上传成功：' + result.filename);
        loadImagesList();
      } else {
        showToast((result && result.error) || '上传失败', 'error');
      }
      this.value = '';
    });

    loadImagesList();
  }

  async function loadImagesList() {
    var res = await fetch('/api/images', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.status === 401) { logout(); return; }
    var images = await res.json();
    var grid = document.getElementById('imagesGrid');
    if (!grid) return;

    if (images.length === 0) {
      grid.innerHTML = '<p style="color:var(--admin-muted);padding:20px;">暂无图片</p>';
      return;
    }

    var html = '';
    images.forEach(function(img) {
      html += '<div class="image-card">';
      html += '<img src="/' + escapeHtml(img.path) + '" alt="' + escapeHtml(img.name) + '" loading="lazy">';
      html += '<div class="image-card-info">' + escapeHtml(img.name) + '<br>' + (img.size / 1024).toFixed(1) + ' KB</div>';
      html += '<div class="image-card-actions">';
      html += '<button class="btn btn-outline btn-sm" onclick="navigator.clipboard.writeText(\'' + escapeHtml(img.path) + '\');window._toast(\'路径已复制\')"><i class="ph ph-copy"></i></button>';
      html += '<button class="btn btn-danger btn-sm" onclick="window._deleteImage(\'' + escapeHtml(img.name) + '\')"><i class="ph ph-trash"></i></button>';
      html += '</div></div>';
    });
    grid.innerHTML = html;
  }

  window._toast = function(msg) { showToast(msg); };

  window._deleteImage = async function(name) {
    if (!confirm('确定删除 ' + name + '？')) return;
    var res = await fetch('/api/images/' + encodeURIComponent(name), {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.ok) {
      showToast('已删除');
      loadImagesList();
    } else {
      showToast('删除失败', 'error');
    }
  };

  // ========== PASSWORD Section ==========
  function renderPassword() {
    var html = '<div class="admin-card" style="max-width:500px;">';
    html += '<h3><i class="ph ph-lock"></i> 修改登录密码</h3>';
    html += '<div class="form-group"><label>旧密码</label><input type="password" id="oldPwd"></div>';
    html += '<div class="form-group"><label>新密码（至少6位）</label><input type="password" id="newPwd"></div>';
    html += '<div class="form-group"><label>确认新密码</label><input type="password" id="confirmPwd"></div>';
    html += '<div id="pwdMsg"></div>';
    html += '<button class="btn btn-success" id="savePwd"><i class="ph ph-floppy-disk"></i> 修改密码</button>';
    html += '</div>';
    content.innerHTML = html;

    document.getElementById('savePwd').addEventListener('click', async function() {
      var msgEl = document.getElementById('pwdMsg');
      var oldPwd = document.getElementById('oldPwd').value;
      var newPwd = document.getElementById('newPwd').value;
      var confirmPwd = document.getElementById('confirmPwd').value;

      if (!oldPwd || !newPwd) {
        msgEl.innerHTML = '<div class="error-msg">请填写所有字段</div>';
        return;
      }
      if (newPwd !== confirmPwd) {
        msgEl.innerHTML = '<div class="error-msg">两次输入的新密码不一致</div>';
        return;
      }
      if (newPwd.length < 6) {
        msgEl.innerHTML = '<div class="error-msg">新密码至少 6 个字符</div>';
        return;
      }

      var res = await fetch('/api/change-password', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd })
      });
      var result = await res.json();
      if (res.ok) {
        msgEl.innerHTML = '<div class="success-msg">密码修改成功！请重新登录。</div>';
        setTimeout(logout, 2000);
      } else {
        msgEl.innerHTML = '<div class="error-msg">' + escapeHtml(result.error || '修改失败') + '</div>';
      }
    });
  }

  // ========== Initial Load ==========
  loadSection('hero');

})();
