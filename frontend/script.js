// *** CONFIGURACIÓN DEL MAPA ***
const map = L.map('map').setView([6.1558, -75.3789], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// *** SELECTORES DEL DOM ***
const parkingListElement = document.getElementById('parking-list');
const locationInput = document.getElementById('location-input');
const searchButton = document.getElementById('search-button');
const priceRangeFilter = document.getElementById('price-range');
const servicesFilter = document.getElementById('services-filter');
const availabilityFilter = document.getElementById('availability-filter');
const helpButton = document.getElementById('help-button');
const userMenuButton = document.getElementById('user-menu-button');
const userDropdown = document.getElementById('user-dropdown');

// Selectores para el modal de detalles
const detailsModal = document.getElementById('details-modal');
const modalCloseButton = document.getElementById('modal-close-button');
const modalImg = document.getElementById('modal-img');
const modalName = document.getElementById('modal-name');
const modalAddress = document.getElementById('modal-address');
const modalPrice = document.getElementById('modal-price');
const modalAvailability = document.getElementById('modal-availability');
const modalServices = document.getElementById('modal-services');

let allParkings = [];
let leafletMarkers = [];

// *** FUNCIONES PRINCIPALES ***
async function loadParkings() {
    try {
        const response = await fetch('http://127.0.0.1:5000/api/parqueaderos');
        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }
        const parkings = await response.json();
        // Asegurarnos de que los datos numéricos sean correctos
        allParkings = parkings.map(p => ({
            ...p,
            latitud: parseFloat(p.latitud),
            longitud: parseFloat(p.longitud),
            precio_hora: parseFloat(p.precio_hora),
            cupos_disponibles: parseInt(p.cupos_disponibles, 10)
        }));
        filterAndSearchParkings(); // Llama a filtrar para mostrar el estado inicial
    } catch (error) {
        console.error('Error al cargar parqueaderos:', error);
        parkingListElement.innerHTML = `<p style="text-align: center; color: red;">No se pudieron cargar los parqueaderos. Asegúrate de que el servidor Python (app.py) esté funcionando y que la base de datos sea accesible.</p>`;
    }
}

function displayParkings(parkings) {
    parkingListElement.innerHTML = '';
    if (parkings.length === 0) {
        parkingListElement.innerHTML = '<p>No se encontraron parqueaderos que coincidan con tu búsqueda.</p>';
        return;
    }

    parkings.forEach(parking => {
        const card = document.createElement('div');
        card.classList.add('parking-card');
        card.dataset.id = parking.id;

        // ===== LÓGICA DE VISUALIZACIÓN DE CUPOS (MODIFICADA) =====
        const hasSpots = parking.cupos_disponibles > 0;
        // Ahora muestra el número de cupos o "Lleno" si es 0.
        const availabilityText = hasSpots ? `${parking.cupos_disponibles} cupos disponibles` : 'Lleno';
        const availabilityClass = hasSpots ? 'available' : 'unavailable';

        card.innerHTML = `
            <img src="${parking.imagen}" alt="Imagen de ${parking.nombre}" onerror="this.onerror=null;this.src='https://placehold.co/600x400/EBEBEB/717171?text=Sin+Imagen';">
            <div class="parking-card-info">
                <h3>${parking.nombre}</h3>
                <p>${parking.direccion}</p>
                <p class="price">$${parking.precio_hora?.toLocaleString('es-CO') ?? 'N/A'} / hora</p>
                <p class="status ${availabilityClass}">${availabilityText}</p>
            </div>
        `;
        
        card.addEventListener('click', () => {
            showParkingDetailsModal(parking.id);
            map.flyTo([parking.latitud, parking.longitud], 18);
        });
        
        parkingListElement.appendChild(card);
    });
}

function addParkingMarkersToMap(parkings) {
    leafletMarkers.forEach(marker => marker.remove());
    leafletMarkers = [];

    // Definición de íconos personalizados para Leaflet
    const greenParkingIcon = L.divIcon({
        className: 'parking-marker-green', // Clase para marcador verde
        html: '<div></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        popupAnchor: [0, -10]
    });

    const redParkingIcon = L.divIcon({
        className: 'parking-marker-red', // Clase para marcador rojo
        html: '<div></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        popupAnchor: [0, -10]
    });

    parkings.forEach(parking => {
        if (typeof parking.latitud !== 'number' || typeof parking.longitud !== 'number') {
            console.warn('Parqueadero sin coordenadas válidas:', parking);
            return;
        }

        // Determina qué ícono usar basado en los cupos disponibles
        const markerIcon = parking.cupos_disponibles > 0 ? greenParkingIcon : redParkingIcon;

        const marker = L.marker([parking.latitud, parking.longitud], { icon: markerIcon })
            .addTo(map)
            .bindPopup(`<b>${parking.nombre}</b><br>${parking.direccion}<br>Cupos: ${parking.cupos_disponibles > 0 ? parking.cupos_disponibles : 'Lleno'}`);
        
        leafletMarkers.push(marker);
    });
}

