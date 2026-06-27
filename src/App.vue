<script setup>
import { ref } from 'vue'

// 1. Importación de Componentes
import Login from './components/Login.vue'
import Registro from './components/Registro.vue'
import Home from './components/Home.vue'
import Calendario from './components/Calendario.vue'

// 2. Estado de Navegación
const pantallaActual = ref('login')
const nombreUsuario = ref('')
const usuariosRegistrados = ref([
  { nombre: 'Administrador', email: 'admin@jym.com', password: '123' }
])

// 3. Lógica de Manejo de Sesión
const procesarRegistro = (nuevoUsuario) => {
  usuariosRegistrados.value.push(nuevoUsuario)
  pantallaActual.value = 'login'
}

const entrar = (datosUsuario) => {
  if (!datosUsuario) return
  
  const correo = datosUsuario.email
  const encontrado = usuariosRegistrados.value.find(u => u.email === correo)
  
  nombreUsuario.value = encontrado 
    ? encontrado.nombre 
    : (datosUsuario.user_metadata?.full_name || correo.split('@')[0])
  
  pantallaActual.value = 'home'
}
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <Login 
      v-if="pantallaActual === 'login'" 
      @loginExitoso="entrar" 
      @irARegistro="pantallaActual = 'registro'" 
    />
    
    <Registro 
      v-if="pantallaActual === 'registro'" 
      @registroExitoso="procesarRegistro" 
      @irALogin="pantallaActual = 'login'" 
    />
    
    <Home 
      v-if="pantallaActual === 'home'" 
      :usuario="nombreUsuario" 
      @cerrarSesion="pantallaActual = 'login'" 
      @irACalendario="pantallaActual = 'calendario'" 
    />

    <Calendario 
      v-if="pantallaActual === 'calendario'" 
      @volverAHome="pantallaActual = 'home'" 
    />
  </div>
</template>