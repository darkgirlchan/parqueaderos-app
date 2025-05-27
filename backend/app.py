from flask import Flask, jsonify
from flask_cors import CORS
import pyodbc
import json

app = Flask(__name__)
CORS(app) # Habilita CORS para todas las rutas

# --- CONFIGURACIÓN DE LA BASE DE DATOS SQL SERVER ---
DB_CONFIG = {
    'SERVER': 'DARKSYSTEM', # Asegúrate de que este es el nombre correcto de tu servidor
    'DATABASE': 'BaseParquipass',
    'DRIVER': '{ODBC Driver 17 for SQL Server}'
}

def get_db_connection():
    """Establece y devuelve una conexión a la base de datos usando Trusted_Connection."""
    conn_str = f"DRIVER={DB_CONFIG['DRIVER']};" \
               f"SERVER={DB_CONFIG['SERVER']};" \
               f"DATABASE={DB_CONFIG['DATABASE']};" \
               f"Trusted_Connection=yes;"
    
    try:
        conn = pyodbc.connect(conn_str)
        print("Conexión a la base de datos exitosa.")
        return conn
    except pyodbc.Error as ex:
        sqlstate = ex.args[0]
        sql_message = ex.args[1]
        print(f"Error al conectar a la base de datos: {sqlstate} - {sql_message}")
        return None

# --- Función para convertir de CamelCase/PascalCase a snake_case ---
def to_snake_case(name):
    """Convierte un string de CamelCase/PascalCase a snake_case."""
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()

import re # ¡Asegúrate de importar 're' al inicio del archivo!

@app.route('/')
def home():
    return "<h1>¡Bienvenido a la API de Parqueaderos!</h1>"

@app.route('/api/parqueaderos', methods=['GET'])
def get_parqueaderos():
    conn = None 
    cursor = None 
    parqueaderos = []
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({"error": "No se pudo establecer conexión con la base de datos. Revisa la configuración del servidor y los logs."}), 500
        
        cursor = conn.cursor()
        cursor.execute("SELECT Id, Nombre, Direccion, Latitud, Longitud, PrecioHora, Disponible, Servicios, Imagen FROM Parqueaderos")
        
        # Obtiene los nombres de las columnas y los convierte a snake_case
        # Aquí es donde ocurre la magia: aseguramos que los nombres de las claves del JSON
        # coincidan con lo que el frontend espera (ej. 'precio_hora' en vez de 'PrecioHora')
        columns = [to_snake_case(column[0]) for column in cursor.description]
        
        for row in cursor.fetchall():
            parqueadero_data = {}
            for i, col_name in enumerate(columns):
                value = row[i]
                
                # Manejo especial para la columna 'servicios' (ahora en snake_case)
                if col_name == 'servicios' and value:
                    try:
                        parqueadero_data[col_name] = json.loads(value)
                    except json.JSONDecodeError:
                        parqueadero_data[col_name] = [s.strip() for s in value.split(',')]
                # Manejo especial para la columna 'disponible' (ahora en snake_case)
                elif col_name == 'disponible':
                    parqueadero_data[col_name] = bool(value)
                else:
                    parqueadero_data[col_name] = value
            parqueaderos.append(parqueadero_data)

    except pyodbc.Error as ex:
        sqlstate = ex.args[0]
        sql_message = ex.args[1]
        print(f"Error al ejecutar la consulta: {sqlstate} - {sql_message}")
        return jsonify({"error": f"Error al consultar la base de datos: {sqlstate} - {sql_message}"}), 500
    except Exception as e:
        print(f"Ocurrió un error inesperado en la API: {e}")
        return jsonify({"error": "Ocurrió un error interno del servidor. Contacta al administrador."}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
            
    return jsonify(parqueaderos)

if __name__ == '__main__':
    app.run(debug=True)