/**
 * main.js テスト
 * 異常系・エッジケースを中心に検証
 */

const {
    convertDriveUrl,
    createPropertyCard,
    createNewsItem,
    loadProperties,
    loadNews,
    FALLBACK_IMAGE,
} = require('../main.js');

// ---------- convertDriveUrl ----------

describe('convertDriveUrl', () => {
    describe('正常系', () => {
        test('/d/ 形式のGoogle DriveURLを変換できる', () => {
            const url = 'https://drive.google.com/file/d/abc123/view';
            expect(convertDriveUrl(url)).toBe(
                'https://lh3.googleusercontent.com/d/abc123'
            );
        });

        test('id= 形式のGoogle DriveURLを変換できる', () => {
            const url = 'https://drive.google.com/open?id=xyz789';
            expect(convertDriveUrl(url)).toBe(
                'https://lh3.googleusercontent.com/d/xyz789'
            );
        });

        test('Google Drive以外のURLはそのまま返す', () => {
            const url = 'https://example.com/image.jpg';
            expect(convertDriveUrl(url)).toBe(url);
        });
    });

    describe('異常系', () => {
        test('nullを渡すとnullを返す', () => {
            expect(convertDriveUrl(null)).toBeNull();
        });

        test('undefinedを渡すとundefinedを返す', () => {
            expect(convertDriveUrl(undefined)).toBeUndefined();
        });

        test('空文字を渡すと空文字を返す', () => {
            expect(convertDriveUrl('')).toBe('');
        });

        test('drive.google.comを含むがIDが抽出できないURLはそのまま返す', () => {
            const url = 'https://drive.google.com/invalid-path';
            expect(convertDriveUrl(url)).toBe(url);
        });

        test('/d/ の後にパスが続かないURLはそのまま返す', () => {
            const url = 'https://drive.google.com/file/d/';
            // /d/ の後が空 → fileIdが空文字 → falsy → 元URLを返す
            expect(convertDriveUrl(url)).toBe(url);
        });

        test('id= の値が空のURLはそのまま返す', () => {
            const url = 'https://drive.google.com/open?id=';
            expect(convertDriveUrl(url)).toBe(url);
        });
    });

    describe('エッジケース', () => {
        test('クエリパラメータ付きの /d/ URLからIDを正しく抽出する', () => {
            const url = 'https://drive.google.com/file/d/abc123?usp=sharing';
            expect(convertDriveUrl(url)).toBe(
                'https://lh3.googleusercontent.com/d/abc123'
            );
        });

        test('id= の後に&でパラメータが続くURLからIDを正しく抽出する', () => {
            const url = 'https://drive.google.com/open?id=xyz789&export=download';
            expect(convertDriveUrl(url)).toBe(
                'https://lh3.googleusercontent.com/d/xyz789'
            );
        });
    });
});

// ---------- createPropertyCard ----------

