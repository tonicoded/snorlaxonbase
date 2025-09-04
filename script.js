// Contract address
const CONTRACT_ADDRESS = "0xbeE22dE8eD9D087DFd8EcD49a1d332C82a946a91";

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Copy contract address function
function copyContract() {
    navigator.clipboard.writeText(CONTRACT_ADDRESS).then(() => {
        const btn = document.querySelector('.copy-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.style.background = '#22c55e';
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
        }, 2000);
    });
}

// Format number with appropriate suffixes
function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '--';
    
    if (num >= 1e9) {
        return (num / 1e9).toFixed(2) + 'B';
    } else if (num >= 1e6) {
        return (num / 1e6).toFixed(2) + 'M';
    } else if (num >= 1e3) {
        return (num / 1e3).toFixed(2) + 'K';
    } else if (num < 1) {
        return num.toExponential(2);
    } else {
        return num.toFixed(2);
    }
}

// Format price
function formatPrice(price) {
    if (price === null || price === undefined || isNaN(price)) return '--';
    
    if (price < 0.000001) {
        return price.toExponential(2);
    } else if (price < 0.01) {
        return price.toFixed(6);
    } else if (price < 1) {
        return price.toFixed(4);
    } else {
        return price.toFixed(2);
    }
}

// Fetch data from DexScreener API
async function fetchTokenData() {
    try {
        // Use the search endpoint which works better for this token
        const response = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${CONTRACT_ADDRESS}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API Response:', data);
        
        if (data.pairs && data.pairs.length > 0) {
            // Find Base chain pairs with our token address
            const tokenPairs = data.pairs.filter(pair => 
                pair.chainId === 'base' && 
                (pair.pairAddress?.toLowerCase() === CONTRACT_ADDRESS.toLowerCase() ||
                 pair.baseToken?.address?.toLowerCase() === CONTRACT_ADDRESS.toLowerCase())
            );
            
            if (tokenPairs.length > 0) {
                // Get the pair with highest liquidity
                const mainPair = tokenPairs.reduce((prev, current) => 
                    (prev.liquidity?.usd || 0) > (current.liquidity?.usd || 0) ? prev : current
                );
                updateTokenData(mainPair);
                console.log('✅ Successfully loaded token data from search API');
            } else {
                console.log('No matching pairs found, trying fallback...');
                await fetchTokenDataFallback();
            }
        } else {
            console.log('No pairs in search results, trying fallback...');
            await fetchTokenDataFallback();
        }
    } catch (error) {
        console.error('Error fetching token data:', error);
        await fetchTokenDataFallback();
    }
}

