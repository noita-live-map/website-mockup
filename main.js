// Map viewer state
let scale = 1;
let translateX = 0;
let translateY = 0;
let isDragging = false;
let startX, startY;
let imageLoaded = false;
const REFRESH_TIMEOUT_MS = 5000;
// doesn't work :( TODO: TEST ME! default game_id is 12345678; tries to get it from query params
let GAME_ID = 'cb9c1a5b6910fb2f';

// DOM elements
const mapContainer = document.getElementById('mapContainer');
const mapWrapper = document.getElementById('mapWrapper');
const mapImage = document.getElementById('mapImage');
const bossOverlay = document.getElementById('bossOverlay');
const orbOverlay = document.getElementById('orbOverlay');
const playerOverlay = document.getElementById('playerOverlay');
const zoomLevel = document.getElementById('zoomLevel');

// Marker data - coordinates will be set as percentages (0-1) of image dimensions
// Edit these values to match your actual marker positions
const markers = {
    bosses: [
        { x: 0.48, y: -0.43, name: 'Boss1' },
        { x: 0.55, y: -0.46, name: 'Dragon' },
        { x: 0.52, y: -0.44, name: 'Hacker' },
        { x: 0.58, y: -0.48, name: 'Boss3' }
    ],
    orbs: [
        { x: 0.42, y: -0.45, name: 'Orb 1' },
        { x: 0.46, y: -0.47, name: 'Orb 2' },
        { x: 0.50, y: -0.44, name: 'Orb 3' },
        { x: 0.54, y: -0.49, name: 'Orb 4' },
        { x: 0.58, y: -0.46, name: 'Orb 5' },
        { x: 0.52, y: -0.42, name: 'Orb 6' },
        { x: 0.44, y: -0.48, name: 'Orb 7' }
    ],
    players: [
        { x: 0.58, y: -0.45, name: 'Marker 1' }
    ]
};

// Load map image
function loadMap() {
    console.log('Attempting to load map from map.png');
    mapImage.src = 'map.png';
    mapImage.addEventListener('load', () => {
        console.log('Map loaded successfully:', mapImage.naturalWidth, 'x', mapImage.naturalHeight);
        imageLoaded = true;
        createMarkers();
        centerMap();
        setInterval(async () => {
            // map.src = get new background image from backend
            const camera_pos = await fetch(`http://127.0.0.1:5000/info?game_id=${GAME_ID}`); // TODO: hardcoded local url for now, will update later
            const data = await camera_pos.json();
            console.log("new camera pos: ");
            console.log(data.x, data.y);
            
            // TODO: FINISH THIS WITH THE REAL IMAGE SIZE
            const game_coords_to_image_coords = (game_x, game_y) => {
                const img_x = (game_x + 200) / 400;
                const img_y = (game_y + 200) / 400;
                return [img_x, img_y];
            };

            const player_marker = document.getElementsByClassName('marker player-marker')[0];
            player_marker.style.left = `${data.x}px`;
            player_marker.style.top = `${data.y}px`;

            mapImage.src = `http://127.0.0.1:5000/terrain?game_id=${GAME_ID}&time=${new Date().getTime()}`;

        }, REFRESH_TIMEOUT_MS);
    }, {once: true}); // only trigger once as we don't want to reset the zoom every time the map updates from the server
    mapImage.onerror = (e) => {
        console.error('Failed to load map image from map.png', e);
        alert('Could not load map image.');
    };
}