describe('createPropertyCard', () => {
    describe('正常系', () => {
        test('物件カードのDOM要素を正しく生成する', () => {
            const prop = {
                name: 'テストビル',
                address: '東京都渋谷区',
                details: '築10年',
                image: 'https://example.com/img.jpg',
            };
            const card = createPropertyCard(prop);

            expect(card.className).toBe('property-card');
            expect(card.querySelector('h3').textContent).toBe('テストビル');
            expect(card.querySelector('p').textContent).toContain('東京都渋谷区');
            expect(card.querySelector('p').textContent).toContain('築10年');
            expect(card.querySelector('img').src).toBe('https://example.com/img.jpg');
        });
    });

    describe('異常系: プロパティ欠損', () => {
        test('全プロパティが空の物件でもエラーにならない', () => {
            const card = createPropertyCard({});
            expect(card).toBeDefined();
            expect(card.querySelector('h3').textContent).toBe('');
            expect(card.querySelector('img').src).toBeDefined();
        });

        test('nameがundefinedの場合、h3は空文字になる', () => {
            const card = createPropertyCard({ name: undefined });
            expect(card.querySelector('h3').textContent).toBe('');
        });

        test('addressがundefinedの場合、pは空文字になる', () => {
            const card = createPropertyCard({ address: undefined });
            expect(card.querySelector('p').textContent).toBe('');
        });

        test('imageがundefinedでもカードが生成される', () => {
            const card = createPropertyCard({ name: 'テスト', image: undefined });
            expect(card.querySelector('img')).not.toBeNull();
        });

        test('detailsがない場合、brタグは追加されない', () => {
            const card = createPropertyCard({ name: 'テスト', address: '住所' });
            expect(card.querySelector('p br')).toBeNull();
        });
    });

    describe('エッジケース', () => {
        test('Google DriveのURLが変換される', () => {
            const prop = {
                name: 'テスト',
                image: 'https://drive.google.com/file/d/abc123/view',
            };
            const card = createPropertyCard(prop);
            expect(card.querySelector('img').src).toBe(
                'https://lh3.googleusercontent.com/d/abc123'
            );
        });

        test('画像のloading属性がlazyに設定される', () => {
            const card = createPropertyCard({ name: 'テスト' });
            expect(card.querySelector('img').loading).toBe('lazy');
        });

        test('画像読み込みエラー時にフォールバック画像が設定される', () => {
            const card = createPropertyCard({
                name: 'テスト',
                image: 'https://invalid-url.example.com/broken.jpg',
            });
            const img = card.querySelector('img');

            // errorイベントを発火してフォールバック動作を確認
            img.dispatchEvent(new Event('error'));
            expect(img.src).toBe(FALLBACK_IMAGE);
        });

        test('画像のerrorハンドラは一度だけ実行される（onceオプション）', () => {
            const card = createPropertyCard({ name: 'テスト', image: 'broken.jpg' });
            const img = card.querySelector('img');

            // 1回目: フォールバックが設定される
            img.dispatchEvent(new Event('error'));
            expect(img.src).toBe(FALLBACK_IMAGE);

            // フォールバック画像のURLに変更
            img.src = 'https://another-broken.example.com/image.jpg';

            // 2回目: onceなのでハンドラは実行されない → srcはそのまま
            img.dispatchEvent(new Event('error'));
            expect(img.src).toBe('https://another-broken.example.com/image.jpg');
        });

        test('XSS対策: 物件名にHTMLタグが含まれてもテキストとして扱われる', () => {
            const card = createPropertyCard({
                name: '<script>alert("xss")</script>',
                address: '<img onerror="alert(1)" src="x">',
            });
            expect(card.querySelector('h3').textContent).toBe(
                '<script>alert("xss")</script>'
            );
            // scriptタグが実際のDOMとして挿入されていないことを確認
            expect(card.querySelector('script')).toBeNull();
            expect(card.querySelectorAll('img').length).toBe(1); // 物件画像の1つだけ
        });
    });
});

// ---------- createNewsItem ----------

