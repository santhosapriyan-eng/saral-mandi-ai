// Configuration
const API_BASE_URL = 'http://127.0.0.1:8000';
let selectedCrop = null;
let priceChart = null;
let map = null;
let markers = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    checkBackendHealth();
    loadCrops();
    setupEventListeners();
});

// Check if backend is running
async function checkBackendHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (response.ok) {
            console.log('Backend is running');
        } else {
            showError('Backend server is not responding properly');
        }
    } catch (error) {
        showError('Cannot connect to backend. Make sure FastAPI server is running on http://127.0.0.1:8000');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Analyze button
    document.getElementById('analyzeBtn').addEventListener('click', () => {
        if (selectedCrop) {
            fetchRecommendation();
        } else {
            showError('Please select a crop first');
        }
    });

    // Quantity input enter key
    document.getElementById('quantity').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && selectedCrop) {
            fetchRecommendation();
        }
    });

    // High contrast toggle
    document.getElementById('highContrastToggle').addEventListener('click', toggleHighContrast);

    // Play voice button
    document.getElementById('playVoiceBtn').addEventListener('click', playVoiceAdvisory);
}

// Load crops from backend
async function loadCrops() {
    showLoading();
    hideError();
    
    try {
        const response = await fetch(`${API_BASE_URL}/crops`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const crops = await response.json();
        
        if (crops && crops.length > 0) {
            displayCrops(crops);
        } else {
            // Fallback crops if backend returns empty
            displayCrops([
                {"name": "Tomato", "emoji": "🍅"},
                {"name": "Onion", "emoji": "🧅"},
                {"name": "Potato", "emoji": "🥔"},
                {"name": "Wheat", "emoji": "🌾"},
                {"name": "Rice", "emoji": "🍚"},
                {"name": "Corn", "emoji": "🌽"}
            ]);
        }
        
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Error loading crops:', error);
        
        // Show fallback crops
        displayCrops([
            {"name": "Tomato", "emoji": "🍅"},
            {"name": "Onion", "emoji": "🧅"},
            {"name": "Potato", "emoji": "🥔"},
            {"name": "Wheat", "emoji": "🌾"},
            {"name": "Rice", "emoji": "🍚"},
            {"name": "Corn", "emoji": "🌽"}
        ]);
        
        showError('Using sample data. Backend connection issue detected.');
    }
}

// Display crops in grid
function displayCrops(crops) {
    const cropGrid = document.getElementById('cropGrid');
    cropGrid.innerHTML = '';
    
    crops.forEach(crop => {
        const cropCard = document.createElement('div');
        cropCard.className = 'crop-card';
        cropCard.setAttribute('role', 'button');
        cropCard.setAttribute('tabindex', '0');
        cropCard.setAttribute('aria-label', `Select ${crop.name}`);
        
        cropCard.innerHTML = `
            <div class="crop-emoji">${crop.emoji}</div>
            <div>${crop.name}</div>
        `;
        
        cropCard.addEventListener('click', () => selectCrop(crop.name, cropCard));
        cropCard.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectCrop(crop.name, cropCard);
            }
        });
        
        cropGrid.appendChild(cropCard);
    });
}

