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

// marker positions for in-game POIs; these should be in-game coordinates (they're translated later)
const markers = {
    bosses: [
        { x: 2346, y: 7443, name: 'Suomuhauki (Dragon)' },
        { x: 4168, y: 888, name: 'Sauvojen tuntija (Connoisseur of Wands)' },
        { x: -4841, y: 850, name: 'Ylialkemisti (High Alchemist)' },
        { x: 3555, y: 13025, name: 'Veska, Molari, Mokke, Seula (Gate Guardian)' },
        { x: 3555, y: 13025, name: 'Kolmisilmä (Three-Eye)' },
    ],
    orbs: [
        { x: 768, y: -1280, name: 'Orb 0 - Sea of Lava', icon: 'orb_0.png'},
        { x: 3328, y: 1792, name: 'Orb 3 - Nuke', icon: 'orb_3.png'},
        { x: -4352, y: 3840, name: 'Orb 5 - Holy Bomb', icon: 'orb_5.png'},
        { x: -3840, y: 9984, name: 'Orb 6 - Spiral Shot', icon: 'orb_6.png'},
        { x: 4352, y: 768, name: 'Orb 7 - Thundercloud', icon: 'orb_7.png'},
        { x: -256, y: 16128, name: 'Orb 8 - Fireworks!', icon: 'orb_8.png'},
        // other orbs are too far out of the range of our image - so we won't include them here
    ],
    players: [
        { x: 0.0, y: 0.0, name: 'Player' }
    ]
};

function gameCoordsToImageCoords(gameX, gameY) {
    const MAP_X_RANGE = [-4096, 4096];
    const MAP_Y_RANGE = [-2048, 14336];
    return [gameX - MAP_X_RANGE[0], gameY - MAP_Y_RANGE[0]];
}

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
            
            const player_marker = document.getElementsByClassName('marker player-marker')[0];
            const [img_x, img_y] = gameCoordsToImageCoords(data.x, data.y);
            player_marker.style.left = `${img_x}px`;
            player_marker.style.top = `${img_y}px`;

            mapImage.src = `http://127.0.0.1:5000/terrain?game_id=${GAME_ID}&time=${new Date().getTime()}`; // add the date as a cachebreaker

        }, REFRESH_TIMEOUT_MS);
    }, {once: true}); // only trigger once as we don't want to reset the zoom every time the map updates from the server
    mapImage.onerror = (e) => {
        console.error('Failed to load map image from map.png', e);
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
        const [img_x, img_y] = gameCoordsToImageCoords(marker.x, marker.y);
        el.style.left = `${img_x}px`;
        el.style.top = `${img_y}px`;
        
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
        const [img_x, img_y] = gameCoordsToImageCoords(marker.x, marker.y);
        el.style.left = `${img_x}px`;
        el.style.top = `${img_y}px`;

        const img = document.createElement('img');
        img.src = `icons/${marker.icon}`;
        img.alt = marker.name;
        img.draggable = false;
        el.appendChild(img);
        
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
        const [img_x, img_y] = gameCoordsToImageCoords(marker.x, marker.y);
        el.style.left = `${img_x}px`;
        el.style.top = `${img_y}px`;
        
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
}, {passive: true});

// Mouse move
mapContainer.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    updateTransform();
}, {passive: true});

// Mouse up
document.addEventListener('mouseup', () => {
    isDragging = false;
    mapContainer.classList.remove('grabbing');
}, {passive: true});

// Zoom with mouse wheel
mapContainer.addEventListener('wheel', (e) => {
    // e.preventDefault(); // removed in favor of making this a passive event listener; see https://stackoverflow.com/questions/37721782/what-are-passive-event-listeners
    
    const MAX_ZOOM = 20 // n * 100%: 5 => 500%, 20 => 2000%
    const MIN_ZOOM = 0.01 // 1%
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