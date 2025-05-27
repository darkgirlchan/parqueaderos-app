// *** CONFIGURACIÓN DE LEAFLET Y OPENSTREETMAP ***

// Inicializar el mapa de Leaflet
// Centrado en Rionegro, Antioquia, Colombia (aproximado) [latitud, longitud]
// La línea 2 es esta:
const map = L.map('map').setView([6.1558, -75.3789], 13); // 13 es el nivel de zoom inicial

// Añadir la capa de mosaicos de OpenStreetMap
// Esto carga las imágenes del mapa de los servidores de OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    // Atribución requerida por OpenStreetMap
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Opcional: Añadir un control de escala al mapa
L.control.scale().addTo(map);

// *** SELECTORES DE ELEMENTOS DEL DOM ***
const parkingListElement = document.getElementById('parking-list');
const locationInput = document.getElementById('location-input');
const searchButton = document.getElementById('search-button');
const priceRangeFilter = document.getElementById('price-range');
const servicesFilter = document.getElementById('services-filter');
const availabilityFilter = document.getElementById('availability-filter');

// Variables para almacenar datos y marcadores
let allParkings = []; // Almacenará todos los parqueaderos cargados desde el backend
let leafletMarkers = []; // Almacenará las referencias a los marcadores de Leaflet para poder gestionarlos

// *** FUNCIONES PRINCIPALES ***

/**
 * Función asíncrona para cargar parqueaderos desde el backend.
 * Utiliza fetch para hacer una solicitud HTTP GET.
 */
async function loadParkings() {
    try {
        // La URL de tu backend Flask. Asegúrate de que Flask esté corriendo en este puerto.
        const response = await fetch('http://127.0.0.1:5000/api/parqueaderos');

        // Verifica si la respuesta HTTP fue exitosa (código 2xx)
        if (!response.ok) {
            // Lanza un error si la respuesta no es 200 OK
            throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
        }

        const parkings = await response.json(); // Parsea la respuesta JSON
        allParkings = parkings; // Guarda todos los parqueaderos para futuros filtros
        displayParkings(parkings); // Muestra los parqueaderos en la lista
        addParkingMarkersToMap(parkings); // Añade los marcadores al mapa
    } catch (error) {
        console.error('Error al cargar los parqueaderos:', error);
        // Muestra un mensaje amigable al usuario en caso de error
        parkingListElement.innerHTML = `
            <p style="color: red; text-align: center;">
                No se pudieron cargar los parqueaderos.
                <br>Por favor, asegúrate de que el **backend (servidor Flask)** esté corriendo.
                <br>Revisa la consola del navegador (F12) para más detalles.
            </p>
        `;
    }
}

/**
 * Función para mostrar los parqueaderos en el DOM (crea las "tarjetas").
 * @param {Array} parkings - Lista de objetos parqueadero a mostrar.
 */
function displayParkings(parkings) {
    parkingListElement.innerHTML = ''; // Limpia el contenido actual de la lista

    if (parkings.length === 0) {
        parkingListElement.innerHTML = '<p style="text-align: center; color: var(--text-color-light);">No se encontraron parqueaderos que coincidan con tu búsqueda.</p>';
        return; // Sale de la función si no hay parqueaderos
    }

    parkings.forEach(parking => {
        const card = document.createElement('div');
        card.classList.add('parking-card');
        card.dataset.id = parking.id; // Guarda el ID del parqueadero en el elemento HTML

        // Formatea la lista de servicios. Si no hay, muestra un mensaje por defecto.
        const servicesHtml = parking.servicios && parking.servicios.length > 0
            ? parking.servicios.map(service => `<span>${service}</span>`).join(', ')
            : 'Servicios no especificados';

        // Construye el HTML para cada tarjeta de parqueadero
        card.innerHTML = `
            <img src="${parking.imagen}" alt="Imagen de ${parking.nombre}">
            <div class="parking-card-info">
                <h3>${parking.nombre}</h3>
                <p>${parking.direccion}</p>
                <p class="services">${servicesHtml}</p>
                <p class="price">$${parking.precio_hora?.toLocaleString('es-CO') ?? 'N/A'} / hora</p>
                <p class="status ${parking.disponible ? 'available' : 'unavailable'}">
                    ${parking.disponible ? 'Disponible' : 'No Disponible'}
                </p>
            </div>
        `;
        parkingListElement.appendChild(card); // Añade la tarjeta al contenedor de la lista

        // Añade un evento de clic a cada tarjeta
        card.addEventListener('click', () => {
            // Cuando se hace clic en una tarjeta, el mapa se centra y se anima a la ubicación del parqueadero
            map.flyTo([parking.latitud, parking.longitud], 16, { // [lat, lng], zoom de acercamiento
                duration: 1.5 // Duración de la animación en segundos
            });

            // Opcional: Abre el popup del marcador correspondiente en el mapa
            const markerToShow = leafletMarkers.find(marker => {
                const markerLat = marker.getLatLng().lat;
                const markerLng = marker.getLatLng().lng;
                return markerLat === parking.latitud && markerLng === parking.longitud;
            });
            if (markerToShow) {
                markerToShow.openPopup();
            }
        });
    });
}

