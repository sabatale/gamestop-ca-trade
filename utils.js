export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function getRandomDelay(min, max) {
    return Math.random() * (max - min) + min;
}

export function generateHeaders(type = 'json') {
    const commonHeaders = {
        "accept-language": "en-CA,en;q=0.9,fr;q=0.8,en-US;q=0.7",
        "cache-control": "no-cache",
        "pragma": "no-cache",
        "priority": "u=1, i",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin"
    };

    if (type === 'json') {
        return {
            ...commonHeaders,
            "accept": "application/json, text/javascript, */*; q=0.01",
            "x-requested-with": "XMLHttpRequest"
        };
    } else if (type === 'html') {
        return {
            ...commonHeaders,
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "upgrade-insecure-requests": "1"
        };
    } else {
        return {
            ...commonHeaders,
            "accept": "*/*"
        };
    }
}