// Create marker elements
function createMarkers() {
    if (!imageLoaded) return;

    const imgWidth = mapImage.naturalWidth;
    const imgHeight = mapImage.naturalHeight;

    // Clear existing markers
    bossOverlay.innerHTML = '';
    orbOverlay.innerHTML = '';
    playerOverlay.innerHTML = '';

    // Create boss markers
    markers.bosses.forEach(marker => {
        const el = document.createElement('div');
        el.className = 'marker boss-marker';
        el.style.left = `${marker.x * imgWidth}px`;
        el.style.top = `${marker.y * imgHeight}px`;
        
        const label = document.createElement('div');
        label.className = 'marker-label';
        label.textContent = marker.name;
        el.appendChild(label);
        
        bossOverlay.appendChild(el);
    });

    // Create orb markers
    markers.orbs.forEach(marker => {
        const el = document.createElement('div');
        el.className = 'marker orb-marker';
        el.style.left = `${marker.x * imgWidth}px`;
        el.style.top = `${marker.y * imgHeight}px`;
        
        const label = document.createElement('div');
        label.className = 'marker-label';
        label.textContent = marker.name;
        el.appendChild(label);
        
        orbOverlay.appendChild(el);
    });

    // Create player markers
    markers.players.forEach(marker => {
        const el = document.createElement('div');
        el.className = 'marker player-marker';
        el.style.left = `${marker.x * imgWidth}px`;
        el.style.top = `${marker.y * imgHeight}px`;
        
        const label = document.createElement('div');
        label.className = 'marker-label';
        label.textContent = marker.name;
        el.appendChild(label);
        
        playerOverlay.appendChild(el);
    });

    // Set overlay dimensions
    [bossOverlay, orbOverlay, playerOverlay].forEach(overlay => {
        overlay.style.width = `${imgWidth}px`;
        overlay.style.height = `${imgHeight}px`;
    });
}

// Update transform
function updateTransform() {
    mapWrapper.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    zoomLevel.textContent = `${Math.round(scale * 100)}%`;

    // Scale markers inversely so they stay a consistent screen size
    const markerScale = 1 / scale;
    document.querySelectorAll('.marker').forEach(marker => {
        marker.style.transform = `translate(-50%, -50%) scale(${markerScale})`;
    });
}

// Center and fit map
function centerMap() {
    const containerRect = mapContainer.getBoundingClientRect();
    const imgWidth = mapImage.naturalWidth;
    const imgHeight = mapImage.naturalHeight;
    
    // Calculate scale to fit the image in the viewport with some padding
    const scaleX = (containerRect.width * 0.9) / imgWidth;
    const scaleY = (containerRect.height * 0.9) / imgHeight;
    scale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100% initially
    
    // Center the image
    translateX = (containerRect.width - imgWidth * scale) / 2;
    translateY = (containerRect.height - imgHeight * scale) / 2;
    
    updateTransform();
}

// Mouse down
mapContainer.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
    mapContainer.classList.add('grabbing');
});

// Mouse move
mapContainer.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    updateTransform();
});

// Mouse up
document.addEventListener('mouseup', () => {
    isDragging = false;
    mapContainer.classList.remove('grabbing');
});

// Zoom with mouse wheel
mapContainer.addEventListener('wheel', (e) => {
    // e.preventDefault(); // removed in favor of making this a passive event listener; see https://stackoverflow.com/questions/37721782/what-are-passive-event-listeners
    
    const MAX_ZOOM = 50 // n * 100%: 10 => 1000%, 30 => 3000%
    const MIN_ZOOM = 0.05 // 5%
    const delta = e.deltaY > 0 ? 0.95 : 1.05;
    const newScale = Math.min(Math.max(MIN_ZOOM, scale * delta), MAX_ZOOM);
    
    // Zoom towards mouse cursor
    const rect = mapContainer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const scaleChange = newScale / scale;
    translateX = mouseX - (mouseX - translateX) * scaleChange;
    translateY = mouseY - (mouseY - translateY) * scaleChange;
    
    scale = newScale;
    updateTransform();
}, {passive: true});

// Toggle overlays
document.getElementById('toggleBosses').addEventListener('change', (e) => {
    bossOverlay.style.display = e.target.checked ? 'block' : 'none';
});

document.getElementById('toggleOrbs').addEventListener('change', (e) => {
    orbOverlay.style.display = e.target.checked ? 'block' : 'none';
});

document.getElementById('togglePlayers').addEventListener('change', (e) => {
    playerOverlay.style.display = e.target.checked ? 'block' : 'none';
});


// Initialize
loadMap();