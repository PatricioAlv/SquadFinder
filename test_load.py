import pytest
import requests
import random
from faker import Faker
from concurrent.futures import ThreadPoolExecutor
import time

# Configuración
BASE_URL = 'http://localhost:5000/api'
fake = Faker()

# Lista de juegos disponibles
GAMES = ['cs2', 'fortnite', 'valorant', 'warzone', 'dota2', 'lol']

class TestLoadScenarios:
    def __init__(self):
        self.users = []
        self.rooms = []

    def create_user(self):
        """Crear un usuario aleatorio"""
        user_data = {
            'username': fake.user_name(),
            'email': fake.email(),
            'password': 'Test123!'
        }
        
        response = requests.post(f'{BASE_URL}/register', json=user_data)
        if response.status_code == 201:
            # Iniciar sesión para obtener el token
            login_response = requests.post(f'{BASE_URL}/login', 
                json={'email': user_data['email'], 'password': 'Test123!'})
            if login_response.status_code == 200:
                token = login_response.json()['token']
                self.users.append({
                    'email': user_data['email'],
                    'token': token,
                    'username': user_data['username']
                })
                return True
        return False

    def create_room(self, user):
        """Crear una sala de juego aleatoria"""
        room_data = {
            'title': f"Sala de {fake.word()}",
            'game': random.choice(GAMES),
            'playersNeeded': random.randint(2, 10),
            'description': fake.sentence()
        }
        
        headers = {'Authorization': f'Bearer {user["token"]}'}
        response = requests.post(f'{BASE_URL}/rooms', json=room_data, headers=headers)
        
        if response.status_code == 201:
            self.rooms.append(response.json())
            return True
        return False

    def test_create_users(self, num_users=50):
        """Crear múltiples usuarios en paralelo"""
        print(f"\nCreando {num_users} usuarios...")
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=10) as executor:
            results = list(executor.map(lambda _: self.create_user(), range(num_users)))
        
        successful_users = sum(results)
        print(f"Usuarios creados: {successful_users}/{num_users}")
        print(f"Tiempo total: {time.time() - start_time:.2f} segundos")
        
        return successful_users

    def test_create_rooms(self, rooms_per_user=5):
        """Crear múltiples salas por usuario"""
        print(f"\nCreando {rooms_per_user} salas por usuario...")
        start_time = time.time()
        total_rooms = 0
        
        for user in self.users:
            for _ in range(rooms_per_user):
                if self.create_room(user):
                    total_rooms += 1
        
        print(f"Salas creadas: {total_rooms}/{len(self.users) * rooms_per_user}")
        print(f"Tiempo total: {time.time() - start_time:.2f} segundos")
        
        return total_rooms

def run_load_test():
    test = TestLoadScenarios()
    
    # Crear usuarios
    users_created = test.test_create_users(50)
    
    if users_created > 0:
        # Crear salas
        rooms_created = test.test_create_rooms(5)
        
        print(f"\nResumen de la prueba:")
        print(f"- Usuarios creados: {users_created}")
        print(f"- Salas creadas: {rooms_created}")
        print(f"- Total de operaciones: {users_created + rooms_created}")

if __name__ == '__main__':
    run_load_test()