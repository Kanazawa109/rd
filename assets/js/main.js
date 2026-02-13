/**
 * 株式会社アールアンドディー Website
 * Main JavaScript
 */

const API_URL = 'https://script.google.com/macros/s/AKfycbwwzXQOIOqlGzM5ToCNez1-tZt5BLrgDSH5W2xBUED0oWvqPnBccPQI3VVfGGgpQ3ca/exec';
const HEADER_HEIGHT = 70;
const FETCH_TIMEOUT_MS = 15000;
const FALLBACK_IMAGE = 'https://placehold.co/400x300/e8e8e8/999?text=No+Image';

function convertDriveUrl(url) {
    if (!url || !url.includes('drive.google.com')) {
        return url;
    }

    let fileId = '';
    if (url.includes('/d/')) {
        fileId = url.match(/\/d\/([^\/\?]+)/)?.[1];
    } else if (url.includes('id=')) {
        fileId = url.match(/id=([^&]+)/)?.[1];
    }

    return fileId ? 'https://lh3.googleusercontent.com/d/' + fileId : url;
}

function createPropertyCard(prop) {
    const imageUrl = convertDriveUrl(prop.image || '');
    const card = document.createElement('div');
    card.className = 'property-card';

    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = prop.name || '';
    img.loading = 'lazy';
    img.addEventListener('error', function () {
        this.src = FALLBACK_IMAGE;
    }, { once: true });

    const info = document.createElement('div');
    info.className = 'info';

    const h3 = document.createElement('h3');
    h3.textContent = prop.name || '';

    const p = document.createElement('p');
    p.textContent = prop.address || '';
    if (prop.details) {
        p.appendChild(document.createElement('br'));
        p.appendChild(document.createTextNode(prop.details));
    }

    info.appendChild(h3);
    info.appendChild(p);
    card.appendChild(img);
    card.appendChild(info);

    return card;
}

async function loadProperties() {
    const grid = document.getElementById('propertyGrid');
    const loadingScreen = document.getElementById('loadingScreen');
    const loadingStatus = document.getElementById('loadingStatus');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        const response = await fetch(API_URL, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error('データ取得エラー');
        }

        const properties = await response.json();

        if (properties.length === 0) {
            const msg = document.createElement('div');
            msg.className = 'status-message';
            msg.textContent = '現在、掲載中の物件はありません。';
            grid.innerHTML = '';
            grid.appendChild(msg);
        } else {
            grid.innerHTML = '';
            properties.forEach(prop => {
                grid.appendChild(createPropertyCard(prop));
            });
        }

        loadingStatus.textContent = '読み込み完了';
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            document.documentElement.classList.remove('loading');
        }, 300);

    } catch (error) {
        clearTimeout(timeoutId);
        console.error('Error:', error);

        const msg = document.createElement('div');
        msg.className = 'status-message error';

        if (error.name === 'AbortError') {
            msg.textContent = '接続がタイムアウトしました。しばらく経ってから再度お試しください。';
            loadingStatus.textContent = 'タイムアウトしました';
        } else {
            msg.textContent = '物件情報の読み込みに失敗しました。しばらく経ってから再度お試しください。';
            loadingStatus.textContent = '読み込みに失敗しました';
        }

        grid.innerHTML = '';
        grid.appendChild(msg);

        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            document.documentElement.classList.remove('loading');
        }, 500);
    }
}

function createNewsItem(news) {
    const item = document.createElement('div');
    item.className = 'news-item';

    const date = document.createElement('span');
    date.className = 'news-date';
    date.textContent = news.date || '';

    const body = document.createElement('div');
    body.className = 'news-body';

    const title = document.createElement('p');
    title.className = 'news-title';
    title.textContent = news.title || '';

    if (news.content) {
        const content = document.createElement('p');
        content.className = 'news-content';
        content.textContent = news.content;
        body.appendChild(title);
        body.appendChild(content);
    } else {
        body.appendChild(title);
    }

    item.appendChild(date);

    if (news.category) {
        const category = document.createElement('span');
        category.className = 'news-category';
        category.textContent = news.category;
        item.appendChild(category);
    }

    item.appendChild(body);
    return item;
}

async function loadNews() {
    const list = document.getElementById('newsList');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        const response = await fetch(API_URL + '?type=news', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error('ニュース取得エラー');

        const newsData = await response.json();

        if (newsData.length === 0) {
            const msg = document.createElement('div');
            msg.className = 'status-message';
            msg.textContent = '現在、ニュースはありません。';
            list.appendChild(msg);
        } else {
            newsData.forEach(news => {
                list.appendChild(createNewsItem(news));
            });
        }
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('News Error:', error);
        const msg = document.createElement('div');
        msg.className = 'status-message error';
        msg.textContent = error.name === 'AbortError'
            ? 'ニュースの取得がタイムアウトしました。'
            : 'ニュースの読み込みに失敗しました。';
        list.appendChild(msg);
    }
}

function initScrollAnimations() {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('header a');

    const observerOptions = {
        root: null,
        rootMargin: '-10% 0px -10% 0px',
        threshold: 0.1
    };

    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        sectionObserver.observe(section);
    });

    let ticking = false;

    function updateActiveNav() {
        if (window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
            navLinks.forEach(link => link.classList.remove('active'));
            navLinks[navLinks.length - 1]?.classList.add('active');
            return;
        }

        let currentSection = null;

        for (const section of sections) {
            const rect = section.getBoundingClientRect();
            if (rect.top <= HEADER_HEIGHT + 20) {
                currentSection = section;
            }
        }

        if (!currentSection) {
            for (const section of sections) {
                const rect = section.getBoundingClientRect();
                if (rect.bottom > HEADER_HEIGHT) {
                    currentSection = section;
                    break;
                }
            }
        }

        navLinks.forEach(link => link.classList.remove('active'));

        if (currentSection) {
            const id = currentSection.getAttribute('id');
            const targetLink = document.querySelector(`header a[href="#${id}"]`);
            if (targetLink) {
                targetLink.classList.add('active');
            }
        }
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                updateActiveNav();
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
    updateActiveNav();

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);

            if (targetSection) {
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                const targetPosition = targetSection.offsetTop - HEADER_HEIGHT;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

function initImageProtection() {
    document.addEventListener('contextmenu', (e) => {
        if (e.target.tagName === 'IMG') {
            e.preventDefault();
        }
    });

    document.addEventListener('dragstart', (e) => {
        if (e.target.tagName === 'IMG') {
            e.preventDefault();
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadProperties();
    loadNews();
    initScrollAnimations();
    initImageProtection();
});
