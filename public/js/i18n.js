let currentLanguage = 'en';

function setLanguage(lang) {
  currentLanguage = lang;
  document.documentElement.lang = lang;
  localStorage.setItem('opd_language', lang);
  translatePage();
}

function translatePage() {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = getTranslation(key);
    if (translation) {
      el.textContent = translation;
    }
  });
}

function getTranslation(key, params = {}) {
  const dict = translations[currentLanguage] || translations.en;
  let text = dict[key] || translations.en[key] || key;
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  }
  return text;
}

document.addEventListener('DOMContentLoaded', () => {
  const savedLang = localStorage.getItem('opd_language') || 'en';
  document.getElementById('lang-select').value = savedLang;
  setLanguage(savedLang);
  document.getElementById('lang-select').addEventListener('change', (e) => {
    setLanguage(e.target.value);
  });
});