// Fallback to try tokens endpoint
async function fetchTokenDataFallback() {
    try {
        const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${CONTRACT_ADDRESS}`);
        const data = await response.json();
        
        if (data.pairs && data.pairs.length > 0) {
            const basePairs = data.pairs.filter(pair => pair.chainId === 'base');
            const mainPair = basePairs.length > 0 ? 
                basePairs.reduce((prev, current) => (prev.liquidity?.usd || 0) > (current.liquidity?.usd || 0) ? prev : current) :
                data.pairs[0];
            updateTokenData(mainPair);
        } else {
            showChartDataMessage();
        }
    } catch (error) {
        console.error('Fallback API also failed:', error);
        showChartDataMessage();
    }
}


// Show message directing users to chart for data
function showChartDataMessage() {
    document.getElementById('currentPrice').textContent = 'View Chart';
    document.getElementById('priceChangePercent').textContent = 'Live';
    document.getElementById('marketCap').textContent = 'View Chart';
    document.getElementById('volume24h').textContent = 'View Chart'; 
    document.getElementById('liquidity').textContent = 'View Chart';
    
    // Style the elements to look clickable
    const priceChange = document.getElementById('priceChange');
    priceChange.className = 'price-change positive';
    
    // Make stats clickable to go to chart
    const statItems = document.querySelectorAll('.stat-item, .price-display');
    statItems.forEach(item => {
        item.style.cursor = 'pointer';
        item.style.transition = 'transform 0.2s ease';
        item.addEventListener('click', () => {
            document.getElementById('chart').scrollIntoView({ behavior: 'smooth' });
        });
        item.addEventListener('mouseenter', () => {
            item.style.transform = 'translateY(-2px)';
        });
        item.addEventListener('mouseleave', () => {
            item.style.transform = 'translateY(0)';
        });
    });
}

// Try to extract data from the embed or use fallback
function tryExtractDataFromEmbed() {
    // Since we can't access iframe data due to CORS, let's show a message
    // and update with some placeholder data to show the UI works
    console.log('Using embedded chart for data - API access limited');
    
    // Show that data is available in the embed
    document.getElementById('currentPrice').textContent = 'See Chart →';
    document.getElementById('priceChangePercent').textContent = 'Live Data';
    document.getElementById('marketCap').textContent = 'See Chart →';
    document.getElementById('volume24h').textContent = 'See Chart →';
    document.getElementById('liquidity').textContent = 'See Chart →';
    document.getElementById('holders').textContent = 'See Chart →';
    
    // Add click handlers to stats that point to the chart
    const statItems = document.querySelectorAll('.stat-item, .price-display');
    statItems.forEach(item => {
        item.style.cursor = 'pointer';
        item.addEventListener('click', () => {
            document.getElementById('chart').scrollIntoView({ behavior: 'smooth' });
        });
    });
}

// Update DOM with token data
function updateTokenData(pairData) {
    console.log('Updating UI with pair data:', pairData);
    
    // Price
    const priceElement = document.getElementById('currentPrice');
    const price = parseFloat(pairData.priceUsd);
    if (price && !isNaN(price)) {
        priceElement.textContent = '$' + formatPrice(price);
    } else {
        priceElement.textContent = 'View Chart';
    }
    
    // Price change
    const priceChangeElement = document.getElementById('priceChange');
    const priceChangePercent = document.getElementById('priceChangePercent');
    const change24h = parseFloat(pairData.priceChange?.h24 || 0);
    
    if (!isNaN(change24h)) {
        priceChangePercent.textContent = `${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}%`;
        priceChangeElement.className = `price-change ${change24h >= 0 ? 'positive' : 'negative'}`;
    } else {
        priceChangePercent.textContent = 'Live';
        priceChangeElement.className = 'price-change positive';
    }
    
    // Market Cap (FDV - Fully Diluted Valuation)
    const marketCapElement = document.getElementById('marketCap');
    const fdv = pairData.fdv || pairData.marketCap;
    marketCapElement.textContent = fdv ? '$' + formatNumber(fdv) : 'View Chart';
    
    // 24h Volume
    const volumeElement = document.getElementById('volume24h');
    const volume24h = pairData.volume?.h24;
    volumeElement.textContent = volume24h ? '$' + formatNumber(volume24h) : 'View Chart';
    
    // Liquidity
    const liquidityElement = document.getElementById('liquidity');
    const liquidity = pairData.liquidity?.usd;
    liquidityElement.textContent = liquidity ? '$' + formatNumber(liquidity) : 'View Chart';
    
    
    // Add success message
    console.log('✅ Token data updated successfully');
}

// Fallback data if API fails
function updateTokenDataFallback() {
    document.getElementById('currentPrice').textContent = 'API Error';
    document.getElementById('priceChangePercent').textContent = '--';
    document.getElementById('marketCap').textContent = '--';
    document.getElementById('volume24h').textContent = '--';
    document.getElementById('liquidity').textContent = '--';
    document.getElementById('holders').textContent = '--';
}

// Simple hover effect for Snorlax image
const snorlaxImg = document.querySelector('.snorlax-img');
if (snorlaxImg) {
    snorlaxImg.addEventListener('click', () => {
        snorlaxImg.style.transform = 'scale(0.95)';
        setTimeout(() => {
            snorlaxImg.style.transform = '';
        }, 150);
        
        // Add a subtle sleep effect
        const sleepIndicator = document.querySelector('.sleep-indicator');
        if (sleepIndicator) {
            sleepIndicator.style.animation = 'none';
            sleepIndicator.offsetHeight; // Trigger reflow
            sleepIndicator.style.animation = 'float 1s ease-in-out 3';
        }
    });
}

// Initialize data fetching
document.addEventListener('DOMContentLoaded', () => {
    // Try to fetch data, but don't worry if it fails - chart has all the data
    fetchTokenData();
    
    // Don't auto-refresh as often to avoid rate limiting
    setInterval(fetchTokenData, 60000); // Every minute instead
});

// Add some Pokemon-style interactions
document.addEventListener('keydown', (e) => {
    // Easter egg: Press 'S' for sleep mode
    if (e.key.toLowerCase() === 's') {
        const body = document.body;
        body.style.transition = 'filter 0.5s ease';
        body.style.filter = 'brightness(0.5) saturate(0.8)';
        
        setTimeout(() => {
            body.style.filter = '';
        }, 2000);
    }
});