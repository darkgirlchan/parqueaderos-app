from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app) # Habilita CORS para todas las rutas

# Datos de parqueaderos de ejemplo (esto luego vendrá de una base de datos)
parqueaderos_ejemplo = [
    {
        "id": 1,
        "nombre": "Parqueadero El Trébol",
        "direccion": "Cra. 52 #48a67, Rionegro, Antioquia",
        "latitud": 6.153680394816561, 
        "longitud": -75.3755880706623,
        "servicios": ["Techado"],
        "precio_hora": 3000,
        "disponible": True,
        "imagen": "https://res.cloudinary.com/drnpkxoab/image/upload/v1748278546/imagen_2025-05-26_115542576_l90gz1.png" # Imagen de ejemplo
    },
    {
        "id": 2,
        "nombre": "Rioparking",
        "direccion": "Cl. 47 #513, Rionegro, Antioquia",
        "latitud": 6.152139332210269,  
        "longitud": -75.37472232097929,
        "servicios": ["Lavado de autos", "Aire libre"],
        "precio_hora": 4500,
        "disponible": True,
        "imagen": "https://res.cloudinary.com/drnpkxoab/image/upload/v1748279048/imagen_2025-05-26_120402952_ieeaui.png"
    },
    {
        "id": 3,
        "nombre": "Parqueadero Sucre",
        "direccion": "Cra. 51 #5120, Rionegro, Antioquia",
        "latitud": 6.155189248786367, 
        "longitud": -75.37375504286994,
        "servicios": ["Techado"],
        "precio_hora": 2500,
        "disponible": False,
        "imagen": "https://res.cloudinary.com/drnpkxoab/image/upload/v1748279215/imagen_2025-05-26_120648105_h6upvx.png"
    }
]

@app.route('/')
def home():
    return "¡Bienvenido a la API de Parqueaderos!"

@app.route('/api/parqueaderos', methods=['GET'])
def get_parqueaderos():
    """
    Retorna una lista de parqueaderos disponibles.
    """
    return jsonify(parqueaderos_ejemplo)

if __name__ == '__main__':
    # Para ejecutar en modo desarrollo
    app.run(debug=True, port=5000)