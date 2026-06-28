<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { supabase } from '../supabase.js'

const props = defineProps({
  usuario: { type: String, default: 'María' }
})

const emit = defineEmits(['cerrarSesion', 'irACalendario'])
const mostrarMenu = ref(false)

// --- ESTADOS PARA MIS PACIENTES ---
const mostrarPacientes = ref(false)
const listaPacientes = ref([])
const proximasCitas = ref([])

// --- ESTADOS PARA SUCURSALES Y GRÁFICOS ---
const listaSucursales = ref([])
const sucursalGraficoMensual = ref(null) 
const citasSemana = ref([])              
const datosMensuales = ref(new Array(12).fill(0)) 
const totalCitasAño = ref(0) // Guarda la sumatoria total del año para calcular el 100%

// Paginación del gráfico mensual (bloques de 5 meses)
const mesInicioVista = ref(0)
const mesesVisiblesCount = 5

const nombresMeses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const coloresPastelesMeses = [
  '#ffb7b2', '#ffdac1', '#e2f0cb', '#b5ead7', '#c7ceea', '#ffc6ff',
  '#ffd6a5', '#caf0f8', '#e1beed', '#fbc4ab', '#d8e2dc', '#ece4db'
]

const nombreSucursalSeleccionada = computed(() => {
  if (!sucursalGraficoMensual.value) return 'Todas las Sucursales'
  const sucursalEncontrada = listaSucursales.value.find(s => s.id === sucursalGraficoMensual.value)
  return sucursalEncontrada ? sucursalEncontrada.nombre : 'Todas las Sucursales'
})

const cargarProximasCitas = async () => {
  try {
    const fechaLocal = new Date()
    const hoy = `${fechaLocal.getFullYear()}-${String(fechaLocal.getMonth() + 1).padStart(2, '0')}-${String(fechaLocal.getDate()).padStart(2, '0')}` 
    const { data, error } = await supabase.from('citas').select('id, nombre_paciente, servicio, estado, fecha').eq('fecha', hoy)
    if (error) throw error
    proximasCitas.value = data || []
  } catch (error) {
    console.error('Error al cargar próximas citas:', error.message)
  }
}

const obtenerSucursales = async () => {
  try {
    const { data, error } = await supabase.from('sucursales').select('*')
    if (error) throw error
    listaSucursales.value = data || []
  } catch (err) {
    console.error("Error al cargar sucursales en Home:", err.message)
  }
}

const cargarPacientes = async () => {
  try {
    if (mostrarPacientes.value) {
      mostrarPacientes.value = false
      return
    }
    const { data, error } = await supabase.from('pacientes').select('id, nombre').order('nombre', { ascending: true })
    if (error) throw error
    listaPacientes.value = data || []
    mostrarPacientes.value = true
  } catch (error) {
    console.error('Error al obtener pacientes:', error.message)
  }
}

const cargarCitasSemana = async () => {
  try {
    const hoy = new Date()
    const numeroDia = hoy.getDay() === 0 ? 7 : hoy.getDay()
    const lunes = new Date(hoy)
    lunes.setDate(hoy.getDate() - (numeroDia - 1))
    const domingo = new Date(lunes)
    domingo.setDate(lunes.getDate() + 6)
    const formatoFecha = (d) => d.toISOString().split('T')[0]

    const { data, error } = await supabase.from('citas').select('fecha').gte('fecha', formatoFecha(lunes)).lte('fecha', formatoFecha(domingo))
    if (error) throw error
    citasSemana.value = data || []
  } catch (error) {
    console.error('Error al cargar gráfica semanal:', error.message)
  }
}

const cargarCitasMensuales = async () => {
  try {
    const añoActual = new Date().getFullYear()
    const inicioAño = `${añoActual}-01-01`
    const finAño = `${añoActual}-12-31`
    let query = supabase.from('citas').select('fecha, id_sucursal').gte('fecha', inicioAño).lte('fecha', finAño)

    if (sucursalGraficoMensual.value) {
      query = query.eq('id_sucursal', sucursalGraficoMensual.value)
    }

    const { data, error } = await query
    if (error) throw error

    const conteo = new Array(12).fill(0)
    if (data) {
      data.forEach(cita => {
        const fecha = new Date(cita.fecha + 'T00:00:00')
        conteo[fecha.getMonth()]++
      })
    }
    datosMensuales.value = conteo
    // Guardamos el total de citas filtradas para obtener la base del porcentaje
    totalCitasAño.value = data ? data.length : 0
  } catch (error) {
    console.error('Error al cargar citas mensuales:', error.message)
  }
}