// Select a crop
function selectCrop(cropName, element) {
    // Remove previous selection
    document.querySelectorAll('.crop-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Add selection to current crop
    element.classList.add('selected');
    selectedCrop = cropName;
    
    // Optional: Auto-fetch if quantity is valid
    const quantity = document.getElementById('quantity').value;
    if (quantity && parseInt(quantity) > 0) {
        fetchRecommendation();
    }
}

// Fetch recommendation from backend
async function fetchRecommendation() {
    const quantity = document.getElementById('quantity').value;
    
    if (!quantity || parseInt(quantity) <= 0) {
        showError('Please enter a valid quantity (minimum 1 kg)');
        return;
    }
    
    if (!selectedCrop) {
        showError('Please select a crop first');
        return;
    }
    
    showLoading();
    hideError();
    
    try {
        const url = `${API_BASE_URL}/recommend?crop=${encodeURIComponent(selectedCrop)}&quantity=${encodeURIComponent(quantity)}`;
        console.log('Fetching:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Server error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Received data:', data);
        
        displayDashboard(data);
        hideLoading();
        
    } catch (error) {
        hideLoading();
        console.error('Error fetching recommendation:', error);
        showError(`Failed to get recommendation: ${error.message}. Using sample data.`);
        
        // Show sample data for demonstration
        displaySampleData(selectedCrop, quantity);
    }
}

// Display sample data when backend fails
function displaySampleData(crop, quantity) {
    const sampleData = {
        "best_market": {
            "market": "Coimbatore",
            "predicted_price": 26.50,
            "transport_cost": 0,
            "net_profit": parseFloat(quantity) * 26.50
        },
        "risk": "Medium Risk (Moderate Fluctuation)",
        "stability_score": 75.5,
        "decision": "SELL NOW (Favorable Market)",
        "arbitrage_gap": 1500,
        "ai_advisory": `Nalla market Coimbatore. Unga ${quantity} kg ${crop} ku nalla price kedaikkum. Transport cost kammi. Risk medium tha but profit nalla irukku.`,
        "all_markets": [
            {
                "market": "Coimbatore",
                "predicted_price": 26.50,
                "transport_cost": 0,
                "net_profit": parseFloat(quantity) * 26.50
            },
            {
                "market": "Erode",
                "predicted_price": 24.00,
                "transport_cost": 1000,
                "net_profit": (parseFloat(quantity) * 24.00) - 1000
            },
            {
                "market": "Salem",
                "predicted_price": 23.00,
                "transport_cost": 1200,
                "net_profit": (parseFloat(quantity) * 23.00) - 1200
            }
        ]
    };
    
    displayDashboard(sampleData);
}

// Display dashboard with data
function displayDashboard(data) {
    // Show dashboard
    const dashboard = document.getElementById('dashboard');
    dashboard.classList.remove('hidden');
    
    // Update best market card
    document.getElementById('bestMarketName').textContent = data.best_market.market;
    document.getElementById('netProfit').textContent = `₹${Math.round(data.best_market.net_profit)}`;
    
    // Update risk level
    const riskElement = document.getElementById('riskLevel');
    riskElement.textContent = data.risk;
    riskElement.className = 'risk-badge';
    
    if (data.risk.includes('Low')) {
        riskElement.classList.add('low');
    } else if (data.risk.includes('Medium')) {
        riskElement.classList.add('medium');
    } else {
        riskElement.classList.add('high');
    }
    
    // Update stability score
    const stabilityScore = data.stability_score || 75;
    document.getElementById('stabilityBar').style.width = `${stabilityScore}%`;
    document.getElementById('stabilityBar').textContent = `${Math.round(stabilityScore)}%`;
    document.getElementById('stabilityScore').textContent = stabilityScore;
    
    // Update decision
    document.getElementById('decision').textContent = data.decision || 'SELL NOW';
    
    // Update profit comparison
    updateProfitComparison(data);
    
    // Update AI advisory
    document.getElementById('aiAdvisory').textContent = data.ai_advisory || 'No advisory available';
    
    // Render chart and map
    renderChart(data);
    renderMap(data);
    
    // Scroll to dashboard
    dashboard.scrollIntoView({ behavior: 'smooth' });
}

// Update profit comparison bars
function updateProfitComparison(data) {
    if (!data.all_markets || data.all_markets.length === 0) return;
    
    // Find local market (Coimbatore) and recommended market
    const localMarket = data.all_markets.find(m => m.market === 'Coimbatore') || data.all_markets[0];
    const recommendedMarket = data.best_market;
    
    // Calculate percentages for visualization
    const maxProfit = Math.max(...data.all_markets.map(m => m.net_profit));
    const localPercent = maxProfit > 0 ? (localMarket.net_profit / maxProfit) * 100 : 0;
    const recommendedPercent = maxProfit > 0 ? (recommendedMarket.net_profit / maxProfit) * 100 : 0;
    
    document.getElementById('localProfitBar').style.width = `${localPercent}%`;
    document.getElementById('localProfitBar').textContent = `₹${Math.round(localMarket.net_profit)}`;
    
    document.getElementById('recommendedProfitBar').style.width = `${recommendedPercent}%`;
    document.getElementById('recommendedProfitBar').textContent = `₹${Math.round(recommendedMarket.net_profit)}`;
}

// Render price trend chart
function renderChart(data) {
    const ctx = document.getElementById('priceChart').getContext('2d');
    
    // Generate 7 days of sample data based on actual prices
    const labels = [];
    const prices = [];
    const today = new Date();
    
    const basePrice = data.best_market?.predicted_price || 25;
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en-IN', { weekday: 'short' }));
        
        // Generate realistic price variation
        const variation = (Math.random() - 0.5) * 8;
        prices.push(Math.max(10, basePrice + variation));
    }
    
    // Destroy existing chart if it exists
    if (priceChart) {
        priceChart.destroy();
    }
    
    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Price (₹/kg)',
                data: prices,
                borderColor: '#2e7d32',
                backgroundColor: 'rgba(46, 125, 50, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#2e7d32',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `₹${context.raw.toFixed(2)}/kg`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return '₹' + value;
                        }
                    }
                }
            }
        }
    });
}

