// API Configuration
const API_URL = process.env.NODE_ENV === 'production' 
    ? 'https://tu-backend.onrender.com/api'  // Cambiar por tu URL de Render
    : 'http://localhost:5000/api';

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const createRoomModal = document.getElementById('createRoomModal');
const createRoomForm = document.getElementById('createRoomForm');
const navLinks = document.querySelector('.nav-links');
const gameRoomsSection = document.getElementById('gameRooms');
const selectedGameSpan = document.getElementById('selectedGame');
const roomsList = document.getElementById('roomsList');
const createRoomBtn = document.getElementById('createRoomBtn');

// Auth state
let currentUser = null;
let authToken = localStorage.getItem('authToken');
let currentGame = null;

// Utility Functions
const showModal = (modal) => {
    modal.classList.add('active');
};

const hideModal = (modal) => {
    modal.classList.remove('active');
};

const showError = (message) => {
    alert(message); // Podríamos mejorar esto con un sistema de notificaciones más elegante
};

const showSuccess = (message) => {
    alert(message);
};

// Modal Controls
loginBtn.addEventListener('click', () => showModal(loginModal));
registerBtn.addEventListener('click', () => showModal(registerModal));

// Close modals when clicking outside
window.addEventListener('click', (e) => {   
    if (e.target.classList.contains('modal')) {
        hideModal(e.target);
    }
});

// Handle form submissions
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');

    // Validación básica
    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        showError('Por favor ingresa un email válido');
        return;
    }

    if (!password) {
        showError('Por favor ingresa tu contraseña');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('authToken', data.token);
            currentUser = {
                username: data.username,
                token: data.token
            };
            updateUIForLoggedInUser();
            hideModal(loginModal);
            showSuccess(data.message || '¡Bienvenido de vuelta!');
            
            // Recargar las salas si estamos en una vista de juego
            const activeGame = document.querySelector('.game-card.active');
            if (activeGame) {
                loadRooms(activeGame.dataset.game);
            }
        } else {
            showError(data.error || 'Error al iniciar sesión');
            console.error('Error de login:', data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Error al conectar con el servidor');
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const username = formData.get('username');
    const email = formData.get('email');
    const password = formData.get('password');

    // Validación de campos
    if (!username || username.length < 3) {
        showError('El nombre de usuario debe tener al menos 3 caracteres');
        return;
    }

    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        showError('Por favor ingresa un email válido');
        return;
    }

    if (!password || password.length < 6) {
        showError('La contraseña debe tener al menos 6 caracteres');
        return;
    }

    const userData = { username, email, password };
    
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        });

        const data = await response.json();
        
        if (response.ok) {
            showSuccess('Registro exitoso. Por favor, inicia sesión.');
            hideModal(registerModal);
            showModal(loginModal);
            e.target.reset();
        } else {
            showError(data.error || 'Error al registrar');
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Error al conectar con el servidor');
    }
});

