const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation-links');
const mobileViewport = window.matchMedia('(max-width: 1000px)');

function closeMenu() {
  menuButton.setAttribute('aria-expanded', 'false');
  navigation.classList.remove('is-open');
}

menuButton.hidden = false;
document.documentElement.classList.add('navigation-ready');

menuButton.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  navigation.classList.toggle('is-open', !isOpen);
});

navigation.addEventListener('click', (event) => {
  const link = event.target.closest('a');
  if (!link) return;
  closeMenu();

  // Move keyboard focus out of the menu before it becomes hidden on mobile.
  if (link.getAttribute('href').startsWith('#')) {
    const target = document.querySelector(link.hash);
    if (target) {
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menuButton.focus();
  }
});

mobileViewport.addEventListener('change', closeMenu);

// Highlight the section currently being read, as in the toolkit navigation.
const sectionLinks = Array.from(navigation.querySelectorAll('a[href^="#"]'))
  .filter((link) => document.querySelector(link.hash));
const pageSections = sectionLinks.map((link) => document.querySelector(link.hash));
let updateScheduled = false;

function updateCurrentSection() {
  const readingLine = document.querySelector('.site-header').offsetHeight + 48;
  let currentIndex = -1;

  pageSections.forEach((section, index) => {
    if (section.getBoundingClientRect().top <= readingLine) currentIndex = index;
  });

  sectionLinks.forEach((link, index) => {
    if (index === currentIndex) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  updateScheduled = false;
}

function scheduleSectionUpdate() {
  if (!updateScheduled) {
    updateScheduled = true;
    window.requestAnimationFrame(updateCurrentSection);
  }
}

window.addEventListener('scroll', scheduleSectionUpdate, { passive: true });
window.addEventListener('resize', scheduleSectionUpdate);
updateCurrentSection();