// Render map with mandi locations
function renderMap(data) {
    // Initialize map if not exists
    if (!map) {
        map = L.map('map').setView([11.0168, 76.9558], 8);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
    }
    
    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    // Coordinates for mandis
    const coordinates = {
        'Coimbatore': [11.0168, 76.9558],
        'Erode': [11.3410, 77.7172],
        'Salem': [11.6643, 78.1460]
    };
    
    // Add markers for each market
    if (data.all_markets) {
        data.all_markets.forEach(market => {
            const coord = coordinates[market.market] || [11.0168, 76.9558];
            
            // Determine marker color
            const isRecommended = market.market === data.best_market?.market;
            const markerColor = isRecommended ? 'green' : 'red';
            
            // Create custom icon
            const icon = L.divIcon({
                className: 'custom-marker',
                html: `<div style="background-color: ${markerColor}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
                iconSize: [26, 26],
                iconAnchor: [13, 13]
            });
            
            // Create marker
            const marker = L.marker(coord, { icon }).addTo(map);
            
            // Add popup
            marker.bindPopup(`
                <b>${market.market}</b><br>
                Predicted Price: ₹${market.predicted_price}/kg<br>
                Net Profit: ₹${Math.round(market.net_profit)}<br>
                ${isRecommended ? '✅ Recommended' : ''}
            `);
            
            markers.push(marker);
        });
    }
    
    // Fit map to show all markers
    if (markers.length > 0) {
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.2));
    }
}

// Play voice advisory
async function playVoiceAdvisory() {
    const button = document.getElementById('playVoiceBtn');
    const audioElement = document.getElementById('voiceAudio');
    
    try {
        button.disabled = true;
        button.textContent = '⏳ Generating Voice...';
        button.classList.add('playing');
        
        // Get current crop and quantity
        const crop = selectedCrop || 'Tomato';
        const quantity = document.getElementById('quantity').value || 500;
        
        // Fetch voice advisory
        const response = await fetch(`${API_BASE_URL}/voice?crop=${encodeURIComponent(crop)}&quantity=${quantity}`);
        
        if (!response.ok) {
            throw new Error('Failed to generate voice');
        }
        
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Setup audio element
        audioElement.src = audioUrl;
        audioElement.style.display = 'block';
        
        // Play audio
        await audioElement.play();
        
        button.textContent = '🔊 Playing...';
        
        // Reset button when audio ends
        audioElement.onended = () => {
            button.textContent = '🔊 Play Voice Advisory';
            button.disabled = false;
            button.classList.remove('playing');
            URL.revokeObjectURL(audioUrl);
        };
        
    } catch (error) {
        console.error('Voice error:', error);
        button.textContent = '🔊 Play Voice Advisory';
        button.disabled = false;
        button.classList.remove('playing');
        
        // Show text-to-speech fallback
        const advisoryText = document.getElementById('aiAdvisory').textContent;
        if (advisoryText && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(advisoryText);
            utterance.lang = 'ta-IN';
            window.speechSynthesis.speak(utterance);
            showError('Playing text-to-speech as fallback');
        } else {
            showError('Voice feature unavailable. Read advisory text below.');
        }
    }
}

// Toggle high contrast mode
function toggleHighContrast() {
    document.body.classList.toggle('high-contrast');
    const button = document.getElementById('highContrastToggle');
    button.textContent = document.body.classList.contains('high-contrast') ? '☀️ Normal Mode' : '🌓 High Contrast';
}

// Utility functions
function showLoading() {
    document.getElementById('loadingSpinner').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingSpinner').classList.add('hidden');
}

function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        errorElement.classList.add('hidden');
    }, 5000);
}

function hideError() {
    document.getElementById('errorMessage').classList.add('hidden');
}