from flask import Flask, jsonify, request
from flask_cors import CORS
import pyodbc
import json
import re
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)

# Configuración de la conexión a tu base de datos SQL Server
DB_CONFIG = {
    'SERVER': 'DARKSYSTEM',  # Asegúrate de que este sea el nombre correcto de tu servidor
    'DATABASE': 'BaseParquipass',
    'DRIVER': '{ODBC Driver 17 for SQL Server}'
}

def get_db_connection():
    """Establece y devuelve una conexión a la base de datos."""
    try:
        conn_str = (
            f"DRIVER={DB_CONFIG['DRIVER']};"
            f"SERVER={DB_CONFIG['SERVER']};"
            f"DATABASE={DB_CONFIG['DATABASE']};"
            f"Trusted_Connection=yes;"
        )
        conn = pyodbc.connect(conn_str)
        print("Conexión a la base de datos exitosa.")
        return conn
    except pyodbc.Error as ex:
        # Imprime el error completo para facilitar la depuración
        sqlstate = ex.args[0]
        print(f"Error al conectar a la base de datos. SQLSTATE: {sqlstate}. Mensaje: {ex}")
        return None

def to_snake_case(name):
    """Convierte un string de PascalCase a snake_case."""
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()

@app.route('/')
def home():
    return "<h1>¡Bienvenido a la API de ParquiPass!</h1>"

@app.route('/api/parqueaderos', methods=['GET'])
def get_parqueaderos():
    """Obtiene la lista de todos los parqueaderos desde la base de datos."""
    conn = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({"error": "Error de conexión a la base de datos."}), 500
        
        cursor = conn.cursor()
        
        # ===== CAMBIO CLAVE AQUÍ =====
        # Se cambió 'CuposDisponibles' por 'Disponible' para que coincida con tu tabla.
        # Se usa 'AS CuposDisponibles' para que el JSON generado tenga el nombre que el frontend espera.
        cursor.execute("""
            SELECT 
                Id, 
                Nombre, 
                Direccion, 
                Latitud, 
                Longitud, 
                PrecioHora, 
                Disponible AS CuposDisponibles, -- Alias para mantener consistencia con el frontend
                Servicios, 
                Imagen
            FROM 
                Parqueaderos
        """)
        
        # El resto del código convierte los nombres de columna a snake_case (ej: CuposDisponibles -> cupos_disponibles)
        columns = [to_snake_case(column[0]) for column in cursor.description]
        parqueaderos = []
        for row in cursor.fetchall():
            parqueadero_data = {}
            for i, col_name in enumerate(columns):
                value = row[i]
                # Convierte la cadena de servicios JSON en una lista de Python
                if col_name == 'servicios' and value:
                    try:
                        parqueadero_data[col_name] = json.loads(value)
                    except json.JSONDecodeError:
                        # Si no es un JSON válido, lo trata como una lista separada por comas
                        parqueadero_data[col_name] = [s.strip() for s in value.split(',')]
                else:
                    parqueadero_data[col_name] = value
            parqueaderos.append(parqueadero_data)
            
        return jsonify(parqueaderos)

    except Exception as e:
        print(f"Ocurrió un error inesperado en la API: {e}")
        return jsonify({"error": "Ocurrió un error interno del servidor."}), 500
    finally:
        if conn:
            conn.close()
            print("Conexión a la base de datos cerrada.")

@app.route('/api/register', methods=['POST'])
def register_user():
    """Registra un nuevo usuario en la base de datos."""
    data = request.get_json()
    nombre = data.get('nombre')
    correo = data.get('correo')
    contrasena = data.get('contrasena')
    tipo_vehiculo = data.get('tipo_vehiculo')

    if not all([nombre, correo, contrasena, tipo_vehiculo]):
        return jsonify({"error": "Faltan datos. Todos los campos son requeridos."}), 400

    # Encriptar la contraseña antes de guardarla
    contrasena_hash = generate_password_hash(contrasena)

    conn = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({"error": "Error de conexión a la base de datos."}), 500
        
        cursor = conn.cursor()
        
        # Verificar si el correo ya existe
        cursor.execute("SELECT Id FROM Usuarios WHERE Correo = ?", correo)
        if cursor.fetchone():
            return jsonify({"error": "El correo electrónico ya está registrado."}), 409

        # Insertar el nuevo usuario
        cursor.execute(
            "INSERT INTO Usuarios (Nombre, Correo, ContrasenaHash, TipoVehiculo) VALUES (?, ?, ?, ?)",
            nombre, correo, contrasena_hash, tipo_vehiculo
        )
        conn.commit()
        
        return jsonify({"message": "Usuario creado exitosamente."}), 201

    except Exception as e:
        print(f"Error en el registro: {e}")
        return jsonify({"error": "Ocurrió un error interno al registrar el usuario."}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/login', methods=['POST'])
def login_user():
    """Autentica un usuario y devuelve sus datos si las credenciales son correctas."""
    data = request.get_json()
    correo = data.get('correo')
    contrasena = data.get('contrasena')

    if not correo or not contrasena:
        return jsonify({"error": "El correo y la contraseña son requeridos."}), 400

    conn = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({"error": "Error de conexión a la base de datos."}), 500
            
        cursor = conn.cursor()
        cursor.execute("SELECT Id, Nombre, Correo, ContrasenaHash, TipoVehiculo FROM Usuarios WHERE Correo = ?", correo)
        user = cursor.fetchone()

        if user and check_password_hash(user.ContrasenaHash, contrasena):
            # Las credenciales son correctas. Devolvemos los datos del usuario.
            user_data = {
                "id": user.Id,
                "nombre": user.Nombre,
                "correo": user.Correo,
                "tipo_vehiculo": user.TipoVehiculo
            }
            return jsonify(user_data)
        else:
            # Credenciales inválidas
            return jsonify({"error": "Credenciales inválidas."}), 401
            
    except Exception as e:
        print(f"Error en el inicio de sesión: {e}")
        return jsonify({"error": "Ocurrió un error interno en el inicio de sesión."}), 500
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    app.run(debug=True)