function filterAndSearchParkings() {
    let filteredParkings = [...allParkings];
    const searchTerm = locationInput.value.toLowerCase().trim();
    const selectedPriceRange = priceRangeFilter.value;
    const selectedService = servicesFilter.value;
    const isAvailableChecked = availabilityFilter.checked;

    if (searchTerm) {
        filteredParkings = filteredParkings.filter(p => p.nombre.toLowerCase().includes(searchTerm) || p.direccion.toLowerCase().includes(searchTerm));
    }
    if (selectedPriceRange) {
        filteredParkings = filteredParkings.filter(p => {
            if (!p.precio_hora) return false;
            if (selectedPriceRange === 'low') return p.precio_hora < 3000;
            if (selectedPriceRange === 'medium') return p.precio_hora >= 3000 && p.precio_hora <= 5000;
            if (selectedPriceRange === 'high') return p.precio_hora > 5000;
            return true;
        });
    }
    if (selectedService) {
        filteredParkings = filteredParkings.filter(p => p.servicios && Array.isArray(p.servicios) && p.servicios.includes(selectedService));
    }
    // Lógica de disponibilidad actualizada para usar 'cupos_disponibles'
    if (isAvailableChecked) {
        filteredParkings = filteredParkings.filter(p => p.cupos_disponibles > 0);
    }

    displayParkings(filteredParkings);
    addParkingMarkersToMap(filteredParkings);
}

function showParkingDetailsModal(parkingId) {
    const parking = allParkings.find(p => p.id === parkingId);
    if (!parking) return;

    modalImg.src = parking.imagen;
    modalImg.onerror = () => { modalImg.src = 'https://placehold.co/600x400/EBEBEB/717171?text=Sin+Imagen'; };
    modalName.textContent = parking.nombre;
    modalAddress.textContent = parking.direccion;
    modalPrice.textContent = `$${parking.precio_hora?.toLocaleString('es-CO') ?? 'N/A'}`;

    // Lógica para el modal
    const hasSpots = parking.cupos_disponibles > 0;
    modalAvailability.textContent = hasSpots ? `${parking.cupos_disponibles} cupos` : 'Lleno';
    modalAvailability.className = `status ${hasSpots ? 'available' : 'unavailable'}`;

    modalServices.innerHTML = '';
    if (parking.servicios && parking.servicios.length > 0) {
        parking.servicios.forEach(service => {
            const li = document.createElement('li');
            li.textContent = service;
            modalServices.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.textContent = 'No hay servicios especiales.';
        modalServices.appendChild(li);
    }
    
    detailsModal.style.display = 'flex';
}

function hideParkingDetailsModal() {
    detailsModal.style.display = 'none';
}

// *** EVENT LISTENERS ***
document.addEventListener('DOMContentLoaded', loadParkings);
searchButton.addEventListener('click', filterAndSearchParkings);
locationInput.addEventListener('keypress', e => e.key === 'Enter' && filterAndSearchParkings());
priceRangeFilter.addEventListener('change', filterAndSearchParkings);
servicesFilter.addEventListener('change', filterAndSearchParkings);
availabilityFilter.addEventListener('change', filterAndSearchParkings);

helpButton.addEventListener('click', e => {
    e.preventDefault();
    alert('Usa los filtros para encontrar tu parqueadero ideal. Haz clic en una tarjeta para ver más detalles.');
});
userMenuButton.addEventListener('click', e => {
    e.stopPropagation();
    userDropdown.style.display = userDropdown.style.display === 'block' ? 'none' : 'block';
});
document.addEventListener('click', () => userDropdown.style.display = 'none');

modalCloseButton.addEventListener('click', hideParkingDetailsModal);
detailsModal.addEventListener('click', e => {
    if (e.target === detailsModal) {
        hideParkingDetailsModal();
    }
});
