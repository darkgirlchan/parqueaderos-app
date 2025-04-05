document.addEventListener('DOMContentLoaded', function() {
    // Inicializar el mapa
    const map = L.map('map').setView([4.6097, -74.0817], 13); // Coordenadas de Bogotá como ejemplo
    
    // Añadir capa de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Cargar parqueaderos existentes
    loadParkings();
    
    // Manejador para agregar nuevos parqueaderos
    document.getElementById('save-btn').addEventListener('click', addParking);
    document.getElementById('close-info').addEventListener('click', () => {
        document.getElementById('parking-info').classList.add('hidden');
    });
    
    // Variable para almacenar el marcador actual
    let currentMarker = null;
    
    // Evento para agregar marcador al hacer clic en el mapa
    map.on('click', function(e) {
        if (currentMarker) {
            map.removeLayer(currentMarker);
        }
        
        currentMarker = L.marker(e.latlng).addTo(map)
            .bindPopup('Nuevo parqueadero<br>Complete el formulario y guarde')
            .openPopup();
    });
    
    // Función para cargar parqueaderos existentes
    function loadParkings() {
        fetch('/api/parkings')
            .then(response => response.json())
            .then(data => {
                data.forEach(parking => {
                    const marker = L.marker([parking.lat, parking.lng]).addTo(map);
                    marker.bindPopup(`<h3>${parking.name}</h3><p>${parking.address}</p>`);
                    
                    marker.on('click', function() {
                        showParkingInfo(parking);
                    });
                });
            })
            .catch(error => console.error('Error:', error));
    }
    
    // Función para agregar un nuevo parqueadero
    function addParking() {
        if (!currentMarker) {
            alert('Por favor seleccione una ubicación en el mapa');
            return;
        }
        
        const name = document.getElementById('name').value;
        const address = document.getElementById('address').value;
        const spaces = document.getElementById('spaces').value;
        const price = document.getElementById('price').value;
        
        if (!name) {
            alert('El nombre es requerido');
            return;
        }
        
        const parkingData = {
            name: name,
            address: address,
            spaces: spaces,
            price: price,
            lat: currentMarker.getLatLng().lat,
            lng: currentMarker.getLatLng().lng
        };
        
        fetch('/api/parkings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(parkingData)
        })
        .then(response => response.json())
        .then(data => {
            alert('Parqueadero guardado exitosamente');
            // Limpiar formulario
            document.getElementById('name').value = '';
            document.getElementById('address').value = '';
            document.getElementById('spaces').value = '';
            document.getElementById('price').value = '';
            
            // Actualizar marcador
            currentMarker.bindPopup(`<h3>${parkingData.name}</h3><p>${parkingData.address}</p>`);
            currentMarker.on('click', function() {
                showParkingInfo(parkingData);
            });
            
            currentMarker = null;
        })
        .catch(error => console.error('Error:', error));
    }
    
    // Función para mostrar información detallada del parqueadero
    function showParkingInfo(parking) {
        document.getElementById('info-name').textContent = parking.name;
        document.getElementById('info-address').textContent = parking.address;
        document.getElementById('info-spaces').textContent = parking.spaces;
        document.getElementById('info-price').textContent = parking.price;
        document.getElementById('parking-info').classList.remove('hidden');
    }
});