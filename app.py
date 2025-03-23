from flask import Flask, request, jsonify
from flask_cors import CORS
import bcrypt
import jwt
from datetime import datetime, timedelta
import os
from pymongo import MongoClient
from dotenv import load_dotenv
from urllib.parse import quote_plus

# Configuración
import os
from dotenv import load_dotenv

load_dotenv()

# Configuración de MongoDB
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key')

# Configuración CORS
CORS_ORIGIN = os.getenv('CORS_ORIGIN', '*')
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": CORS_ORIGIN}})

# Prueba de conexión a MongoDB Atlas
print("Intentando conectar a MongoDB...")
print("Intentando conexión...")

try:
    client = MongoClient(MONGO_URI)
    # Forzar una operación para verificar la conexión
    db = client.gamesquad
    db.command('ping')
    print("¡Conexión a MongoDB Atlas exitosa!")
    print("Bases de datos disponibles:", client.list_database_names())
except Exception as e:
    print(f"Error conectando a MongoDB Atlas: {e}")
    raise e

# Rutas de autenticación
@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.json
        username = data.get('username', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        # Validación de campos
        if not username or len(username) < 3:
            return jsonify({"error": "El nombre de usuario debe tener al menos 3 caracteres"}), 400

        if not email or '@' not in email:
            return jsonify({"error": "Email inválido"}), 400

        if not password or len(password) < 6:
            return jsonify({"error": "La contraseña debe tener al menos 6 caracteres"}), 400

        # Verificar si el usuario ya existe
        if db.users.find_one({"username": username}):
            return jsonify({"error": "El nombre de usuario ya está en uso"}), 400

        if db.users.find_one({"email": email}):
            return jsonify({"error": "El email ya está registrado"}), 400

        # Crear el usuario
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        user = {
            "username": username,
            "email": email,
            "password": hashed_password,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = db.users.insert_one(user)
        
        if not result.inserted_id:
            return jsonify({"error": "Error al crear el usuario"}), 500

        return jsonify({
            "message": "Usuario registrado exitosamente",
            "username": username
        }), 201

    except Exception as e:
        print(f"Error en el registro: {str(e)}")
        return jsonify({"error": "Error interno del servidor"}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        # Validación básica
        if not email or not password:
            return jsonify({"error": "Email y contraseña son requeridos"}), 400

        # Buscar usuario
        user = db.users.find_one({"email": email})
        if not user:
            return jsonify({"error": "Email o contraseña incorrectos"}), 401

        # Verificar contraseña
        if not bcrypt.checkpw(password.encode('utf-8'), user['password']):
            print("Contraseña incorrecta para el usuario:", email)
            return jsonify({"error": "Email o contraseña incorrectos"}), 401

        # Generar token
        token = jwt.encode({
            'user_id': str(user['_id']),
            'username': user['username'],
            'email': user['email'],
            'exp': datetime.utcnow() + timedelta(days=1)
        }, JWT_SECRET_KEY, algorithm='HS256')

        return jsonify({
            "token": token,
            "username": user['username'],
            "message": "Inicio de sesión exitoso"
        })

    except Exception as e:
        print(f"Error en login: {str(e)}")
        return jsonify({"error": "Error interno del servidor"}), 500

# Rutas para las salas de juego
@app.route('/api/rooms', methods=['GET'])
def get_rooms():
    try:
        game = request.args.get('game')
        if not game:
            return jsonify({"error": "Se requiere especificar un juego"}), 400

        rooms = list(db.rooms.find({"game": game}))
        for room in rooms:
            room['_id'] = str(room['_id'])
            room['created_at'] = room['created_at'].isoformat()
            if 'updated_at' in room:
                room['updated_at'] = room['updated_at'].isoformat()

        return jsonify(rooms)
    except Exception as e:
        print(f"Error al obtener salas: {str(e)}")
        return jsonify({"error": "Error interno del servidor"}), 500

@app.route('/api/rooms', methods=['POST'])
def create_room():
    try:
        data = request.json
        required_fields = ['title', 'game', 'playersNeeded', 'description']
        
        if not all(field in data for field in required_fields):
            return jsonify({"error": "Faltan campos requeridos"}), 400

        # Verificar que el usuario está autenticado
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "No autorizado"}), 401

        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expirado"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Token inválido"}), 401

        room = {
            "title": data['title'],
            "game": data['game'],
            "playersNeeded": int(data['playersNeeded']),
            "description": data['description'],
            "creator": {
                "id": payload['user_id'],
                "username": payload['username']
            },
            "members": [payload['user_id']],  # El creador es el primer miembro
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "status": "open"
        }

        result = db.rooms.insert_one(room)
        room['_id'] = str(result.inserted_id)
        room['created_at'] = room['created_at'].isoformat()
        room['updated_at'] = room['updated_at'].isoformat()

        return jsonify(room), 201

    except Exception as e:
        print(f"Error al crear sala: {str(e)}")
        return jsonify({"error": "Error interno del servidor"}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