watch(sucursalGraficoMensual, () => {
  cargarCitasMensuales()
})

const mesSiguiente = () => {
  if (mesInicioVista.value + mesesVisiblesCount < 12) mesInicioVista.value++
}
const mesAnterior = () => {
  if (mesInicioVista.value > 0) mesInicioVista.value--
}

const datosGraficoSemanal = computed(() => {
  const diasNombre = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  const conteoDias = [0, 0, 0, 0, 0, 0, 0]
  const hoy = new Date()
  const numeroDia = hoy.getDay() === 0 ? 7 : hoy.getDay()
  const lunes = new Date(hoy)
  lunes.setDate(hoy.getDate() - (numeroDia - 1))

  citasSemana.value.forEach(cita => {
    const fechaCita = new Date(cita.fecha + 'T00:00:00')
    const diferenciaTiempo = fechaCita.getTime() - lunes.getTime()
    const indiceDia = Math.floor(diferenciaTiempo / (1000 * 60 * 60 * 24))
    if (indiceDia >= 0 && indiceDia < 7) conteoDias[indiceDia]++
  })

  const totalCitasSemana = citasSemana.value.length
  return diasNombre.map((nombre, i) => {
    const cantidad = conteoDias[i]
    const porcentaje = totalCitasSemana > 0 ? Math.round((cantidad / totalCitasSemana) * 100) : 0
    return { nombre, cantidad, porcentaje, altura: porcentaje > 0 ? `${porcentaje}%` : '5%' }
  })
})

// REFACTORIZADO: Ahora calcula el porcentaje real sobre el total del año
const graficoPaginado = computed(() => {
  const fin = mesInicioVista.value + mesesVisiblesCount
  const segmentoMeses = nombresMeses.slice(mesInicioVista.value, fin)
  const segmentoCantidades = datosMensuales.value.slice(mesInicioVista.value, fin)

  return segmentoMeses.map((nombre, i) => {
    const cantidad = segmentoCantidades[i]
    const indiceGlobalMes = mesInicioVista.value + i 
    
    // Regla de tres simple sobre el total de citas del año
    const porcentaje = totalCitasAño.value > 0 ? Math.round((cantidad / totalCitasAño.value) * 100) : 0

    return {
      nombre,
      cantidad,
      porcentaje,
      color: coloresPastelesMeses[indiceGlobalMes],
      // La altura de la barra se rige estrictamente por su peso en porcentaje
      altura: porcentaje > 0 ? `${porcentaje}%` : '5%'
    }
  })
})

onMounted(() => {
  cargarProximasCitas()
  obtenerSucursales()
  cargarCitasSemana()
  cargarCitasMensuales()
})



</script>

<template>
  <div class="podologia-home-container">
    <!-- Barra Superior / Navbar -->
    <header class="home-header">
      <div class="header-brand">
        <div class="brand-logo-wrapper">
          <img src="../assets/Icono.jpeg" alt="Logo J&M" class="brand-logo-img" />
        </div>
        <h1 class="brand-name">J&M Podología</h1>
      </div>
      
      <div class="profile-dropdown-wrapper">
        <div class="user-profile" @click="mostrarMenu = !mostrarMenu" title="Opciones de usuario">
          <div class="profile-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <span class="welcome-text">¡Hola, {{ usuario }}!</span>
        </div>

        <div v-if="mostrarMenu" class="dropdown-menu">
          <button @click="emit('cerrarSesion')" class="logout-action">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="logout-icon">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Cerrar Sesión
          </button>
        </div>
      </div>
    </header>

    <!-- Dashboard Principal -->
    <main class="dashboard-main-card">
      <div class="dashboard-header">
        <h2 class="dashboard-title">Dashboard de Inicio</h2>
      </div>

      <div class="dashboard-grid">
       <!-- Columna Izquierda: Próximas Citas -->
