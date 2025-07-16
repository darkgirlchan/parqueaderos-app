document.getElementById('offer-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const formResponseElement = document.getElementById('form-response');
    const submitButton = form.querySelector('.submit-button');

    const data = {
        nombre: formData.get('nombre'),
        direccion: formData.get('direccion'),
        latitud: parseFloat(formData.get('latitud')),
        longitud: parseFloat(formData.get('longitud')),
        precio_hora: parseInt(formData.get('precio_hora'), 10),
        imagen: formData.get('imagen'),
        servicios: formData.getAll('servicios'), // Obtiene todos los checkboxes marcados
        disponible: true // Un parqueadero nuevo siempre está disponible
    };

    // Validación simple en el frontend
    if (isNaN(data.latitud) || isNaN(data.longitud) || isNaN(data.precio_hora)) {
        formResponseElement.textContent = 'Por favor, introduce números válidos para latitud, longitud y precio.';
        formResponseElement.style.color = 'red';
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Enviando...';
    formResponseElement.textContent = '';
    formResponseElement.style.backgroundColor = 'transparent';

    try {
        const response = await fetch('http://127.0.0.1:5000/api/parqueaderos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || `Error del servidor: ${response.status}`);
        }
        
        formResponseElement.textContent = result.message;
        formResponseElement.style.color = 'white';
        formResponseElement.style.backgroundColor = 'var(--primary-color)';
        form.reset();

    } catch (error) {
        console.error('Error al enviar el formulario:', error);
        formResponseElement.textContent = `Error: ${error.message}`;
        formResponseElement.style.color = 'white';
        formResponseElement.style.backgroundColor = 'red';
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Ofrecer mi Parqueadero';
    }
});