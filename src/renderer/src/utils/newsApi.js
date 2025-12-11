// Financial News API
// Fetches financial news from RSS feeds (no API key required)

const RSS_FEEDS = {
    india: [
        'https://www.moneycontrol.com/rss/latestnews.xml',
        'https://economictimes.indiatimes.com/rssfeedstopstories.cms',
        'https://www.business-standard.com/rss/home_page_top_stories.rss'
    ],
    us: [
        'https://feeds.finance.yahoo.com/rss/2.0/headline',
        'https://www.cnbc.com/id/100003114/device/rss/rss.html'
    ],
    crypto: [
        'https://cointelegraph.com/rss',
        'https://www.coindesk.com/arc/outboundfeeds/rss/'
    ]
};

const CACHE_KEY = 'pocketwall_news';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * Get cached news if available and not expired
 * @returns {Array|null} - Cached news or null
 */
function getCachedNews() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;

        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;

        if (age < CACHE_DURATION) {
            return data;
        }

        // Cache expired
        localStorage.removeItem(CACHE_KEY);
        return null;
    } catch (error) {
        console.error('Error reading cached news:', error);
        return null;
    }
}

/**
 * Cache news articles
 * @param {Array} data - News articles
 */
function cacheNews(data) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.error('Error caching news:', error);
    }
}

/**
 * Parse RSS feed XML to JSON
 * @param {string} xmlText - RSS XML text
 * @returns {Array} - Array of news items
 */
function parseRSSFeed(xmlText) {
    try {
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, 'text/xml');

        const items = xml.querySelectorAll('item');
        const news = [];

        items.forEach((item, index) => {
            if (index < 10) { // Limit to 10 items per feed
                const title = item.querySelector('title')?.textContent || '';
                const link = item.querySelector('link')?.textContent || '';
                const description = item.querySelector('description')?.textContent || '';
                const pubDate = item.querySelector('pubDate')?.textContent || '';

                news.push({
                    title: title.trim(),
                    link: link.trim(),
                    description: stripHTML(description).substring(0, 200),
                    date: new Date(pubDate).toLocaleString(),
                    source: extractSource(link)
                });
            }
        });

        return news;
    } catch (error) {
        console.error('Error parsing RSS feed:', error);
        return [];
    }
}

/**
 * Strip HTML tags from text
 * @param {string} html - HTML text
 * @returns {string} - Plain text
 */
function stripHTML(html) {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

/**
 * Extract source name from URL
 * @param {string} url - News URL
 * @returns {string} - Source name
 */
function extractSource(url) {
    try {
        const hostname = new URL(url).hostname;
        return hostname.replace('www.', '').split('.')[0].toUpperCase();
    } catch {
        return 'Unknown';
    }
}

/**
 * Fetch financial news from RSS feeds
 * @param {string} region - 'india', 'us', or 'crypto'
 * @returns {Promise<Array>} - Array of news items
 */
export async function getFinancialNews(region = 'india') {
    try {
        // Check cache first
        const cached = getCachedNews();
        if (cached) {
            return cached;
        }

        const feedUrls = RSS_FEEDS[region] || RSS_FEEDS.india;
        const allNews = [];

        // Fetch from all feeds
        for (const feedUrl of feedUrls) {
            try {
                // Use a CORS proxy for RSS feeds (free, no key needed)
                const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`;
                const response = await fetch(proxyUrl);

                if (!response.ok) {
                    console.warn(`Failed to fetch from ${feedUrl}`);
                    continue;
                }

                const data = await response.json();
                const news = parseRSSFeed(data.contents);
                allNews.push(...news);
            } catch (error) {
                console.error(`Error fetching feed ${feedUrl}:`, error);
            }
        }

        // Sort by date (newest first) and limit to 20 items
        const sortedNews = allNews
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 20);

        // Cache the results
        cacheNews(sortedNews);

        return sortedNews;
    } catch (error) {
        console.error('Error fetching financial news:', error);

        // Return cached data even if expired
        const cached = getCachedNews();
        if (cached) {
            console.warn('Using expired cache due to error');
            return cached;
        }

        return [];
    }
}

/**
 * Get market summary (mock data for now, can be enhanced with real API)
 * @returns {Promise<object>} - Market summary
 */
export async function getMarketSummary() {
    // This is a placeholder. In production, you'd fetch from a real API
    // Free options: Alpha Vantage, IEX Cloud (limited free tier)
    return {
        nifty50: {
            value: 19500,
            change: +125,
            changePercent: +0.64
        },
        sensex: {
            value: 65000,
            change: +350,
            changePercent: +0.54
        },
        dowJones: {
            value: 34000,
            change: -100,
            changePercent: -0.29
        }
    };
}

/**
 * Clear news cache
 */
export function clearNewsCache() {
    localStorage.removeItem(CACHE_KEY);
}

/**
 * Get cache age in milliseconds
 * @returns {number|null} - Age in ms or null if no cache
 */
export function getNewsCacheAge() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;

        const { timestamp } = JSON.parse(cached);
        return Date.now() - timestamp;
    } catch (error) {
        return null;
    }
}

export default {
    getFinancialNews,
    getMarketSummary,
    clearNewsCache,
    getNewsCacheAge
};
