/* ============================================================
   LuMin Group — Data Loader
   Loads JSON data and renders dynamic content on the front-end
   ============================================================ */

;(function () {
  'use strict';

  var BASE = '';

  function fetchData(name) {
    return fetch(BASE + '/data/' + name + '.json')
      .then(function(res) { return res.json(); })
      .catch(function() { return null; });
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function getLang() {
    try { return localStorage.getItem('lumin-lang') || 'en'; } catch(e) { return 'en'; }
  }

  function t(zh, en) {
    return getLang() === 'zh-CN' ? (zh || en || '') : (en || zh || '');
  }

  function imgOrPlaceholder(src, height, iconClass) {
    if (src) {
      return '<img src="' + escapeHtml(src) + '" alt="" style="width:100%;height:' + height + ';object-fit:cover;border-radius:var(--radius-lg,8px);" loading="lazy">';
    }
    return '<div class="img-placeholder" style="height:' + height + ';background:var(--primary-100);border-radius:var(--radius-lg,8px);display:flex;align-items:center;justify-content:center;">'
      + '<i class="ph ' + (iconClass || 'ph-image') + '" style="font-size:2.5rem;color:var(--text-muted);"></i></div>';
  }

  // Detect current page
  var page = location.pathname.split('/').pop().replace('.html', '') || 'index';

  // ========== Load Site + Contact for Footer, Logo & Nav ==========
  function loadFooter() {
    // Load site settings (logo, footer desc, copyright, nav)
    fetchData('site').then(function(siteData) {
      if (!siteData) return;
      // Update logo text
      document.querySelectorAll('.logo-text').forEach(function(el) {
        el.textContent = siteData.groupName || 'LuMin Group';
      });
      // Update logo image
      if (siteData.logo) {
        document.querySelectorAll('.logo-img').forEach(function(el) {
          el.src = siteData.logo;
        });
      }
      // Update nav items
      if (siteData.navItems) {
        var nav = document.getElementById('mainNav');
        if (nav) {
          var currentPage = location.pathname.split('/').pop() || 'index.html';
          var navHtml = '';
          siteData.navItems.forEach(function(item) {
            var isActive = currentPage === item.href || (currentPage === '' && item.href === 'index.html');
            navHtml += '<a href="' + escapeHtml(item.href) + '"' + (isActive ? ' class="active"' : '') + '>';
            navHtml += '<span class="i18n" data-zh="' + escapeHtml(item.zh) + '" data-en="' + escapeHtml(item.en) + '">' + escapeHtml(t(item.zh, item.en)) + '</span></a>';
          });
          nav.innerHTML = navHtml;
        }
      }
      // Update footer group name & description
      document.querySelectorAll('.footer').forEach(function(footer) {
        var h4 = footer.querySelector('.footer-content > div:first-child > h4');
        if (h4) {
          h4.textContent = siteData.groupName || 'LuMin Group';
        }
        // Footer description
        var descSpan = footer.querySelector('.footer-content > div:first-child > p:first-of-type .i18n');
        if (descSpan) {
          descSpan.setAttribute('data-zh', siteData.footerDescZh || '');
          descSpan.setAttribute('data-en', siteData.footerDescEn || '');
          descSpan.textContent = t(siteData.footerDescZh, siteData.footerDescEn);
        }
        // Footer quick links
        if (siteData.navItems) {
          var linkSections = footer.querySelectorAll('.footer-links');
          if (linkSections.length >= 2) {
            var half = Math.ceil(siteData.navItems.length / 2);
            var first = siteData.navItems.slice(0, half);
            var second = siteData.navItems.slice(half);
            var linkHtml1 = '';
            first.forEach(function(item) {
              linkHtml1 += '<a href="' + escapeHtml(item.href) + '"><i class="ph ph-caret-right"></i> <span class="i18n" data-zh="' + escapeHtml(item.zh) + '" data-en="' + escapeHtml(item.en) + '">' + escapeHtml(t(item.zh, item.en)) + '</span></a>';
            });
            linkSections[0].innerHTML = linkHtml1;
            var linkHtml2 = '';
            second.forEach(function(item) {
              linkHtml2 += '<a href="' + escapeHtml(item.href) + '"><i class="ph ph-caret-right"></i> <span class="i18n" data-zh="' + escapeHtml(item.zh) + '" data-en="' + escapeHtml(item.en) + '">' + escapeHtml(t(item.zh, item.en)) + '</span></a>';
            });
            linkSections[1].innerHTML = linkHtml2;
          }
        }
        // Copyright
        var copyright = footer.querySelector('.footer-bottom p');
        if (copyright) {
          copyright.innerHTML = escapeHtml(siteData.copyright || '© 2026 LuMin Group. All Rights Reserved.');
        }
      });
    });

    // Load contact info for footer
    fetchData('contact').then(function(data) {
      if (!data) return;
      document.querySelectorAll('.footer').forEach(function(footer) {
        var addrEl = footer.querySelector('.i18n[data-en*="Address"]');
        if (addrEl) {
          addrEl.setAttribute('data-zh', '地址：' + (data.addressZh || ''));
          addrEl.setAttribute('data-en', 'Address: ' + (data.addressEn || ''));
          addrEl.textContent = t('地址：' + data.addressZh, 'Address: ' + data.addressEn);
        }
        var emailEl = footer.querySelector('.i18n[data-en*="Email"]');
        if (emailEl) {
          emailEl.setAttribute('data-zh', '邮箱：' + data.email);
          emailEl.setAttribute('data-en', 'Email: ' + data.email);
          emailEl.textContent = t('邮箱：' + data.email, 'Email: ' + data.email);
        }
        var phoneEl = footer.querySelector('.i18n[data-en*="Phone"]');
        if (phoneEl) {
          phoneEl.setAttribute('data-zh', '电话：' + data.phone);
          phoneEl.setAttribute('data-en', 'Phone: ' + data.phone);
          phoneEl.textContent = t('电话：' + data.phone, 'Phone: ' + data.phone);
        }
      });
    });
  }

  // ========== INDEX PAGE ==========
  function loadIndex() {
    // Load hero
    fetchData('hero').then(function(data) {
      if (!data || !data.slides) return;
      var slider = document.getElementById('heroSlider');
      var dotsWrap = document.getElementById('heroDots');
      if (!slider || !dotsWrap) return;

      var slidesHtml = '';
      var dotsHtml = '';
      data.slides.forEach(function(slide, i) {
        var bgStyle = slide.bgImage ? ' style="background-image:url(\'' + escapeHtml(slide.bgImage) + '\')"' : '';
        var bgClass = slide.bgImage ? ' has-bg' : '';
        slidesHtml += '<div class="hero-slide' + (i === 0 ? ' active' : '') + bgClass + '"' + bgStyle + '>';
        slidesHtml += '<div class="hero-content">';
        slidesHtml += '<h1><span class="i18n" data-zh="' + escapeHtml(slide.titleZh) + '" data-en="' + escapeHtml(slide.titleEn) + '">' + escapeHtml(t(slide.titleZh, slide.titleEn)) + '</span><br>';
        slidesHtml += '<span class="i18n" data-zh="' + escapeHtml(slide.subtitleZh) + '" data-en="' + escapeHtml(slide.subtitleEn) + '">' + escapeHtml(t(slide.subtitleZh, slide.subtitleEn)) + '</span></h1>';
        slidesHtml += '<p><span class="i18n" data-zh="' + escapeHtml(slide.descZh) + '" data-en="' + escapeHtml(slide.descEn) + '">' + escapeHtml(t(slide.descZh, slide.descEn)) + '</span></p>';
        slidesHtml += '<a href="' + escapeHtml(slide.btnLink) + '" class="btn btn-outline"><i class="ph ' + escapeHtml(slide.btnIcon) + '"></i> ';
        slidesHtml += '<span class="i18n" data-zh="' + escapeHtml(slide.btnTextZh) + '" data-en="' + escapeHtml(slide.btnTextEn) + '">' + escapeHtml(t(slide.btnTextZh, slide.btnTextEn)) + '</span></a>';
        slidesHtml += '</div></div>';
        dotsHtml += '<span class="dot' + (i === 0 ? ' active' : '') + '" data-index="' + i + '"></span>';
      });
      slider.innerHTML = slidesHtml;
      dotsWrap.innerHTML = dotsHtml;

      // Re-init slider
      initHeroSlider();
    });

    // Load news for home + section title
    fetchData('news').then(function(data) {
      if (!data || !data.news) return;
      // News duo header
      var duoLeft = document.querySelector('.home-duo-left .duo-header h2 .i18n');
      if (duoLeft) {
        duoLeft.setAttribute('data-zh', data.sectionTitleZh || '');
        duoLeft.setAttribute('data-en', data.sectionTitleEn || '');
        duoLeft.textContent = t(data.sectionTitleZh, data.sectionTitleEn);
      }
      var newsHomeList = document.querySelector('.news-home-list');
      var newsFeatured = document.querySelector('.news-home-featured');
      if (!newsHomeList) return;

      // Featured image
      if (newsFeatured && data.news[0]) {
        var firstNews = data.news[0];
        newsFeatured.innerHTML = imgOrPlaceholder(firstNews.image, '220px');
      }

      // News items
      var html = '';
      data.news.slice(0, 5).forEach(function(item, i) {
        var d = new Date(item.date);
        var day = String(d.getDate()).padStart(2, '0');
        var ym = d.getFullYear() + '年' + (d.getMonth() + 1) + '月';
        html += '<div class="news-home-item animate-in' + (i > 0 ? ' delay-' + i : '') + '">';
        html += '<div class="news-home-date"><span class="day">' + day + '</span><span class="ym">' + ym + '</span></div>';
        html += '<div class="news-home-title">' + escapeHtml(t(item.titleZh, item.titleEn)) + '</div>';
        html += '</div>';
      });
      newsHomeList.innerHTML = html;
    });

    // Load publications preview + section titles
    fetchData('publications').then(function(data) {
      if (!data || !data.publications) return;
      // Publications section title on homepage
      var pubST = document.getElementById('pubSectionTitle');
      if (pubST) {
        var h2 = pubST.querySelector('h2 .i18n');
        if (h2) { h2.setAttribute('data-zh', data.sectionTitleZh || ''); h2.setAttribute('data-en', data.sectionTitleEn || ''); h2.textContent = t(data.sectionTitleZh, data.sectionTitleEn); }
        var p = pubST.querySelector('p .i18n');
        if (p) { p.setAttribute('data-zh', data.sectionSubtitleZh || ''); p.setAttribute('data-en', data.sectionSubtitleEn || ''); p.textContent = t(data.sectionSubtitleZh, data.sectionSubtitleEn); }
      }
      var grid = document.querySelector('.pub-preview-grid');
      if (!grid) return;

      var html = '';
      data.publications.slice(0, 3).forEach(function(pub, i) {
        html += '<div class="pub-preview-card animate-in' + (i > 0 ? ' delay-' + i : '') + '">';
        html += '<div class="pub-preview-cover">';
        html += imgOrPlaceholder(pub.tocImage || pub.coverImage, '100%');
        html += '</div>';
        html += '<div class="pub-preview-body">';
        html += '<div class="pub-preview-journal"><em>' + escapeHtml(pub.journal) + '</em>, <strong>' + pub.year + '</strong>, ' + escapeHtml(pub.volume) + ', ' + escapeHtml(pub.pages) + '.</div>';
        html += '<div class="pub-preview-title">' + escapeHtml(pub.title) + '</div>';
        html += '</div>';
        html += '<a href="' + escapeHtml(pub.doi) + '" class="pub-preview-btn"><i class="ph ph-file-text"></i> View</a>';
        html += '</div>';
      });
      grid.innerHTML = html;
    });

    // Load research intro + direction cards + thumbnails + section titles
    fetchData('research').then(function(data) {
      if (!data) return;
      // Research section title on homepage
      var resST = document.getElementById('researchSectionTitle');
      if (resST) {
        var h2 = resST.querySelector('h2 .i18n');
        if (h2) { h2.setAttribute('data-zh', data.sectionTitleZh || ''); h2.setAttribute('data-en', data.sectionTitleEn || ''); h2.textContent = t(data.sectionTitleZh, data.sectionTitleEn); }
        var p = resST.querySelector('p .i18n');
        if (p) { p.setAttribute('data-zh', data.sectionSubtitleZh || ''); p.setAttribute('data-en', data.sectionSubtitleEn || ''); p.textContent = t(data.sectionSubtitleZh, data.sectionSubtitleEn); }
      }
      // Research overview text
      var introText = document.querySelector('.research-intro-text p .i18n');
      if (introText) {
        introText.setAttribute('data-zh', data.overviewZh || '');
        introText.setAttribute('data-en', data.overviewEn || '');
        introText.textContent = t(data.overviewZh, data.overviewEn);
      }
      // Research overview image
      if (data.overviewImage) {
        var introImg = document.querySelector('.research-intro-img');
        if (introImg) {
          introImg.innerHTML = '<img src="' + escapeHtml(data.overviewImage) + '" alt="" style="height:260px;width:100%;object-fit:cover;border-radius:var(--radius-lg);" loading="lazy">';
        }
      }
      // Research direction cards
      var dirsWrap = document.querySelector('.research-directions');
      if (dirsWrap && data.directions) {
        var colors = ['var(--warm)', 'var(--accent)', 'var(--teal)'];
        var dhtml = '';
        data.directions.forEach(function(dir, i) {
          dhtml += '<div class="research-dir-card animate-in' + (i > 0 ? ' delay-' + i : '') + '" style="--dir-color: ' + (dir.color || colors[i % 3]) + ';">';
          dhtml += '<div class="dir-dot"></div>';
          dhtml += '<h3><span class="i18n" data-zh="' + escapeHtml(dir.titleZh) + '" data-en="' + escapeHtml(dir.titleEn) + '">' + escapeHtml(t(dir.titleZh, dir.titleEn)) + '</span></h3>';
          dhtml += '<p><span class="i18n" data-zh="' + escapeHtml(dir.descZh) + '" data-en="' + escapeHtml(dir.descEn) + '">' + escapeHtml(t(dir.descZh, dir.descEn)) + '</span></p>';
          dhtml += '</div>';
        });
        dirsWrap.innerHTML = dhtml;
      }
      // Research duo header
      var duoRight = document.querySelector('.home-duo-right .duo-header h2 .i18n');
      if (duoRight) {
        duoRight.setAttribute('data-zh', data.sectionTitleZh || '');
        duoRight.setAttribute('data-en', data.sectionTitleEn || '');
        duoRight.textContent = t(data.sectionTitleZh, data.sectionTitleEn);
      }
      // Research thumbnails (News+Research duo right column)
      var thumbGrid = document.querySelector('.research-thumb-grid');
      if (thumbGrid && data.directions) {
        var thtml = '';
        data.directions.forEach(function(dir, i) {
          thtml += '<a href="research.html" class="research-thumb-card animate-in' + (i > 0 ? ' delay-' + (i % 3) : '') + '">';
          thtml += '<div class="research-thumb-img">';
          if (dir.image) {
            thtml += '<img src="' + escapeHtml(dir.image) + '" alt="" style="width:100%;height:100%;object-fit:cover;" loading="lazy">';
          } else {
            thtml += '<div class="img-placeholder" style="height:100%;display:flex;align-items:center;justify-content:center;background:var(--primary-100);"><i class="ph ' + escapeHtml(dir.icon || 'ph-image') + '" style="font-size:2rem;color:var(--text-muted);"></i></div>';
          }
          thtml += '</div>';
          thtml += '<div class="research-thumb-label" style="background:' + (dir.color || 'var(--accent)') + ';">' + escapeHtml(t(dir.titleZh, dir.titleEn)) + '</div>';
          thtml += '</a>';
        });
        thumbGrid.innerHTML = thtml;
      }
    });

    // Load positions for homepage + section titles
    fetchData('contact').then(function(data) {
      if (!data || !data.positions) return;
      // Positions section title
      var posST = document.getElementById('posSectionTitle');
      if (posST) {
        var h2 = posST.querySelector('h2 .i18n');
        if (h2) { h2.setAttribute('data-zh', data.posSectionTitleZh || ''); h2.setAttribute('data-en', data.posSectionTitleEn || ''); h2.textContent = t(data.posSectionTitleZh, data.posSectionTitleEn); }
        var p = posST.querySelector('p .i18n');
        if (p) { p.setAttribute('data-zh', data.posSectionSubtitleZh || ''); p.setAttribute('data-en', data.posSectionSubtitleEn || ''); p.textContent = t(data.posSectionSubtitleZh, data.posSectionSubtitleEn); }
      }
      var posWrap = document.querySelector('.positions-preview');
      if (!posWrap) return;
      var phtml = '';
      data.positions.forEach(function(pos, i) {
        phtml += '<div class="position-preview-card glass-card animate-in' + (i > 0 ? ' delay-' + i : '') + '">';
        phtml += '<div class="card-icon"><i class="' + escapeHtml(pos.icon || 'ph-fill ph-briefcase') + '"></i></div>';
        phtml += '<h4><span class="i18n" data-zh="' + escapeHtml(pos.titleZh) + '" data-en="' + escapeHtml(pos.titleEn) + '">' + escapeHtml(t(pos.titleZh, pos.titleEn)) + '</span></h4>';
        phtml += '<p><span class="i18n" data-zh="' + escapeHtml(pos.descZh) + '" data-en="' + escapeHtml(pos.descEn) + '">' + escapeHtml(t(pos.descZh, pos.descEn)) + '</span></p>';
        phtml += '</div>';
      });
      posWrap.innerHTML = phtml;
    });
  }

  // Re-init hero slider after dynamic load
  function initHeroSlider() {
    var slider = document.getElementById('heroSlider');
    var dotsWrap = document.getElementById('heroDots');
    if (!slider || !dotsWrap) return;

    var slides = slider.querySelectorAll('.hero-slide');
    var dots = dotsWrap.querySelectorAll('.dot');
    if (slides.length === 0) return;

    var current = 0;
    var autoPlay;

    function goToSlide(index) {
      slides[current].classList.remove('active');
      dots[current].classList.remove('active');
      current = (index + slides.length) % slides.length;
      slides[current].classList.add('active');
      dots[current].classList.add('active');
    }

    function startAuto() {
      autoPlay = setInterval(function() { goToSlide(current + 1); }, 5000);
    }

    dots.forEach(function(dot) {
      dot.addEventListener('click', function() {
        clearInterval(autoPlay);
        goToSlide(parseInt(dot.dataset.index, 10));
        startAuto();
      });
    });

    startAuto();
  }

  // ========== Helper: Update page banner ==========
  function updateBanner(data) {
    var banner = document.querySelector('.page-banner');
    if (!banner) return;
    var titleSpan = banner.querySelector('h1 .i18n');
    if (titleSpan && data.bannerTitleZh) {
      titleSpan.setAttribute('data-zh', data.bannerTitleZh);
      titleSpan.setAttribute('data-en', data.bannerTitleEn || '');
      titleSpan.textContent = t(data.bannerTitleZh, data.bannerTitleEn);
    }
    if (data.bannerIcon) {
      var icon = banner.querySelector('h1 i');
      if (icon) { icon.className = 'ph ' + data.bannerIcon; }
    }
    var subSpan = banner.querySelector('p .i18n');
    if (subSpan && data.bannerSubtitleZh) {
      subSpan.setAttribute('data-zh', data.bannerSubtitleZh);
      subSpan.setAttribute('data-en', data.bannerSubtitleEn || '');
      subSpan.textContent = t(data.bannerSubtitleZh, data.bannerSubtitleEn);
    }
  }

  // ========== PUBLICATIONS PAGE ==========
  function loadPublications() {
    fetchData('publications').then(function(data) {
      if (!data || !data.publications) return;
      updateBanner(data);
      var container = document.querySelector('.section .container');
      if (!container) return;

      // Group by year
      var years = {};
      data.publications.forEach(function(pub) {
        if (!years[pub.year]) years[pub.year] = [];
        years[pub.year].push(pub);
      });

      var sortedYears = Object.keys(years).sort(function(a, b) { return b - a; });
      var html = '';

      sortedYears.forEach(function(year) {
        html += '<div class="pub-year-section animate-in">';
        html += '<h3><i class="ph-fill ph-bookmark-simple" style="color:var(--accent);"></i> ' + year + '</h3>';

        years[year].forEach(function(pub) {
          html += '<div class="pub-item-v2 glass-card">';
          html += '<div class="pub-item-v2-top">';
          html += '<div class="pub-cover-v2">';
          if (pub.coverImage) {
            html += '<img src="' + escapeHtml(pub.coverImage) + '" alt="" style="width:100%;height:100%;object-fit:cover;">';
          } else {
            html += '<span class="placeholder"><i class="ph ph-book-open" style="font-size:2.2rem;"></i></span>';
          }
          html += '</div>';
          html += '<div class="pub-info-v2">';
          html += '<div class="pub-title-v2"><a href="' + escapeHtml(pub.doi) + '">' + escapeHtml(pub.title) + '</a></div>';
          html += '<div class="pub-authors-v2"><em>' + escapeHtml(pub.authors) + '</em> <strong>' + escapeHtml(pub.corresponding) + '</strong></div>';
          html += '<div class="pub-journal-v2"><em>' + escapeHtml(pub.journal) + '</em>, <strong>' + pub.year + '</strong>, ' + escapeHtml(pub.volume) + ', ' + escapeHtml(pub.pages) + '.</div>';
          html += '<div class="pub-links-v2"><a href="' + escapeHtml(pub.doi) + '" class="pub-link"><i class="ph ph-link"></i> DOI</a></div>';
          html += '</div></div>';
          html += '<div class="pub-toc-v2">';
          html += imgOrPlaceholder(pub.tocImage, '200px');
          html += '</div></div>';
        });

        html += '</div>';
      });

      container.innerHTML = html;
    });
  }

  // ========== NEWS PAGE ==========
  function loadNews() {
    fetchData('news').then(function(data) {
      if (!data || !data.news) return;
      updateBanner(data);
      var list = document.querySelector('.news-list');
      if (!list) return;

      var html = '';
      data.news.forEach(function(item) {
        html += '<div class="news-item glass-card animate-in">';
        html += '<div class="news-img">';
        html += imgOrPlaceholder(item.image, '100%');
        html += '</div>';
        html += '<div class="news-body">';
        html += '<div class="news-date"><i class="ph ph-calendar-blank"></i> ' + escapeHtml(item.date.replace(/-/g, '.')) + '</div>';
        html += '<div class="news-title">' + escapeHtml(t(item.titleZh, item.titleEn)) + '</div>';
        html += '<div class="news-excerpt">' + escapeHtml(t(item.excerptZh, item.excerptEn)) + '</div>';
        html += '<a href="' + escapeHtml(item.link) + '" class="read-more">Read more <i class="ph ph-arrow-right"></i></a>';
        html += '</div></div>';
      });
      list.innerHTML = html;
    });
  }

  // ========== MEMBERS PAGE ==========
  function loadMembers() {
    fetchData('members').then(function(data) {
      if (!data) return;
      if (data.groupPhoto) {
        var heroImg = document.querySelector('.members-hero-img');
        if (heroImg) {
          heroImg.innerHTML = '<img src="' + escapeHtml(data.groupPhoto) + '" alt="Group Photo" style="width:100%;height:100%;object-fit:cover;">';
        }
      }

      // Current members
      var currentSection = document.getElementById('current-members');
      if (!currentSection) return;
      var container = currentSection.querySelector('.container');
      if (!container) return;

      var html = '<div class="section-title"><h2><span class="i18n" data-zh="' + escapeHtml(data.currentMembersTitleZh || '在组成员') + '" data-en="' + escapeHtml(data.currentMembersTitleEn || 'CURRENT MEMBERS') + '">' + t(data.currentMembersTitleZh || '在组成员', data.currentMembersTitleEn || 'CURRENT MEMBERS') + '</span></h2><div class="divider"></div></div>';

      var categories = data.categories || [];
      categories.forEach(function(cat) {
        var catMembers = (data.members || []).filter(function(m) { return m.category === cat.id; });
        if (catMembers.length === 0) return;

        html += '<div class="members-category animate-in">';
        html += '<h3><i class="' + escapeHtml(cat.icon) + '"></i> <span class="i18n" data-zh="' + escapeHtml(cat.nameZh) + '" data-en="' + escapeHtml(cat.nameEn) + '">' + escapeHtml(t(cat.nameZh, cat.nameEn)) + '</span> <span class="line"></span></h3>';
        html += '<div class="members-grid">';

        catMembers.forEach(function(m) {
          html += '<div class="member-card glass-card">';
          if (m.avatar) {
            html += '<div class="avatar"><img src="' + escapeHtml(m.avatar) + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"></div>';
          } else {
            html += '<div class="avatar"><span class="initials">' + escapeHtml(m.initials) + '</span></div>';
          }
          html += '<div class="name">' + escapeHtml(m.name) + '</div>';
          html += '<div class="role">' + escapeHtml(m.role) + '</div>';
          html += '</div>';
        });

        html += '</div></div>';
      });

      container.innerHTML = html;

      // Alumni
      var alumniSection = document.getElementById('group-alumni');
      if (alumniSection && data.alumni && data.alumni.length > 0) {
        var alumniContainer = alumniSection.querySelector('.container');
        if (alumniContainer) {
          var ahtml = '<div class="section-title"><h2><span class="i18n" data-zh="' + escapeHtml(data.alumniTitleZh || '毕业校友') + '" data-en="' + escapeHtml(data.alumniTitleEn || 'GROUP ALUMNI') + '">' + t(data.alumniTitleZh || '毕业校友', data.alumniTitleEn || 'GROUP ALUMNI') + '</span></h2><div class="divider"></div></div>';
          ahtml += '<div class="members-category animate-in"><div class="members-grid">';
          data.alumni.forEach(function(a) {
            ahtml += '<div class="member-card glass-card">';
            ahtml += '<div class="avatar"><span class="initials">' + escapeHtml(a.initials) + '</span></div>';
            ahtml += '<div class="name">' + escapeHtml(a.name) + '</div>';
            ahtml += '<div class="role">' + escapeHtml(a.destination) + '</div>';
            ahtml += '</div>';
          });
          ahtml += '</div></div>';
          alumniContainer.innerHTML = ahtml;
        }
      }
    });
  }

  // ========== ABOUT PAGE ==========
  function loadAbout() {
    fetchData('about').then(function(data) {
      if (!data) return;
      updateBanner(data);

      // Hero info
      var heroInfo = document.querySelector('.about-hero-info');
      if (heroInfo) {
        var html = '<h2>' + escapeHtml(data.name) + '</h2>';
        html += '<p class="affiliation">' + escapeHtml(t(data.affiliationZh, data.affiliationEn)) + '<br>' + escapeHtml(t(data.collegeZh, data.collegeEn)) + '</p>';
        html += '<ul class="about-contact">';
        html += '<li><strong>E-mail:</strong> ' + escapeHtml(data.email) + '</li>';
        html += '<li><strong>Phone:</strong> ' + escapeHtml(data.phone) + '</li>';
        html += '<li><strong>Office:</strong> ' + escapeHtml(data.office) + '</li>';
        html += '<li><strong>Title:</strong> ' + escapeHtml(data.title) + '</li>';
        html += '</ul>';
        heroInfo.innerHTML = html;
      }

      // Photo
      if (data.photo) {
        var photoDiv = document.querySelector('.about-hero-photo');
        if (photoDiv) {
          photoDiv.innerHTML = '<img src="' + escapeHtml(data.photo) + '" alt="' + escapeHtml(data.name) + '" style="width:100%;min-height:340px;object-fit:cover;border-radius:var(--radius-lg,8px);">';
        }
      }

      // Education & Experience
      var cvCols = document.querySelector('.about-cv-section .cv-columns');
      if (cvCols) {
        var cols = cvCols.querySelectorAll('.cv-col');
        if (cols[0] && data.education) {
          var eduHtml = '<h3><span class="i18n" data-zh="教育经历：" data-en="Education:">' + t('教育经历：', 'Education:') + '</span></h3>';
          data.education.forEach(function(edu) {
            eduHtml += '<div class="cv-item"><div class="cv-year">' + escapeHtml(edu.years) + '</div>';
            eduHtml += '<div class="cv-desc">' + escapeHtml(t(edu.descZh, edu.descEn)).replace(/\n/g, '<br>') + '</div></div>';
          });
          cols[0].innerHTML = eduHtml;
        }
        if (cols[1] && data.experience) {
          var expHtml = '<h3><span class="i18n" data-zh="工作经历：" data-en="Professional Experience:">' + t('工作经历：', 'Professional Experience:') + '</span></h3>';
          data.experience.forEach(function(exp) {
            expHtml += '<div class="cv-item"><div class="cv-year">' + escapeHtml(exp.years) + '</div>';
            expHtml += '<div class="cv-desc">' + escapeHtml(t(exp.descZh, exp.descEn)).replace(/\n/g, '<br>') + '</div></div>';
          });
          cols[1].innerHTML = expHtml;
        }
      }

      // Awards
      var awardsBlock = document.querySelector('.about-awards-section .awards-block');
      if (awardsBlock && data.awards) {
        var awHtml = '<h3><span class="i18n" data-zh="获奖情况：" data-en="Awards and Honors:">' + t('获奖情况：', 'Awards and Honors:') + '</span></h3><div class="awards-list">';
        data.awards.forEach(function(aw) {
          awHtml += '<div class="award-item"><span class="award-year">' + escapeHtml(aw.year) + '</span> ' + escapeHtml(t(aw.titleZh, aw.titleEn)) + '</div>';
        });
        awHtml += '</div>';
        awardsBlock.innerHTML = awHtml;
      }

      // Research Interests & Academic Services
      var lastCvCols = document.querySelectorAll('.cv-columns');
      if (lastCvCols.length >= 2) {
        var riCols = lastCvCols[lastCvCols.length - 1].querySelectorAll('.cv-col');
        if (riCols[0] && data.researchInterests) {
          var riHtml = '<h3><span class="i18n" data-zh="研究兴趣：" data-en="Research Interests:">' + t('研究兴趣：', 'Research Interests:') + '</span></h3><ul class="about-list">';
          data.researchInterests.forEach(function(ri) {
            riHtml += '<li>' + escapeHtml(t(ri.zh, ri.en)) + '</li>';
          });
          riHtml += '</ul>';
          riCols[0].innerHTML = riHtml;
        }
        if (riCols[1] && data.academicServices) {
          var asHtml = '<h3><span class="i18n" data-zh="学术服务：" data-en="Academic Services:">' + t('学术服务：', 'Academic Services:') + '</span></h3><ul class="about-list">';
          data.academicServices.forEach(function(as) {
            asHtml += '<li>' + escapeHtml(t(as.zh, as.en)) + '</li>';
          });
          asHtml += '</ul>';
          riCols[1].innerHTML = asHtml;
        }
      }
    });
  }

  // ========== RESEARCH PAGE ==========
  function loadResearch() {
    fetchData('research').then(function(data) {
      if (!data) return;

      // Overview text
      var overviewText = document.querySelector('.research-overview-text p');
      if (overviewText) {
        var span = overviewText.querySelector('.i18n');
        if (span) {
          span.setAttribute('data-zh', data.overviewZh || '');
          span.setAttribute('data-en', data.overviewEn || '');
          span.textContent = t(data.overviewZh, data.overviewEn);
        }
      }

      // Overview image
      if (data.overviewImage) {
        var imgDiv = document.querySelector('.research-overview-img');
        if (imgDiv) {
          imgDiv.innerHTML = '<img src="' + escapeHtml(data.overviewImage) + '" alt="" style="width:100%;height:280px;object-fit:cover;border-radius:var(--radius-lg,8px);">';
        }
      }

      // Research blocks
      var researchSection = document.querySelector('.research-section .container');
      if (researchSection && data.directions) {
        var html = '';
        data.directions.forEach(function(dir) {
          html += '<div class="research-block-v2 animate-in" style="--block-accent:' + (dir.accentStart || 'rgba(10,61,143,0.88)') + ';--block-accent-end:' + (dir.accentEnd || 'rgba(37,99,176,0.92)') + ';--block-glow:rgba(10,61,143,0.08);">';
          html += '<div class="research-block-v2-bar"><span class="bar-icon"><i class="ph ' + escapeHtml(dir.icon) + '"></i></span>';
          html += '<h2><span class="i18n" data-zh="' + escapeHtml(dir.titleZh) + '" data-en="' + escapeHtml(dir.titleEn) + '">' + escapeHtml(t(dir.titleZh, dir.titleEn)) + '</span></h2></div>';
          html += '<div class="research-block-v2-body">';
          html += '<p class="research-block-v2-desc"><span class="i18n" data-zh="' + escapeHtml(dir.detailDescZh) + '" data-en="' + escapeHtml(dir.detailDescEn) + '">' + escapeHtml(t(dir.detailDescZh, dir.detailDescEn)) + '</span></p>';
          html += '<div class="research-block-v2-img">';
          html += imgOrPlaceholder(dir.image, '400px', dir.icon);
          html += '</div></div></div>';
        });
        researchSection.innerHTML = html;
      }
    });

    // Also update the index page research section if on index
    // This is handled separately in loadIndex
  }

  // ========== JOINUS PAGE ==========
  function loadJoinus() {
    fetchData('contact').then(function(data) {
      if (!data) return;
      updateBanner(data);

      // Callout text
      var highlight = document.querySelector('.joinus-callout-highlight');
      if (highlight) {
        var span = highlight.querySelector('.i18n');
        if (span) {
          span.setAttribute('data-zh', data.joinUsZh || '');
          span.setAttribute('data-en', data.joinUsEn || '');
          span.textContent = t(data.joinUsZh, data.joinUsEn);
        }
      }

      var cnText = document.querySelector('.joinus-callout-cn');
      if (cnText) {
        var span2 = cnText.querySelector('.i18n');
        if (span2) {
          span2.setAttribute('data-zh', data.joinUsDetailZh || '');
          span2.setAttribute('data-en', data.joinUsDetailEn || '');
          span2.textContent = t(data.joinUsDetailZh, data.joinUsDetailEn);
        }
      }

      // Contact info
      var contactItems = document.querySelectorAll('.talk-to-us-info .contact-item');
      if (contactItems.length >= 4) {
        contactItems[0].querySelector('p').textContent = data.email || '';
        contactItems[1].querySelector('p').textContent = data.phone || '';
        contactItems[2].querySelector('p').textContent = t(data.addressZh, data.addressEn) || '';
        contactItems[3].querySelector('p').textContent = data.office || '';
      }

      // Update callout email link
      var calloutText = document.querySelector('.joinus-callout-text');
      if (calloutText && data.email) {
        var emailLink = calloutText.querySelector('a[href^="mailto:"]');
        if (emailLink) {
          emailLink.href = 'mailto:' + data.email;
          emailLink.innerHTML = '<strong>' + escapeHtml(data.email) + '</strong>';
        }
      }

      // Map
      if (data.mapUrl) {
        var iframe = document.querySelector('.map-3d-container iframe');
        if (iframe) {
          iframe.src = data.mapUrl;
        }
      }
    });
  }

  // ========== Route & Initialize ==========
  function init() {
    loadFooter();

    switch (page) {
      case 'index': loadIndex(); break;
      case 'publications': loadPublications(); break;
      case 'news': loadNews(); break;
      case 'members': loadMembers(); break;
      case 'about': loadAbout(); break;
      case 'research': loadResearch(); break;
      case 'joinus': loadJoinus(); break;
    }
  }

  // Wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
