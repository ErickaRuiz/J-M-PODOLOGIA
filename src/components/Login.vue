<script setup>
import { ref } from 'vue'
import { createClient } from '@supabase/supabase-js'

const emit = defineEmits(['loginExitoso', 'irARegistro'])
const email = ref('')
const password = ref('')
const mostrarPassword = ref(false)
// Agrega esto en tu <script setup> de Login.vue para solucionar el bloqueo:
const supabaseUrl = 'https://hbyuktnmadyrpajhwqvq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhieXVrdG5tYWR5cnBhamh3cXZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNTM3OTYsImV4cCI6MjA5NDcyOTc5Nn0.gNYrVUPrS71IVx4NCjXBsAUki5zdRrdAkqt0DSK6Qwc'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

const ingresar = async () => {
  if (email.value && password.value) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    })

    if (error) {
      alert('Error al ingresar: ' + error.message)
    } else {
      alert('¡Bienvenido al sistema!')
      // Emitimos el evento pasando la información del usuario autenticado en Supabase
      emit('loginExitoso', data.user) 
    }
  } else {
    alert('Por favor, completa todos los campos.')
  }
}
</script>

<template>
  <div class="podologia-login-container">
    <div class="podologia-card">
      <div class="brand-header">
        <div class="logo-emblem">
          <img src="../assets/Icono.jpeg" alt="Logo J&M" class="logo-img" />
        </div>
        <h2 class="main-title">J&M Podología</h2>
        <p class="tagline">Especialistas en el cuidado de tus pies</p>
        <div class="divider"></div>
        <h3 class="session-title">Iniciar Sesión</h3>
      </div>
      
      <form @submit.prevent="ingresar" class="podologia-form">
        <div class="input-group">
          <label class="input-label">
            <svg class="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            Correo Electrónico
          </label>
          <input v-model="email" type="email" placeholder="recepcion@jym.com" class="custom-input" required />
        </div>

        <div class="input-group">
          <label class="input-label">
            <svg class="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Contraseña
          </label>
          <div class="password-field-container">
            <input 
              v-model="password" 
              :type="mostrarPassword ? 'text' : 'password'" 
              placeholder="••••••••" 
              class="custom-input password-input" 
              required 
            />
            <button 
              type="button" 
              class="eye-toggle-btn" 
              @click="mostrarPassword = !mostrarPassword"
            >
              <svg v-if="mostrarPassword" class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
          </div>
        </div>

        <button type="submit" class="podologia-btn-submit">
          Ingresar al Sistema
          <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
        </button>
      </form>
      
      <div class="podologia-card-footer">
        <p>¿No tienes una cuenta asignada?</p>
        <button @click="emit('irARegistro')" class="register-link">Regístrate aquí</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.podologia-login-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw !important;
  height: 100vh !important;
  min-height: 100vh !important;
  z-index: 999999 !important;
  margin: 0 !important;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  box-sizing: border-box;
  background: radial-gradient(circle at top right, #f0fdfa 0%, #e2e8f0 100%) !important;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  overflow-y: auto;
}

.podologia-card {
  width: 100%;
  max-width: 380px; /* Mismo ancho compacto que el registro */
  background: #ffffff;
  padding: 20px 24px; /* Mismo padding reducido */
  border-radius: 24px;
  box-shadow: 0 15px 30px -10px rgba(15, 23, 42, 0.08);
  border: 2px solid #0d9488;
  box-sizing: border-box;
  margin: auto;
}

.brand-header {
  text-align: center;
  margin-bottom: 14px;
}

.logo-emblem {
  width: 60px;
  height: 60px;
  background-color: #f0fdfa;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 8px auto;
  box-shadow: 0 6px 12px -3px rgba(13, 148, 136, 0.12);
  border: 1px solid rgba(13, 148, 136, 0.15);
}

.logo-img {
  width: 42px;
  height: 42px;
  object-fit: contain;
}

.main-title {
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
}

.tagline {
  font-size: 12px;
  color: #0d9488;
  font-weight: 600;
  margin: 2px 0 0 0;
}

.divider {
  width: 35px;
  height: 3px;
  background: #2dd4bf;
  border-radius: 2px;
  margin: 8px auto;
}

.session-title {
  font-size: 13px;
  font-weight: 700;
  color: #475569;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.podologia-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-group {
  display: flex;
  flex-direction: column;
}

.input-label {
  font-size: 12px;
  font-weight: 700;
  color: #334155;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.label-icon {
  width: 13px;
  height: 13px;
  color: #0d9488;
}

.custom-input {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #99f6e4;
  border-radius: 10px;
  font-size: 14px;
  color: #0f172a;
  box-sizing: border-box;
  background-color: #ffffff;
  transition: all 0.2s ease;
}

.custom-input:focus {
  outline: none;
  border-color: #0d9488;
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
}

.password-field-container {
  position: relative !important;
  width: 100%;
  display: flex;
  align-items: center;
}

.password-input {
  padding-right: 40px !important;
}

.eye-toggle-btn {
  position: absolute !important;
  right: 12px !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  background: none !important;
  border: none !important;
  cursor: pointer !important;
  padding: 2px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  z-index: 10 !important;
}

.eye-icon {
  width: 20px !important;
  height: 20px !important;
  color: #64748b !important;
}

.eye-toggle-btn:hover .eye-icon {
  color: #0d9488 !important;
}

.podologia-btn-submit {
  width: 100%;
  padding: 11px;
  background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 4px;
  box-shadow: 0 6px 12px -3px rgba(13, 148, 136, 0.25);
}

.podologia-btn-submit:hover {
  background: linear-gradient(135deg, #0f766e 0%, #115e59 100%);
}

.arrow-icon {
  width: 14px;
  height: 14px;
}

.podologia-card-footer {
  margin-top: 14px;
  text-align: center;
  font-size: 13px;
  color: #64748b;
}

.podologia-card-footer p {
  margin: 0 0 2px 0;
}

.register-link {
  background: none;
  border: none;
  color: #0d9488;
  font-weight: 700;
  cursor: pointer;
  padding: 2px;
  font-size: 13px;
}

.register-link:hover {
  text-decoration: underline;
}

@media (max-width: 480px) {
  .podologia-card {
    padding: 16px 20px;
  }
}
</style>