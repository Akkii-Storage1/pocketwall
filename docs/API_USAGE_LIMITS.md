# PocketWall - API Usage Documentation

## Complete API List with Limits & User Capacity

---

## 1. CoinGecko API (Cryptocurrency Data)
**URL:** `https://api.coingecko.com/api/v3/`

| Feature | Endpoint | Usage |
|---------|----------|-------|
| Crypto Prices | `/simple/price` | Live prices, 24h change |
| Market Data | `/coins/markets` | Top coins by market cap |
| Chart Data | `/coins/{id}/market_chart` | Historical prices |
| Search | `/search` | Find cryptocurrencies |

### Limits (Free Tier - No API Key):
- **Rate Limit:** 10-30 calls/minute (varies)
- **Monthly:** ~10,000 calls/month (soft limit)
- **IP Based:** Each user's device has separate limit

### User Capacity Estimate:
| Users | Calls/User/Day | Total/Month | Status |
|-------|---------------|-------------|--------|
| 100 | 50 | 150,000 | ⚠️ May hit limits |
| 500 | 50 | 750,000 | ❌ Will be rate limited |
| 1000+ | Any | - | ❌ Need Pro API ($129/mo) |

### Recommendation:
- **<100 users:** Free tier works fine
- **100-1000 users:** Get CoinGecko Pro ($129/month)
- **1000+ users:** CoinGecko Enterprise or use backend proxy with caching

---

## 2. ExchangeRate-API (Forex/Currency Rates)
**URL:** `https://api.exchangerate-api.com/v4/latest/`

| Feature | Usage |
|---------|-------|
| Currency Rates | Live exchange rates |
| Base Currency | INR, USD, EUR, etc. |

### Limits (Free Tier - No API Key):
- **Rate Limit:** 1,500 requests/month
- **No daily limit** specified
- **IP Based**

### User Capacity Estimate:
| Users | Calls/User/Day | Total/Month | Status |
|-------|---------------|-------------|--------|
| 10 | 5 | 1,500 | ✅ OK |
| 50 | 5 | 7,500 | ❌ Exceeds limit |
| 100+ | Any | - | ❌ Need paid plan |

### Recommendation:
- **<50 users:** Free tier with aggressive caching
- **50+ users:** Get API key ($9/mo unlimited) or use Open Exchange Rates

### Alternative APIs:
- **Open Exchange Rates:** 1,000 free/month, $12/mo for 10,000
- **Fixer.io:** 100/month free, €9.99/mo for 10,000

---

## 3. MFAPI.in (Indian Mutual Funds)
**URL:** `https://api.mfapi.in/mf/`

| Feature | Endpoint | Usage |
|---------|----------|-------|
| All Schemes | `/mf` | List all mutual funds |
| NAV Data | `/mf/{scheme_code}` | Latest NAV & history |

### Limits:
- **FREE & UNLIMITED** 🎉
- No API key required
- No rate limits documented
- Community maintained

### User Capacity:
| Users | Status |
|-------|--------|
| Unlimited | ✅ No restrictions |

### Note:
- Data may be delayed by 1 day
- For real-time NAV, consider AMFI direct or paid APIs

---

## 4. TradingView Widget (Charts)
**URL:** `https://s.tradingview.com/widgetembed/`

| Feature | Usage |
|---------|-------|
| Interactive Charts | Full charting with tools |
| 100+ Indicators | RSI, MACD, etc. |
| Drawing Tools | Trendlines, Fibonacci |

### Limits:
- **FREE for embedding** 🎉
- No API key required
- No usage limits for widget embed
- Data comes from TradingView's servers

### User Capacity:
| Users | Status |
|-------|--------|
| Unlimited | ✅ No restrictions |

### Terms:
- Must show "Powered by TradingView" attribution
- Non-commercial use is free
- Commercial use may require license

---

## 5. Firebase (Authentication & Database)
**Your Firebase Project**

| Service | Usage |
|---------|-------|
| Authentication | User login/signup |
| Firestore | User data storage |
| Realtime DB | Live sync |

### Limits (Spark Plan - Free):
| Feature | Limit/Month |
|---------|-------------|
| Auth Users | 50,000 MAU |
| Firestore Reads | 50,000/day |
| Firestore Writes | 20,000/day |
| Storage | 1 GB |

### User Capacity Estimate:
| MAU | Daily Active | Reads/User | Status |
|-----|--------------|------------|--------|
| 100 | 30 | 100 | ✅ OK |
| 1,000 | 300 | 100 | ✅ OK |
| 5,000 | 1,500 | 33 | ⚠️ Tight |
| 10,000+ | - | - | ❌ Need Blaze plan |

### Recommendation:
- **<1,000 MAU:** Free Spark plan
- **1,000-10,000 MAU:** Blaze plan (~$25-100/mo)
- **10,000+ MAU:** Blaze with budget alerts

---

## Summary: Maximum Users Without Issues

| Tier | Expected Users | Monthly Cost | Bottleneck |
|------|---------------|--------------|------------|
| **Free** | **~50-100 users** | $0 | ExchangeRate API |
| **Basic Paid** | **500-1,000 users** | ~$50/mo | CoinGecko |
| **Growth** | **1,000-10,000 users** | ~$200/mo | Firebase + APIs |
| **Scale** | **10,000+ users** | ~$500+/mo | Need backend |

---

## Recommended Actions by User Count

### <100 Users (FREE):
✅ Use all free tiers
✅ Add aggressive caching (5-10 min for prices)
✅ Limit auto-refresh frequency

### 100-500 Users (~$30/mo):
- [ ] ExchangeRate-API key ($9/mo)
- [ ] Increase cache duration
- [ ] Monitor CoinGecko usage

### 500-2,000 Users (~$150/mo):
- [ ] CoinGecko Pro API ($129/mo)
- [ ] Firebase Blaze plan
- [ ] Backend proxy for API calls

### 2,000+ Users:
- [ ] Build backend API service
- [ ] Use Redis for caching
- [ ] Enterprise API agreements

---

## API Health Check Endpoints

```javascript
// Test all APIs
const APIs = {
  CoinGecko: 'https://api.coingecko.com/api/v3/ping',
  ExchangeRate: 'https://api.exchangerate-api.com/v4/latest/USD',
  MFAPI: 'https://api.mfapi.in/mf/119551',
  TradingView: 'https://s.tradingview.com/widgetembed/'
};
```

---

## Current Implementation Status

| API | Caching | Error Handling | Fallback |
|-----|---------|----------------|----------|
| CoinGecko | ✅ 30s | ✅ Yes | ❌ No |
| ExchangeRate | ✅ 60s | ✅ Yes | ⚠️ Mock |
| MFAPI | ⚠️ None | ✅ Yes | ⚠️ Mock |
| TradingView | N/A | ✅ Yes | ❌ No |

---

*Last Updated: December 2024*