describe('createNewsItem', () => {
    describe('正常系', () => {
        test('全フィールドありのニュースアイテムを正しく生成する', () => {
            const news = {
                date: '2026-01-01',
                category: 'お知らせ',
                title: 'テストニュース',
                content: 'ニュース本文です。',
            };
            const item = createNewsItem(news);

            expect(item.className).toBe('news-item');
            expect(item.querySelector('.news-date').textContent).toBe('2026-01-01');
            expect(item.querySelector('.news-category').textContent).toBe('お知らせ');
            expect(item.querySelector('.news-title').textContent).toBe('テストニュース');
            expect(item.querySelector('.news-content').textContent).toBe('ニュース本文です。');
        });
    });

    describe('異常系: プロパティ欠損', () => {
        test('空オブジェクトでもエラーにならない', () => {
            const item = createNewsItem({});
            expect(item).toBeDefined();
            expect(item.querySelector('.news-date').textContent).toBe('');
            expect(item.querySelector('.news-title').textContent).toBe('');
        });

        test('categoryがない場合、カテゴリバッジは生成されない', () => {
            const item = createNewsItem({ title: 'テスト' });
            expect(item.querySelector('.news-category')).toBeNull();
        });

        test('contentがない場合、news-content要素は生成されない', () => {
            const item = createNewsItem({ title: 'テスト' });
            expect(item.querySelector('.news-content')).toBeNull();
        });

        test('categoryが空文字の場合、カテゴリバッジは生成されない（falsyチェック）', () => {
            const item = createNewsItem({ title: 'テスト', category: '' });
            expect(item.querySelector('.news-category')).toBeNull();
        });

        test('contentが空文字の場合、news-content要素は生成されない（falsyチェック）', () => {
            const item = createNewsItem({ title: 'テスト', content: '' });
            expect(item.querySelector('.news-content')).toBeNull();
        });
    });

    describe('エッジケース', () => {
        test('XSS対策: HTMLタグがテキストとして扱われる', () => {
            const item = createNewsItem({
                title: '<script>alert("xss")</script>',
                content: '<img onerror="alert(1)">',
                category: '<b>重要</b>',
            });
            expect(item.querySelector('script')).toBeNull();
            expect(item.querySelector('.news-title').textContent).toBe(
                '<script>alert("xss")</script>'
            );
        });
    });
});

// ---------- loadProperties ----------

describe('loadProperties', () => {
    /** テスト用のDOM構造をセットアップ */
    function setupDom() {
        document.body.innerHTML = `
            <div class="loading-screen" id="loadingScreen">
                <div class="loading-status" id="loadingStatus"></div>
            </div>
            <div id="propertyGrid"></div>
        `;
    }

    beforeEach(() => {
        setupDom();
        jest.restoreAllMocks();
    });

    test('正常系: 物件データを取得してカードを描画する', async () => {
        const mockData = [
            { name: '物件A', address: '東京都', image: '' },
            { name: '物件B', address: '大阪府', image: '' },
        ];
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockData),
        });

        await loadProperties();

        const grid = document.getElementById('propertyGrid');
        expect(grid.querySelectorAll('.property-card').length).toBe(2);
    });

    test('正常系: 物件データが空配列の場合、「掲載中の物件はありません」と表示する', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve([]),
        });

        await loadProperties();

        const grid = document.getElementById('propertyGrid');
        const msg = grid.querySelector('.status-message');
        expect(msg).not.toBeNull();
        expect(msg.textContent).toContain('掲載中の物件はありません');
    });

    test('異常系: HTTPエラー（response.ok === false）の場合、エラーメッセージを表示する', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 500,
        });

        await loadProperties();

        const grid = document.getElementById('propertyGrid');
        const msg = grid.querySelector('.status-message.error');
        expect(msg).not.toBeNull();
        expect(msg.textContent).toContain('読み込みに失敗しました');
    });

    test('異常系: ネットワークエラーの場合、エラーメッセージを表示する', async () => {
        global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

        await loadProperties();

        const grid = document.getElementById('propertyGrid');
        const msg = grid.querySelector('.status-message.error');
        expect(msg).not.toBeNull();
        expect(msg.textContent).toContain('読み込みに失敗しました');
    });

    test('異常系: タイムアウト（AbortError）の場合、タイムアウトメッセージを表示する', async () => {
        const abortError = new DOMException('The operation was aborted', 'AbortError');
        global.fetch = jest.fn().mockRejectedValue(abortError);

        await loadProperties();

        const grid = document.getElementById('propertyGrid');
        const msg = grid.querySelector('.status-message.error');
        expect(msg).not.toBeNull();
        expect(msg.textContent).toContain('タイムアウト');
    });

    test('異常系: JSONパースエラーの場合、エラーメッセージを表示する', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.reject(new SyntaxError('Unexpected token')),
        });

        await loadProperties();

        const grid = document.getElementById('propertyGrid');
        const msg = grid.querySelector('.status-message.error');
        expect(msg).not.toBeNull();
    });

    test('ローディング画面: 正常完了後にhiddenクラスが付与される', async () => {
        jest.useFakeTimers();
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve([]),
        });

        await loadProperties();
        jest.advanceTimersByTime(500);

        const screen = document.getElementById('loadingScreen');
        expect(screen.classList.contains('hidden')).toBe(true);

        jest.useRealTimers();
    });

    test('ローディング画面: エラー時にもhiddenクラスが付与される', async () => {
        jest.useFakeTimers();
        global.fetch = jest.fn().mockRejectedValue(new Error('fail'));

        await loadProperties();
        jest.advanceTimersByTime(600);

        const screen = document.getElementById('loadingScreen');
        expect(screen.classList.contains('hidden')).toBe(true);

        jest.useRealTimers();
    });

    test('ローディングステータス: タイムアウト時に適切なメッセージが設定される', async () => {
        const abortError = new DOMException('aborted', 'AbortError');
        global.fetch = jest.fn().mockRejectedValue(abortError);

        await loadProperties();

        const status = document.getElementById('loadingStatus');
        expect(status.textContent).toBe('タイムアウトしました');
    });

    test('ローディングステータス: 一般エラー時に適切なメッセージが設定される', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('network'));

        await loadProperties();

        const status = document.getElementById('loadingStatus');
        expect(status.textContent).toBe('読み込みに失敗しました');
    });
});