<!-- Columna Izquierda: Próximas Citas -->
<section class="appointments-panel">
  <div class="panel-header-row">
    <h3 class="panel-heading">Próximas Citas</h3>
    <button class="add-appointment-btn" @click="emit('irACalendario')">
      + Nueva
    </button>
  </div>
  
  <ul class="appointments-list">
    <li v-for="cita in proximasCitas" :key="cita.id" class="appointment-pink-card">
      <div class="appointment-info-details">
        <!-- Nombre del Paciente -->
        <p class="appointment-patient-name">{{ cita.nombre_paciente || 'Sin nombre' }}</p>
        
        <!-- Tratamiento (Mapeado a cita.servicio) -->
        <p class="appointment-service-tag">{{ (cita.servicio || 'Sin tratamiento').toUpperCase() }}</p>
        
        <!-- Sucursal en la parte inferior -->
        <p class="appointment-branch-tag">{{ cita.sucursal || 'Sin sucursal' }}</p>
      </div>
    </li>
    <p v-if="proximasCitas.length === 0" class="no-citas-text">No hay citas pendientes para hoy.</p>
  </ul>
</section>

        <!-- Centro Fijo -->
        <section class="welcome-center">
          <div class="contenido-bienvenida-dinamico">
            <div class="center-logo-container">
              <img src="../assets/Icono.jpeg" alt="Logo Central" class="center-logo" />
            </div>
            <p class="status-msg">Acceso exitoso al sistema.</p>
            <p class="welcome-heading">¡Bienvenida a <span class="bold-text">tu Home de Podología!</span></p>
            
            <button class="action-btn-citas" @click="emit('irACalendario')">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Ver Citas del Día
            </button>
          </div>
        </section>

        <!-- Columna Derecha -->
        <section class="summary-panel">
         <div class="main-chart-card" style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05); width: 100%; margin-top: 20px; box-sizing: border-box;">
  
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
    <h2 style="font-size: 18px; font-weight: 700; color: #1e293b; margin: 0;">Citas por meses</h2>
    
    <select 
      v-model="sucursalGraficoMensual" 
      style="padding: 6px 12px; font-size: 13px; border-radius: 6px; border: 1px solid #cbd5e1; background: #f8fafc; font-weight: 500; cursor: pointer;"
    >
      <option :value="null">Todas las Sucursales</option>
      <option v-for="sucursal in listaSucursales" :key="sucursal.id" :value="sucursal.id">
        {{ sucursal.nombre }}
      </option>
    </select>
  </div>

  <div style="display: flex; align-items: center; gap: 10px; width: 100%;">
    <button @click="mesAnterior" :disabled="mesInicioVista === 0" style="border: none; background: #f1f5f9; color: #475569; width: 32px; height: 32px; border-radius: 50%; font-weight: bold; cursor: pointer;">❮</button>

    <div style="flex-grow: 1; height: 200px; display: flex; flex-direction: column; justify-content: flex-end; position: relative;">
      <div style="display: flex; justify-content: space-around; align-items: flex-end; height: 100%; padding: 0 10px; z-index: 2;">
        
        <div v-for="(mes, index) in graficoPaginado" :key="index" style="display: flex; flex-direction: column; align-items: center; width: 14%; height: 100%; justify-content: flex-end;">
          <span style="font-size: 12px; font-weight: 700; color: #1e293b; margin-bottom: 6px;">{{ mes.cantidad }}</span>
          
          <div 
            :style="{ height: mes.altura, backgroundColor: mes.color }" 
            style="width: 100%; border-radius: 4px 4px 0 0; transition: height 0.3s ease-out, background-color 0.2s;"
          ></div>
          
          <span style="font-size: 11px; color: #64748b; margin-top: 8px; font-weight: 500;">{{ mes.nombre }}</span>
        </div>

      </div>
      <div style="height: 2px; background-color: #e2e8f0; width: 100%; margin-top: 2px;"></div>
    </div>

    <button @click="mesSiguiente" :disabled="mesInicioVista + mesesVisiblesCount >= 12" style="border: none; background: #f1f5f9; color: #475569; width: 32px; height: 32px; border-radius: 50%; font-weight: bold; cursor: pointer;">❯</button>
  </div>
