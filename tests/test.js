import fs from 'fs';
import path from 'path';
import { fetchData, saveData, fetchPromotions, searchData, filterData, searchProductId } from '../index.js';

async function test() {
    var totalTests = 6;
    var successfulTests = 0;
    const testResults = [];

    async function runTest(testName, testFunction) {
        const startTime = Date.now();
        try {
            await testFunction();
            const endTime = Date.now();
            const processingTimeMs = endTime - startTime;
            let processingTime;
            if (processingTimeMs < 1000) {
                processingTime = "1s";
            } else if (processingTimeMs >= 60000) {
                processingTime = (processingTimeMs / 60000).toFixed(2) + "m";
            } else {
                processingTime = (processingTimeMs / 1000).toFixed(2) + "s";
            }
            testResults.push({ testName, status: 'Passed', processingTimeMs, processingTime });
            successfulTests++;
        } catch (error) {
            const endTime = Date.now();
            const processingTimeMs = endTime - startTime;
            let processingTime;
            if (processingTimeMs < 1000) {
                processingTime = "1s";
            } else if (processingTimeMs >= 60000) {
                processingTime = (processingTimeMs / 60000).toFixed(2) + "m";
            } else {
                processingTime = (processingTimeMs / 1000).toFixed(2) + "s";
            }
            testResults.push({ testName, status: 'Failed', processingTimeMs, processingTime });
            console.error(`Error during ${testName}:`, error);
        }
    }

    try {
        const folderPath = path.join(path.resolve(), 'data');

        await runTest('Initial clean-up', async () => {
            if (fs.existsSync(folderPath)) {
                const files = fs.readdirSync(folderPath);
                for (const file of files) {
                    if (!file.includes('_latest') && !file.includes('_2025-01-14')) {
                        fs.unlinkSync(path.join(folderPath, file));
                    }
                }
                console.log('Clean-up is done.');
            }
        });

        var tradeData = null;
        await runTest('Fetch and Save Trade Values Data', async () => {
            // Optional arguments: forced = number, forcedGap = number, maximum = number
            // Careful with overlaps!
            tradeData = await fetchData(3);
            if (tradeData && tradeData.length > 0) {
                await saveData(tradeData, 'trade_values');
            }
        });

        await runTest('Fetch and Save Promotions Data', async () => {
            const promotionsData = await fetchPromotions();
            if (promotionsData && promotionsData.length > 0) {
                await saveData(promotionsData, 'promotions');
            }
        });

        console.log('Data fetched and saved successfully.');

        await runTest('Test searchData', async () => {
            const searchResults = searchData(tradeData, 'Pokemon');
            if (searchResults && searchResults.length > 0) {
                console.log('Search Results:', searchResults);
            }
        });

        await runTest('Test filterData', async () => {
            const filterResults = filterData(tradeData, 'Nintendo Switch', 30, 70);
            if (filterResults && filterResults.length > 0) {
                console.log('Filter Results:', filterResults);
            }
        });

        await runTest('Test searchProductId', async () => {
            const skuDetails = await searchProductId('729016');
            if (skuDetails) {
                console.log('SKU Details:', skuDetails);
            }
        });

        // Final log to indicate the number of successful tests
        console.log(`Number of successful tests: ${successfulTests}/${totalTests}`);

        // Log the test results table
        console.table(testResults);
    } catch (error) {
        console.error('Error during test:', error);
    }
}

test();