# GameStop Trade Values

This repository fetches trade values/promotions from GameStop Canada and saves them in JSON format.

The files are available in the `./data` directory, and are cached on [jsDelivr CDN](https://cdn.jsdelivr.net/gh/sabatale/gamestop-ca-trade@main/data/trade_values_latest.min.json).

## Installation

```bash
npm install gamestop-ca-trade
```

## Usage

### Fetch/Save Trade Values & Promotions

```bash
npm run fetch
```

or

```javascript
import { fetchData, saveData, fetchAndSavePromotions } from 'gamestop-ca-trade';

(async () => {
    const data = await fetchData();
    await saveData(data);
    await fetchAndSavePromotions();
})();
```

### Fetch Trade Values

```javascript
import { fetchData } from 'gamestop-ca-trade';

(async () => {
    const data = await fetchData();
    console.log(data);
})();
```

### Fetch Promotions

```javascript
import { fetchPromotions } from 'gamestop-ca-trade';

(async () => {
    const promotions = await fetchPromotions();
    console.log(promotions);
})();
```

### Search Trade Values

```javascript
import { fetchData, searchData } from 'gamestop-ca-trade';

(async () => {
    const data = await fetchData();
    const results = searchData(data, 'Mario');
    console.log(results);
})();
```

### Filter Trade Values

```javascript
import { fetchData, filterData } from 'gamestop-ca-trade';

// Nintendo Switch games $30-35
(async () => {
    const data = await fetchData();
    const results = filterData(data, 'Nintendo Switch', 30, 35);
    console.log(results);
})();
```

### Search Product ID

```javascript
import { getSkuDetails } from 'gamestop-ca-trade';

(async () => {
    const details = await searchProductId('729016');
    console.log(details);
})();
```

## Tests

```bash
npm run test
```