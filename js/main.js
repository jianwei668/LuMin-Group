/* ============================================================
   LuMin Group — Main Script
   Hero slider · Scroll animations · Mobile nav · Back-to-top
   ============================================================ */

;(function () {
  'use strict';

  /* ---------- Header scroll effect ---------- */
  const header = document.getElementById('header');
  const headerTop = header ? header.querySelector('.header-top') : null;
  let lastScrollY = 0;

  function handleHeaderScroll() {
    const sy = window.scrollY;
    if (sy > 60) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
    lastScrollY = sy;
  }
  window.addEventListener('scroll', handleHeaderScroll, { passive: true });

  /* ---------- Mobile nav ---------- */
  const menuToggle = document.getElementById('menuToggle');
  const mainNav = document.getElementById('mainNav');

  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', function () {
      menuToggle.classList.toggle('active');
      mainNav.classList.toggle('open');
    });
    mainNav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        menuToggle.classList.remove('active');
        mainNav.classList.remove('open');
      });
    });
  }

  /* ---------- Hero slider ---------- */
  const slider = document.getElementById('heroSlider');
  const dotsWrap = document.getElementById('heroDots');

  if (slider && dotsWrap) {
    const slides = slider.querySelectorAll('.hero-slide');
    const dots = dotsWrap.querySelectorAll('.dot');
    let current = 0;
    let autoPlay;

    function goToSlide(index) {
      slides[current].classList.remove('active');
      dots[current].classList.remove('active');
      current = (index + slides.length) % slides.length;
      slides[current].classList.add('active');
      dots[current].classList.add('active');
    }

    function startAutoPlay() {
      autoPlay = setInterval(function () {
        goToSlide(current + 1);
      }, 5000);
    }

    dots.forEach(function (dot) {
      dot.addEventListener('click', function () {
        clearInterval(autoPlay);
        goToSlide(parseInt(dot.dataset.index, 10));
        startAutoPlay();
      });
    });

    startAutoPlay();
  }

  /* ---------- Back to top ---------- */
  const backBtn = document.getElementById('backToTop');

  if (backBtn) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 400) {
        backBtn.classList.add('visible');
      } else {
        backBtn.classList.remove('visible');
      }
    }, { passive: true });

    backBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- Scroll-triggered entrance animations ---------- */
  const observerOpts = {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  };

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOpts);

  document.querySelectorAll('.animate-in').forEach(function (el) {
    observer.observe(el);
  });

  /* ---------- Staggered children animation ---------- */
  document.querySelectorAll('.research-grid, .members-grid, .news-compact, .positions-preview').forEach(function (grid) {
    var children = grid.children;
    for (var i = 0; i < children.length; i++) {
      children[i].style.transitionDelay = (i * 0.1) + 's';
    }
  });

  /* ---------- Language Toggle (i18n) ---------- */
  var langToggle = document.getElementById('langToggle');
  var htmlEl = document.documentElement;

  function setLang(lang) {
    htmlEl.setAttribute('lang', lang);
    document.querySelectorAll('.i18n').forEach(function (el) {
      var text = el.getAttribute('data-' + (lang === 'zh-CN' ? 'zh' : 'en'));
      if (text) {
        el.textContent = text;
      }
    });
    try {
      localStorage.setItem('lumin-lang', lang);
    } catch (e) { /* ignore */ }
  }

  // Restore saved language preference or default to English
  var savedLang = null;
  try {
    savedLang = localStorage.getItem('lumin-lang');
  } catch (e) { /* ignore */ }
  setLang((savedLang === 'zh-CN') ? 'zh-CN' : 'en');

  if (langToggle) {
    langToggle.addEventListener('click', function () {
      var current = htmlEl.getAttribute('lang') || 'zh-CN';
      var next = current === 'zh-CN' ? 'en' : 'zh-CN';
      setLang(next);
    });
  }
})();