// Room Management
createRoomForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) {
        showError('Debes iniciar sesión para crear una sala');
        return;
    }

    const formData = new FormData(e.target);
    const roomData = {
        game: formData.get('game'),
        title: formData.get('title'),
        players_needed: parseInt(formData.get('players_needed')),
        description: formData.get('description'),
        user_id: currentUser.username
    };

    try {
        const response = await fetch(`${API_URL}/rooms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify(roomData),
        });

        const data = await response.json();
        
        if (response.ok) {
            hideModal(createRoomModal);
            showSuccess('Sala creada exitosamente');
            loadRooms(roomData.game);
        } else {
            showError(data.error || 'Error al crear la sala');
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Error al conectar con el servidor');
    }
    
    e.target.reset();
});

// UI Updates
function updateUIForLoggedInUser() {
    if (currentUser) {
        navLinks.innerHTML = `
            <span>Bienvenido, ${currentUser.username}</span>
            <button id="createRoomBtn">Crear Sala</button>
            <button id="logoutBtn">Cerrar Sesión</button>
        `;
        
        // Add event listeners for new buttons
        document.getElementById('createRoomBtn').addEventListener('click', () => {
            showModal(createRoomModal);
        });
        
        document.getElementById('logoutBtn').addEventListener('click', () => {
            localStorage.removeItem('authToken');
            currentUser = null;
            updateUIForLoggedInUser();
            showSuccess('Sesión cerrada exitosamente');
        });
        
        // Enable find team buttons
        document.querySelectorAll('.find-team-btn').forEach(btn => {
            btn.disabled = false;
        });
    } else {
        navLinks.innerHTML = `
            <button id="loginBtn">Iniciar Sesión</button>
            <button id="registerBtn">Registrarse</button>
        `;
        
        // Restore event listeners
        document.getElementById('loginBtn').addEventListener('click', () => {
            showModal(loginModal);
        });
        document.getElementById('registerBtn').addEventListener('click', () => {
            showModal(registerModal);
        });
        
        // Disable find team buttons
        document.querySelectorAll('.find-team-btn').forEach(btn => {
            btn.disabled = true;
        });
    }
}

// Room Loading
async function loadRooms(game) {
    try {
        const response = await fetch(`${API_URL}/rooms?game=${game}`);
        const rooms = await response.json();
        
        const gameSection = document.querySelector(`[data-game="${game}"]`);
        const roomsList = document.createElement('div');
        roomsList.className = 'rooms-list';
        
        rooms.forEach(room => {
            const roomElement = document.createElement('div');
            roomElement.className = 'room-item';
            roomElement.innerHTML = `
                <h4>${room.title}</h4>
                <p>Jugadores necesarios: ${room.players_needed}</p>
                <p>Creado por: ${room.created_by}</p>
                <button class="join-room-btn" data-room-id="${room._id}">Unirse</button>
            `;
            roomsList.appendChild(roomElement);
        });
        
        // Replace existing rooms list if any
        const existingList = gameSection.querySelector('.rooms-list');
        if (existingList) {
            existingList.remove();
        }
        gameSection.appendChild(roomsList);
    } catch (error) {
        console.error('Error loading rooms:', error);
        showError('Error al cargar las salas');
    }
}

// Función para cargar las salas de un juego
async function loadRoomsList(game) {
    try {
        const response = await fetch(`${API_URL}/rooms?game=${game}`);
        const rooms = await response.json();

        if (!response.ok) {
            throw new Error(rooms.error || 'Error al cargar las salas');
        }

        roomsList.innerHTML = '';
        rooms.forEach(room => {
            const roomCard = document.createElement('div');
            roomCard.className = 'room-card';
            roomCard.innerHTML = `
                <h3>${room.title}</h3>
                <div class="room-info">
                    <p>Creador: ${room.creator.username}</p>
                    <p>Jugadores: ${room.members.length}/${room.playersNeeded}</p>
                </div>
                <div class="room-description">
                    ${room.description}
                </div>
                <div class="room-footer">
                    <span>Creado: ${new Date(room.created_at).toLocaleString()}</span>
                    <button class="join-room-btn" data-room-id="${room._id}"
                            ${room.members.length >= room.playersNeeded ? 'disabled' : ''}>
                        ${room.members.length >= room.playersNeeded ? 'Lleno' : 'Unirse'}
                    </button>
                </div>
            `;
            roomsList.appendChild(roomCard);
        });

        if (rooms.length === 0) {
            roomsList.innerHTML = '<p class="no-rooms">No hay salas disponibles para este juego.</p>';
        }

    } catch (error) {
        console.error('Error:', error);
        showError('Error al cargar las salas');
    }
}

// Event listeners para los botones de buscar equipo
document.querySelectorAll('.find-team-btn').forEach(button => {
    button.addEventListener('click', () => {
        const gameCard = button.closest('.game-card');
        const game = gameCard.dataset.game;
        currentGame = game;
        
        // Actualizar UI
        document.querySelectorAll('.game-card').forEach(card => {
            card.classList.remove('active');
        });
        gameCard.classList.add('active');
        
        selectedGameSpan.textContent = gameCard.querySelector('h3').textContent;
        gameRoomsSection.style.display = 'block';
        
        // Cargar salas
        loadRoomsList(game);
    });
});

// Manejo del modal de crear sala
createRoomBtn.addEventListener('click', () => {
    if (!currentUser) {
        showError('Debes iniciar sesión para crear una sala');
        showModal(loginModal);
        return;
    }
    showModal(createRoomModal);
});

createRoomForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
        showError('Debes iniciar sesión para crear una sala');
        return;
    }

    const formData = new FormData(e.target);
    const roomData = {
        title: formData.get('title'),
        game: currentGame,
        playersNeeded: parseInt(formData.get('playersNeeded')),
        description: formData.get('description')
    };

    try {
        const response = await fetch(`${API_URL}/rooms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify(roomData)
        });

        const data = await response.json();
        
        if (response.ok) {
            showSuccess('Sala creada exitosamente');
            hideModal(createRoomModal);
            e.target.reset();
            loadRoomsList(currentGame);
        } else {
            showError(data.error || 'Error al crear la sala');
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Error al conectar con el servidor');
    }
});

// Event delegation para los botones de unirse a sala
roomsList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('join-room-btn')) {
        if (!currentUser) {
            showError('Debes iniciar sesión para unirte a una sala');
            showModal(loginModal);
            return;
        }

        const roomId = e.target.dataset.roomId;
        // Aquí implementaremos la funcionalidad de unirse a una sala en el futuro
        showSuccess('Funcionalidad de unirse a sala en desarrollo');
    }
});

// Handle find team buttons
document.querySelectorAll('.find-team-btn').forEach(button => {
    button.addEventListener('click', async (e) => {
        const gameCard = e.target.closest('.game-card');
        const game = gameCard.dataset.game;
        
        if (!currentUser) {
            showError('Debes iniciar sesión para buscar equipo');
            showModal(loginModal);
            return;
        }
        
        await loadRooms(game);
    });
});

// Check initial auth state
if (authToken) {
    // Verify token and load user data
    // This is where you'd typically validate the token with the server
    try {
        // For now, we'll just update the UI
        currentUser = { token: authToken };
        updateUIForLoggedInUser();
    } catch (error) {
        console.error('Error verifying token:', error);
        localStorage.removeItem('authToken');
    }
}