/**
 * Añade o actualiza marcadores para cada parqueadero en el mapa de Leaflet.
 * @param {Array} parkings - Lista de objetos parqueadero para añadir como marcadores.
 */
function addParkingMarkersToMap(parkings) {
    leafletMarkers.forEach(marker => marker.remove());
    leafletMarkers = [];

    parkings.forEach(parking => {
        // *** AÑADIR ESTA VERIFICACIÓN ***
        if (parking.latitud === undefined || parking.latitud === null ||
            parking.longitud === undefined || parking.longitud === null ||
            isNaN(parking.latitud) || isNaN(parking.longitud)) { // isNaN verifica si NO es un número
            console.warn(`Parqueadero ID ${parking.id || 'desconocido'} tiene coordenadas inválidas. No se añadirá al mapa.`);
            return; // Salta a la siguiente iteración del bucle si las coordenadas no son válidas
        }

        // Crea un nuevo marcador de Leaflet en la posición del parqueadero
        const marker = L.marker([parking.latitud, parking.longitud]) // <-- Esta es la línea 132 (o similar)
            .addTo(map)
            .bindPopup(`
                <b>${parking.nombre}</b><br>
                ${parking.direccion}<br>
                Precio: $${parking.precio_hora?.toLocaleString('es-CO') ?? 'N/A'}/h<br>
                Estado: ${parking.disponible ? 'Disponible' : 'No Disponible'}
            `);

        leafletMarkers.push(marker);
    });
}

/**
 * Función para filtrar y buscar parqueaderos basada en los valores de los filtros.
 */
function filterAndSearchParkings() {
    let filteredParkings = [...allParkings]; // Crea una copia de todos los parqueaderos para filtrar

    const searchTerm = locationInput.value.toLowerCase().trim(); // Término de búsqueda (ubicación, nombre)
    const selectedPriceRange = priceRangeFilter.value; // Rango de precio seleccionado
    const selectedService = servicesFilter.value; // Servicio seleccionado
    const isAvailableChecked = availabilityFilter.checked; // Si la casilla "Disponible ahora" está marcada

    // 1. Filtrar por término de búsqueda (nombre o dirección)
    if (searchTerm) {
        filteredParkings = filteredParkings.filter(parking =>
            parking.nombre.toLowerCase().includes(searchTerm) ||
            parking.direccion.toLowerCase().includes(searchTerm)
        );
    }

    // 2. Filtrar por rango de precios
    if (selectedPriceRange) {
        filteredParkings = filteredParkings.filter(parking => {
            if (selectedPriceRange === 'low') {
                return parking.precio_hora < 3000;
            } else if (selectedPriceRange === 'medium') {
                return parking.precio_hora >= 3000 && parking.precio_hora <= 5000;
            } else if (selectedPriceRange === 'high') {
                return parking.precio_hora > 5000;
            }
            return true; // Si la opción es "Cualquier precio"
        });
    }

    // 3. Filtrar por servicio
    if (selectedService) {
        filteredParkings = filteredParkings.filter(parking =>
            // Asegura que parking.servicios existe y contiene el servicio seleccionado
            parking.servicios && parking.servicios.includes(selectedService)
        );
    }

    // 4. Filtrar por disponibilidad
    if (isAvailableChecked) {
        filteredParkings = filteredParkings.filter(parking => parking.disponible);
    }

    // Después de aplicar todos los filtros, actualiza la visualización
    displayParkings(filteredParkings);
    addParkingMarkersToMap(filteredParkings); // Actualiza los marcadores en el mapa
}

// *** EVENT LISTENERS ***
// Asocia la función de filtro a los eventos de los elementos de la interfaz
searchButton.addEventListener('click', filterAndSearchParkings);
locationInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') { // Permite buscar al presionar Enter en el input de ubicación
        filterAndSearchParkings();
    }
});
priceRangeFilter.addEventListener('change', filterAndSearchParkings);
servicesFilter.addEventListener('change', filterAndSearchParkings);
availabilityFilter.addEventListener('change', filterAndSearchParkings);

// Cargar los parqueaderos cuando todo el contenido del DOM haya sido cargado
document.addEventListener('DOMContentLoaded', loadParkings);