</div>
          <!-- Botón de Navegación "Mis Pacientes" -->
          <div class="shortcut-container-box">
            <button class="nav-shortcut-btn" @click="cargarPacientes">
              <div class="btn-label-group">
                <svg class="shortcut-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <span>Mis Pacientes</span>
              </div>
              <svg class="chevron-icon" :class="{ 'chevron-rotated': mostrarPacientes }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>

            <!-- Contenedor Desplegable -->
            <div v-if="mostrarPacientes" class="lista-nombres-desplegable">
              <div v-for="paciente in listaPacientes" :key="paciente.id" class="nombre-item-card">
                <div class="mini-avatar-dot"></div>
                <span class="nombre-paciente-text">{{ paciente.nombre }}</span>
              </div>
              <p v-if="listaPacientes.length === 0" class="no-pacientes-text">No hay registros.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.profile-dropdown-wrapper {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: -5px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  padding: 4px;
  min-width: 140px;
  z-index: 1000;
  border: 1px solid #e2e8f0;
}

.logout-action {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  background: none;
  border: none;
  border-radius: 8px;
  color: #ef4444;
  font-weight: 600;
  cursor: pointer;
  font-size: 14px;
}

.logout-action:hover {
  background: #f8fafc;
}

.logout-icon {
  width: 18px;
  height: 18px;
}