// ---------- loadNews ----------

describe('loadNews', () => {
    function setupDom() {
        document.body.innerHTML = '<div class="news-list" id="newsList"></div>';
    }

    beforeEach(() => {
        setupDom();
        jest.restoreAllMocks();
    });

    test('正常系: ニュースデータを取得してアイテムを描画する', async () => {
        const mockData = [
            { date: '2026-01-01', title: 'ニュース1' },
            { date: '2026-02-01', title: 'ニュース2', category: '重要' },
        ];
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockData),
        });

        await loadNews();

        const list = document.getElementById('newsList');
        expect(list.querySelectorAll('.news-item').length).toBe(2);
    });

    test('正常系: ニュースが空配列の場合、「ニュースはありません」と表示する', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve([]),
        });

        await loadNews();

        const list = document.getElementById('newsList');
        const msg = list.querySelector('.status-message');
        expect(msg).not.toBeNull();
        expect(msg.textContent).toContain('ニュースはありません');
    });

    test('異常系: HTTPエラーの場合、エラーメッセージを表示する', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 500,
        });

        await loadNews();

        const list = document.getElementById('newsList');
        const msg = list.querySelector('.status-message.error');
        expect(msg).not.toBeNull();
        expect(msg.textContent).toContain('読み込みに失敗しました');
    });

    test('異常系: ネットワークエラーの場合、エラーメッセージを表示する', async () => {
        global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

        await loadNews();

        const list = document.getElementById('newsList');
        const msg = list.querySelector('.status-message.error');
        expect(msg).not.toBeNull();
        expect(msg.textContent).toContain('読み込みに失敗しました');
    });

    test('異常系: タイムアウトの場合、タイムアウトメッセージを表示する', async () => {
        const abortError = new DOMException('aborted', 'AbortError');
        global.fetch = jest.fn().mockRejectedValue(abortError);

        await loadNews();

        const list = document.getElementById('newsList');
        const msg = list.querySelector('.status-message.error');
        expect(msg).not.toBeNull();
        expect(msg.textContent).toContain('タイムアウト');
    });

    test('異常系: JSONパースエラーの場合、エラーメッセージを表示する', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.reject(new SyntaxError('Unexpected token')),
        });

        await loadNews();

        const list = document.getElementById('newsList');
        const msg = list.querySelector('.status-message.error');
        expect(msg).not.toBeNull();
    });
});
