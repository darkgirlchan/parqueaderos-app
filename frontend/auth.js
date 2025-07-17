document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const errorMessageElement = document.getElementById('error-message');

    const API_URL = 'http://127.0.0.1:5000/api';

    // Función para mostrar errores
    const showError = (message) => {
        errorMessageElement.textContent = message;
    };

    // Manejador del formulario de registro
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            showError(''); // Limpiar errores previos

            const formData = new FormData(registerForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch(`${API_URL}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'Ocurrió un error en el registro.');
                }
                
                alert('¡Registro exitoso! Ahora puedes iniciar sesión.');
                window.location.href = 'login.html'; // Redirigir al login

            } catch (error) {
                showError(error.message);
            }
        });
    }

    // Manejador del formulario de inicio de sesión
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            showError('');

            const formData = new FormData(loginForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch(`${API_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'Ocurrió un error al iniciar sesión.');
                }

                // Guardar la información del usuario en el navegador
                localStorage.setItem('parquipass_user', JSON.stringify(result));
                
                // Redirigir a la página principal
                window.location.href = 'index.html';

            } catch (error) {
                showError(error.message);
            }
        });
    }
});