.podologia-home-container {
  min-height: 100vh;
  width: 100vw;
  background: linear-gradient(135deg, #ccfbf1 0%, #bfdbfe 100%);
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin: 0;
  position: absolute;
  top: 0;
  left: 0;
}

.home-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-logo-wrapper {
  width: 54px;
  height: 54px;
  background: #ffffff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(13, 148, 136, 0.2);
  border: 2px solid #0d9488;
  overflow: hidden;
}

.brand-logo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.brand-name {
  font-size: 24px;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 20px;
  transition: background 0.2s;
}

.user-profile:hover {
  background: rgba(255, 255, 255, 0.4);
}

.profile-avatar {
  width: 38px;
  height: 38px;
  background-color: #cbd5e1;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
}

.profile-avatar svg {
  width: 22px;
  height: 22px;
}

.welcome-text {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.dashboard-main-card {
  width: 100%;
  max-width: 1200px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(8px);
  border-radius: 28px;
  padding: 30px 40px;
  box-sizing: border-box;
  margin: 0 auto;
  box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.5);
  flex-grow: 1;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.dashboard-title {
  font-size: 24px;
  font-weight: 800;
  color: #1e293b;
  margin: 0;
}

.options-btn {
  background: #e2e8f0;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #475569;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 290px 1fr 280px;
  gap: 32px;
  align-items: start;
}

/* --- COLUMNA IZQUIERDA --- */
.appointments-panel {
  background: #f1f5f9;
  border-radius: 18px;
  padding: 20px;
  align-self: stretch;
  max-height: 400px;
  overflow-y: auto;
}

.panel-heading {
  font-size: 15px;
  font-weight: 700;
  color: #334155;
  margin: 0;
}

.appointments-list {
  list-style: none;
  padding: 0;
  margin: 12px 0 0 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.appointment-item-box {
  background: white;
  border: 1px solid #e2e8f0;
  padding: 12px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
}

.appointment-time-badge {
  background: #e0f2fe;
  color: #0369a1;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 6px;
  align-self: flex-start;
}

.appointment-info-details {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.appointment-patient-name {
  font-size: 13.5px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.appointment-service-tag {
  font-size: 11px;
  font-weight: 600;
  color: #475569;
  margin: 0;
}

.appointment-branch-tag {
  font-size: 10.5px;
  font-weight: 500;
  color: #0d9488;
  margin: 0;
}

.no-citas-text {
  font-size: 12px;
  color: #64748b;
  text-align: center;
  padding: 20px 0;
  margin: 0;
}

/* --- CENTRO FIJO --- */
.welcome-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 20px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  height: 400px;
  box-sizing: border-box;
}

.contenido-bienvenida-dinamico {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.center-logo-container {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  border: 4px solid #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin-bottom: 16px;
  background: #fff;
}

.center-logo {
  width: 85%;
  height: 85%;
  object-fit: contain;
}

.status-msg {
  font-size: 15px;
  color: #334155;
  margin: 0 0 4px 0;
}

.welcome-heading {
  font-size: 20px;
  color: #0f172a;
  margin: 0 0 24px 0;
}

.bold-text {
  font-weight: 800;
}

.action-btn-citas {
  background: #0d9488;
  color: white;
  border: none;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 700;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.2);
  transition: background 0.2s;
}

.action-btn-citas:hover {
  background: #0f766e;
}

/* --- COLUMNA DERECHA --- */
.summary-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-self: stretch;
}

.summary-inner-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  padding: 16px;
}

.panel-heading-sm {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 12px 0;
}

.tags-container {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.summary-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.text-teal {
  background: #e6f4f1;
  color: #0f766e;
}

.text-blue {
  background: #eff6ff;
  color: #1d4ed8;
}

.bold-num {
  font-weight: 800;
}

.chart-mockup {
  height: 80px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 0 10px;
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 100%;
  gap: 12px;
}

.bar {
  width: 14px;
  border-radius: 3px 3px 0 0;
  background: #475569;
}

.bar-1 { background: #0d9488; }
.bar-2 { background: #2dd4bf; width: 10px; }
.bar-3 { background: #475569; }
.bar-4 { background: #93c5fd; }

.chart-axis-line {
  height: 1px;
  background: #cbd5e1;
  width: 100%;
}

.shortcut-container-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.nav-shortcut-btn {
  background: #f1f5f9;
  border: none;
  padding: 14px 16px;
  border-radius: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  color: #1e293b;
  font-weight: 700;
  font-size: 14px;
  width: 100%;
}

.nav-shortcut-btn:hover {
  background: #e2e8f0;
}

.btn-label-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.shortcut-icon {
  width: 18px;
  height: 18px;
  color: #475569;
}

.chevron-icon {
  width: 16px;
  height: 16px;
  color: #64748b;
  transition: transform 0.2s ease;
}

.chevron-rotated {
  transform: rotate(90deg);
}

.lista-nombres-desplegable {
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  max-height: 140px;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
}

.nombre-item-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 8px 12px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.mini-avatar-dot {
  width: 6px;
  height: 6px;
  background-color: #0d9488;
  border-radius: 50%;
}

.nombre-paciente-text {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.no-pacientes-text {
  color: #64748b;
  font-size: 12px;
  text-align: center;
  padding: 10px;
  margin: 0;
}

@media (max-width: 900px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  .welcome-center {
    height: auto;
  }
}

.panel-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.add-appointment-btn {
  background: #0d9488;
  color: white;
  border: none;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}

.add-appointment-btn:hover {
  background: #0f766e;
}

/* --- COLUMNA IZQUIERDA (PANEL PLOMO) --- */
.appointments-panel {
  background: #f1f5f9; /* Color plomo del fondo */
  border-radius: 18px;
  padding: 20px;
  align-self: stretch;
  max-height: 400px;
  overflow-y: auto;
}

.appointments-list {
  list-style: none;
  padding: 0;
  margin: 12px 0 0 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Tarjetita Rosada/Morada como la imagen */
.appointment-pink-card {
  background: #e9a6e3; /* Color rosa/morado claro de la imagen */
  padding: 14px 16px;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.appointment-info-details {
  display: flex;
  flex-direction: column;
  width: 100%;
}

/* Nombre del Paciente */
.appointment-patient-name {
  font-size: 14px;
  font-weight: 800;
  color: #0c3161; /* Azul marino oscuro */
  margin: 0;
  text-transform: uppercase;
}

/* Tratamiento */
.appointment-service-tag {
  font-size: 12px;
  font-weight: 500;
  color: #4a4a4a; /* Gris oscuro texturizado */
  margin: 0 0 12px 0; /* Espacio antes de la sucursal */
}

/* Sucursal (Ubicación de la antigua hora) */
.appointment-branch-tag {
  font-size: 13px;
  font-weight: 600;
  color: #0c3161; /* Mismo tono oscuro para resaltar */
  margin: 0;
}
</style>