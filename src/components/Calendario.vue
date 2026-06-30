<script setup>
import { ref, computed, onMounted } from 'vue';
import { supabase } from '../supabase.js';
import { watch } from 'vue';


// --- ESTADOS PARA MODALES ---
const mostrarFormularioSucursal = ref(false);
const mostrarModalPaciente = ref(false);

// --- ESTADOS DE DATOS (REINICIADOS) ---

const listaSucursales = ref([]); // Lista vacía inicial
const profesionales = ref([]);   // Lista vacía inicial
const nombreSucursal = ref('');
const nombreProfesional = ref('');
const fechaActual = ref(new Date());
const sucursalSeleccionada = ref(null); 
const estadoReserva = ref('activas');
// En <script setup> de Calendario.vue
const emit = defineEmits(['volverAHome']); // Debe coincidir con lo que tienes en el padre

const volverAlHome = () => {
  emit('volverAHome'); // Esto avisa al padre para cambiar la pantalla
};

// --- CARGA DE DATOS ---
const obtenerDatos = async () => {
  try {
    const { data: sucs } = await supabase.from('sucursales').select('*');
    const { data: pros } = await supabase.from('profesionales').select('*');
    
    listaSucursales.value = sucs || [];
    profesionales.value = pros || [];
  } catch (err) {
    console.error("Error al cargar datos:", err.message);
  }
};

const profesionalesFiltrados = computed(() => {
  if (!sucursalSeleccionada.value) return [];
  return profesionales.value.filter(pro => pro.sucursal_id === sucursalSeleccionada.value);
});

// Se ejecuta al montar el componente
onMounted(async () => {
  obtenerDatos();
});
// --- FUNCIONES ---
const toggleFormularioSucursal = () => {
  if (mostrarFormularioSucursal.value) {
    // Si ya estaba abierto, simplemente lo cerramos
    mostrarFormularioSucursal.value = false;
  } else {
    // Si lo vamos a abrir, limpiamos los campos para que esté vacío
    editandoId.value = null; // IMPORTANTE: Esto le dice al formulario que NO es edición
    nombreSucursal.value = '';
    nombreProfesional.value = '';
    mostrarFormularioSucursal.value = true;
  }
};


// --- FUNCIONES DE CALENDARIO ---
// Asegúrate de que estas funciones existan en tu script
const cambiarDia = (direccion) => {
  const nuevaFecha = new Date(fechaActual.value);
  nuevaFecha.setDate(nuevaFecha.getDate() + direccion);
  fechaActual.value = nuevaFecha; // Esto disparará automáticamente el watch superior
};

const irAHoy = () => {
  fechaActual.value = new Date(); // Esto disparará automáticamente el watch superior
};
// --- LÓGICA DE SUPABASE ---
const guardarSucursal = async () => {
  if (!nombreSucursal.value || !nombreProfesional.value) return alert("Completa los campos");

  try {
    if (editandoId.value) {
      // --- MODO EDICIÓN ---
      await supabase.from('sucursales').update({ nombre: nombreSucursal.value }).eq('id', editandoId.value);
      await supabase.from('profesionales').update({ nombre: nombreProfesional.value }).eq('sucursal_id', editandoId.value);
      alert("¡Datos actualizados!");
    } else {
      // --- MODO CREACIÓN ---
      const { data: nuevaSuc } = await supabase.from('sucursales').insert([{ nombre: nombreSucursal.value }]).select('id').single();
      await supabase.from('profesionales').insert([{ nombre: nombreProfesional.value, sucursal_id: nuevaSuc.id, color: '#3b82f6' }]);
      alert("¡Nueva sucursal creada!");
    }

    // --- RECARGA REACTIVA ---
    await obtenerDatos(); // Esto fuerza a que la vista se dibuje con los nuevos valores
    
    // Limpieza
    mostrarFormularioSucursal.value = false;
    editandoId.value = null;
    nombreSucursal.value = '';
    nombreProfesional.value = '';
  } catch (err) { alert("Error: " + err.message); }
};

// --- ESTADOS DE EDICIÓN ---
const editandoId = ref(null);

// Función para preparar la edición
const prepararEdicion = () => {
  if (!sucursalSeleccionada.value) {
    return alert("Por favor, selecciona una sucursal primero.");
  }
  
  const sucursalAEditar = listaSucursales.value.find(s => s.id === sucursalSeleccionada.value);
  const profesionalAEditar = profesionales.value.find(p => p.sucursal_id === sucursalSeleccionada.value);
  
  if (sucursalAEditar) {
    editandoId.value = sucursalAEditar.id;
    nombreSucursal.value = sucursalAEditar.nombre;
    nombreProfesional.value = profesionalAEditar ? profesionalAEditar.nombre : '';
    mostrarFormularioSucursal.value = true;
  }
};
// Función para eliminar con confirmación
const eliminarSucursal = async () => {
  // 1. Validar que haya una sucursal seleccionada
  if (!sucursalSeleccionada.value) {
    return alert("Por favor, selecciona primero la sucursal que deseas eliminar.");
  }

  // 2. Obtener nombre para el mensaje de confirmación
  const sucursalAEliminar = listaSucursales.value.find(s => s.id === sucursalSeleccionada.value);
  const nombre = sucursalAEliminar ? sucursalAEliminar.nombre : "esta sucursal";

  // 3. Confirmación
  const confirmacion = confirm(`¿Estás seguro de que deseas eliminar la sucursal: ${nombre}? Esta acción no se puede deshacer.`);
  
  if (confirmacion) {
    try {
      // 4. Eliminar primero los profesionales asociados (por la llave foránea)
      await supabase
        .from('profesionales')
        .delete()
        .eq('sucursal_id', sucursalSeleccionada.value);

      // 5. Eliminar la sucursal
      const { error } = await supabase
        .from('sucursales')
        .delete()
        .eq('id', sucursalSeleccionada.value);
        
      if (error) throw error;

      alert("Sucursal y profesionales eliminados correctamente.");
      
      // 6. Limpiar estado y recargar datos
      sucursalSeleccionada.value = null;
      await obtenerDatos();
    } catch (err) {
      alert("Error al eliminar: " + err.message);
    }
  }
};




// --- CONFIGURACIÓN ---
const agendasPorSucursal = {
  matriz: { nombre: 'Sucursal Miraflores' },
  secundaria: { nombre: 'Sucursal Chorrillos' }
};

// --- COMPUTADOS ---
const fechaFormateada = computed(() => fechaActual.value.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
const esHoy = computed(() => fechaActual.value.toDateString() === new Date().toDateString());
const nombreSucursalActiva = computed(() => {
  // Buscamos en la lista la sucursal que coincida con el ID seleccionado
  const encontrada = listaSucursales.value.find(s => s.id === sucursalSeleccionada.value);
  // Si se encontró, devolvemos el nombre; si no, un texto por defecto
  return encontrada ? encontrada.nombre : 'Selecciona una sucursal';
});

//------------------------------------------------------------------------------------
//BOTON nuevo PACIENTE

// Agrega esta función específica para pacientes en tu script
const abrirModalPaciente = () => {
  if (!sucursalSeleccionada.value) {
    return alert("⚠️ Por favor, selecciona una sucursal primero para poder registrar pacientes.");
  }
  mostrarModalPaciente.value = true;
};

// En tu script setup
const nuevoPaciente = ref({ 
  nombre: '', 
  telefono: '', 
  email: '', 
  dx: '',     
  notas: '' 
});

const guardarPaciente = async () => {
  // 1. Validaciones
  if (!nuevoPaciente.value.nombre) return alert("El nombre es obligatorio");
  if (!sucursalSeleccionada.value) return alert("Selecciona una sucursal primero");

  // 2. Preparamos el objeto (igual para ambos casos)
  const datosPaciente = {
    nombre: nuevoPaciente.value.nombre.toUpperCase(),
    telefono: nuevoPaciente.value.telefono,
    email: nuevoPaciente.value.email.toLowerCase(),
    dx: nuevoPaciente.value.dx,
    notas: nuevoPaciente.value.notas.toUpperCase(),
    sucursal_id: sucursalSeleccionada.value
  };

  let error;

  // 3. Decidimos si hacemos INSERT o UPDATE
  if (modoEdicion.value && idPacienteEditando.value) {
    // ACTUALIZAR
    const res = await supabase
      .from('pacientes')
      .update(datosPaciente)
      .eq('id', idPacienteEditando.value);
    error = res.error;
    if (!error) alert("Paciente actualizado con éxito");
  } else {
    // INSERTAR
    const res = await supabase
      .from('pacientes')
      .insert([datosPaciente]);
    error = res.error;
    if (!error) alert("Paciente registrado con éxito");
  }

  // 4. Manejo de errores
  if (error) {
    alert("Error en la operación: " + error.message);
    return;
  }

  // 5. Limpieza general
  nuevoPaciente.value = { nombre: '', telefono: '', email: '', dx: '', notas: '' };
  modoEdicion.value = false;
  idPacienteEditando.value = null;
  mostrarModalPaciente.value = false;
};


//boton editar paciente
const modoEdicion = ref(false);
const idPacienteEditando = ref(null);

// Función para abrir el formulario y cargar los datos
const editarPaciente = (paciente) => {
  // 1. Cargamos los datos en el formulario
  nuevoPaciente.value = { ...paciente }; 
  
  // 2. Activamos el modo edición
  modoEdicion.value = true;
  idPacienteEditando.value = paciente.id;
  
  // 3. Abrimos el modal
  abrirModalLista.value = false; // Cerramos la lista
  mostrarModalPaciente.value = true; // Abrimos el formulario
};
// En tu script setup

const cancelarAccion = () => {
  // 1. Siempre limpiamos el formulario
  nuevoPaciente.value = { nombre: '', telefono: '', email: '', dx: '', notas: '' };

  if (modoEdicion.value) {
    // ESTAMOS EN MODO MODIFICAR: Regresamos a la lista
    modoEdicion.value = false;
    idPacienteEditando.value = null;
    mostrarModalPaciente.value = false; // Cerramos el formulario
    abrirModalLista.value = true;       // Abrimos la lista
  } else {
    // ESTAMOS EN MODO REGISTRAR: Cerramos todo
    mostrarModalPaciente.value = false;
  }
};


const cerraryRegresar = () => {
  // 1. Ocultar la lista
  abrirModalLista.value = false;
  
  // 2. Limpiar el formulario y ponerlo en modo "Registrar"
  nuevoPaciente.value = { 
    nombre: '', 
    telefono: '', 
    email: '', 
    dx: '',     
    notas: '' 
  };
  modoEdicion.value = false;      // Importante: modo registro, no edición
  idPacienteEditando.value = null; 
  
  // 3. Abrir el formulario
  mostrarModalPaciente.value = true;
};

//boton eliminar

const eliminarPaciente = async (id) => {
  // 1. Confirmación de seguridad
  if (!confirm("¿Estás seguro de que deseas eliminar este paciente? Esta acción no se puede deshacer.")) {
    return;
  }

  // 2. Eliminación en Supabase
  const { error } = await supabase
    .from('pacientes')
    .delete()
    .eq('id', id);

  if (error) {
    alert("Error al eliminar: " + error.message);
    return;
  }

  // 3. Actualizar la lista en tiempo real
  alert("Paciente eliminado correctamente");
  abrirLista(); // Recargamos la lista para quitar al paciente visualmente
};

//------------------------------------------------------------------------

//BOTON AGENDAR CITA 
// --- ESTADOS PARA AGENDA ---
const citas = ref([]);
const listaCitas = ref([]);
const citasDelDia = ref([]);
const mostrarModalReserva = ref(false);
const nuevaReserva = ref({
  paciente_id: null,
  fecha: '',
  tratamiento: '',
  hora: '00:00',
  notas: ''
});


// En tu <script setup>



const obtenerCitas = async () => {
  if (!sucursalSeleccionada.value) {
    listaCitas.value = [];
    return;
  }
  try {
    const anio = fechaActual.value.getFullYear();
    const mes = String(fechaActual.value.getMonth() + 1).padStart(2, '0');
    const dia = String(fechaActual.value.getDate()).padStart(2, '0');
    const fechaStr = `${anio}-${mes}-${dia}`;

    const { data, error } = await supabase
      .from('citas')
      .select('*') // Trae los datos planos de la cita sin romper el calendario
      .eq('sucursal_id', sucursalSeleccionada.value)
      .eq('fecha', fechaStr);

    if (error) throw error;
    listaCitas.value = data || [];
  } catch (err) {
    console.error("Error al obtener citas:", err.message);
    listaCitas.value = [];
  }
};
watch([sucursalSeleccionada, fechaActual], () => {
  obtenerCitas();
}, { immediate: true });

// Llama a esto cuando cambie la fecha o al montar
onMounted(() => {
  obtenerDatos();
  obtenerCitas();
});

// En tu <script setup>, actualiza esta función:
const abrirModalReserva = async () => {
  if (!sucursalSeleccionada.value) {
    return alert("⚠️ Por favor, selecciona una sucursal primero para poder agendar.");
  }
  
  // 1. Cargar pacientes (con su filtro de sucursal)
  await cargarPacientes(); 
  
  // 2. Cargar tratamientos (GLOBAL: sin filtro, para que siempre estén disponibles)
  const { data, error } = await supabase.from('tratamientos').select('*');
  if (!error) {
    listaTratamientos.value = data || [];
  }
  
  mostrarModalReserva.value = true;
};

// En tu Calendario.vue, busca esta función y reemplázala por esta:
const cargarPacientes = async () => {
  if (!sucursalSeleccionada.value) return; // Si no hay sucursal, no cargamos nada

  const { data, error } = await supabase
    .from('pacientes')
    .select('id, nombre')
    .eq('sucursal_id', sucursalSeleccionada.value); // <--- FILTRO MÁGICO
  
  if (error) {
    console.error("Error al cargar pacientes:", error.message);
  } else {
    listaPacientes.value = data || [];
    console.log("Pacientes de la sucursal actual:", listaPacientes.value);
  }
};

const guardarCita = async () => {
  // Validación básica
  if (!nuevaReserva.value.paciente_id || !nuevaReserva.value.fecha || !nuevaReserva.value.tratamiento) {
    return alert("⚠️ Por favor, completa todos los campos obligatorios.");
  }

  // Guardado en Supabase
  const { error } = await supabase.from('citas').insert([
    {
      paciente_id: nuevaReserva.value.paciente_id,
      fecha: nuevaReserva.value.fecha,
      hora: nuevaReserva.value.hora,
      tratamiento: nuevaReserva.value.tratamiento,
      sucursal_id: sucursalSeleccionada.value,
      nombre_paciente: listaPacientes.value.find(p => p.id === nuevaReserva.value.paciente_id)?.nombre,
      estado: 'pendiente' // 1. CLAVE: Asegura que nazca como pendiente para tus botones
    }
  ]);

  if (error) {
    alert("❌ Error al agendar: " + error.message);
    return;
  }

  alert("✅ Cita agendada con éxito");

  // Limpieza
  nuevaReserva.value = { paciente_id: null, fecha: '', tratamiento: '', hora: '08:00', notas: '' };
  mostrarModalReserva.value = false;
  
  // 2. CORRECCIÓN CLAVE: 'obtenerCitas' en minúscula para que recargue al instante sin reiniciar
  await obtenerCitas(); 
};

// En tu <script setup>, reemplaza o añade este computed:
// --- LÓGICA DE HORAS AM/PM ---
const horasDisponibles = computed(() => {
  return Array.from({ length: 24 }, (_, i) => {
    const ampm = i >= 12 ? 'PM' : 'AM';
    const hora12 = i % 12 === 0 ? 12 : i % 12;
    const horaFormateada = hora12.toString().padStart(2, '0');
    return {
      value: i.toString().padStart(2, '0') + ':00', // El valor real (08:00)
      label: `${horaFormateada}:00 ${ampm}`       // El texto que ve el usuario (08:00 AM)
    };
  });
});

const obtenerEstiloCita = (cita) => {
  if (!cita || !cita.hora) return { display: 'none' };
  
  const [h, m] = cita.hora.toString().substring(0, 5).split(':').map(Number);
  const topPosition = (h * 60) + m;

  return {
    position: 'absolute',
    top: `${topPosition}px`,
    left: '5px',
    right: '5px',
    height: '60px', 
    backgroundColor: cita.color || '#e0f2fe', // Azul pastel por defecto si no tiene color
    color: '#1e293b', // <-- FUERZA LA LETRA NEGRA/OSCURA EN TODO EL CALENDARIO
    padding: '4px',
    borderRadius: '4px',
    zIndex: 10,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)' // Un sutil relieve para los colores claros
  };
};
// Función para calcular la legibilidad del texto según el color de fondo
const obtenerColorTexto = (colorHex) => {
  if (!colorHex) return '#ffffff'; // Blanco por defecto si no hay color
  
  // Limpiamos el '#' si viene en el string
  const hex = colorHex.replace('#', '');
  
  // Convertimos el valor hexadecimal a componentes RGB
  const r = parseInt(hex.substring(0, 2), 16);
  
  // Fórmula estándar de luminiscencia para percibir el brillo real
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brillo = (r * 299 + g * 587 + b * 114) / 1000;
  
  // Si el brillo es alto (color claro), el texto es negro. Si es bajo (color oscuro), blanco.
  return brillo > 180 ? '#1e293b' : '#ffffff';
};
// --- ESTADOS PARA DETALLE DE CITA ---
const citaSeleccionadaDetalle = ref(null);
const mostrarTarjetaDetalle = ref(false);

// Función que se activa al presionar la cita para cargar los datos y abrir la tarjeta
const abrirDetalleCita = async (cita) => {
  // 1. Cargamos rápido los datos de la cita y ponemos estado de carga al profesional
  citaSeleccionadaDetalle.value = { 
    ...cita,
    celular: 'Cargando...',
    correo: 'Cargando...',
    nombre_profesional: 'Cargando...'
  };
  mostrarTarjetaDetalle.value = true;

  try {
    // 2. Buscamos el celular (telefono) y correo (email) en la tabla 'pacientes' por su nombre
    if (cita.nombre_paciente) {
      const { data: paciente, error: errPac } = await supabase
        .from('pacientes')
        .select('telefono, email, dx')
        .eq('id', cita.paciente_id)
        .maybeSingle();
      
      if (paciente && !errPac) {
        citaSeleccionadaDetalle.value.celular = paciente.telefono || 'No registrado';
        citaSeleccionadaDetalle.value.correo = paciente.email || 'No registrado';
        citaSeleccionadaDetalle.value.dx = paciente.dx || ''; // <-- Asigna el diagnóstico obtenido
      } else {
        citaSeleccionadaDetalle.value.celular = 'No encontrado';
        citaSeleccionadaDetalle.value.correo = 'No encontrado';
        citaSeleccionadaDetalle.value.dx = '';
      }
    }

    // 3. RELACIÓN CORRECTA: Buscamos en 'profesionales' usando el 'sucursal_id' de la cita
    if (cita.sucursal_id) {
      const { data: profesional, error: errPro } = await supabase
        .from('profesionales')
        .select('nombre')
        .eq('sucursal_id', cita.sucursal_id) // Filtra el profesional asignado a esta sucursal
        .maybeSingle();
      
      if (profesional && !errPro) {
        citaSeleccionadaDetalle.value.nombre_profesional = profesional.nombre;
      } else {
        citaSeleccionadaDetalle.value.nombre_profesional = 'No asignado';
      }
    } else {
      citaSeleccionadaDetalle.value.nombre_profesional = 'No asignado';
    }

  } catch (err) {
    console.error("Error al obtener los detalles de la cita:", err.message);
  }
};

const cambiarColorCita = async (nuevoColor) => {
  const citaId = citaSeleccionadaDetalle.value?.id;
  if (!citaId) return;
  
  try {
    // 1. Cambiamos el color de inmediato en la tarjeta del modal de detalles
    citaSeleccionadaDetalle.value.color = nuevoColor; 

    // 2. Buscamos y actualizamos la cita de forma local en el calendario para que cambie al instante
    const citaEnCalendario = listaCitas.value.find(c => c.id === citaId);
    if (citaEnCalendario) {
      citaEnCalendario.color = nuevoColor;
    }

    // 3. SOLUCIÓN PERMANENTE: Guardamos el cambio de color de forma real en Supabase
    const { error } = await supabase
      .from('citas')
      .update({ color: nuevoColor }) // Asegúrate de que la columna se llame 'color' en Supabase
      .eq('id', citaId);

    if (error) throw error;
    
  } catch (err) {
    console.error("Error crítico al persistir el color en Supabase:", err.message);
  }
};

// Función para cerrar la tarjeta de detalles
const cerrarTarjetaDetalle = () => {
  citaSeleccionadaDetalle.value = null;
  mostrarTarjetaDetalle.value = false;
};

const cerrarYLimpiarModal = () => {
  // 1. Ocultar el modal
  mostrarModalReserva.value = false;

  // 2. Resetear todas las variables vinculadas a los v-model del HTML
  if (nuevaReserva.value) {
    nuevaReserva.value.paciente_id = null; // Borra el paciente seleccionado (vuelve a 'Seleccionar paciente...')
    nuevaReserva.value.fecha = '';       // Borra la fecha
    nuevaReserva.value.tratamiento = ''; // Borra el tratamiento (vuelve a 'Seleccionar tratamiento...')
    nuevaReserva.value.hora = '';        // Borra la hora (vuelve a 'Seleccionar hora...')
  }
};

//---------------------------------------------------


//ATENDER O CABECELAR CITA

const actualizarEstadoCita = async (nuevoEstado) => {
  const citaId = citaSeleccionadaDetalle.value?.id;
  if (!citaId) return;
  
  try {
    const { error } = await supabase
      .from('citas')
      .update({ estado: nuevoEstado })
      .eq('id', citaId);

    if (error) throw error;
    
    // 1. CLAVE: Forzamos el cambio de estado en la propiedad reactiva local
    citaSeleccionadaDetalle.value.estado = nuevoEstado;
    
    // 2. Cerramos la tarjeta detalle
    mostrarTarjetaDetalle.value = false;
    
    // 3. Refrescamos el calendario para que la cajita de la cita pase de azul a verde al instante
    await obtenerCitas(); 
  } catch (err) {
    console.error("Error al actualizar el estado:", err.message);
  }
};

const cancelarEliminarCita = async () => {
  const citaId = citaSeleccionadaDetalle.value?.id;
  if (!citaId) {
    alert("Error: No se encontró el ID de la cita.");
    return;
  }
  
  if (!confirm("¿Estás seguro de que deseas cancelar y eliminar esta cita de forma definitiva?")) return;

  try {
    const { error } = await supabase
      .from('citas')
      .delete()
      .eq('id', citaId);

    if (error) throw error;
    
    mostrarTarjetaDetalle.value = false; // Cierra la tarjeta flotante
    await obtenerCitas(); // Limpia la cita del calendario por completo
  } catch (err) {
    console.error("Error al eliminar cita:", err.message);
    alert("Hubo un problema al eliminar la cita: " + err.message);
  }
};
//---------------------------------------------------------------------------------
// --- ESTADOS PARA TRATAMIENTOS ---
const editandoTratamiento = ref(null);
const tratamientoEnEdicion = ref(null); // ESTA ES LA QUE FALTABA
const listaTratamientos = ref([]);
const mostrarModalListaTratamientos = ref(false); // Para la lista
const mostrarModalTratamientos = ref(false);
const nuevoTratamiento = ref({
  nombre: '',
  precio: null
});
const abrirModalTratamientos = () => {
  if (!sucursalSeleccionada.value) {
    return alert("⚠️ Por favor, selecciona una sucursal primero.");
  }
  mostrarModalTratamientos.value = true;
};

const abrirListaTratamientos = async () => {
  // Ya no es necesario validar la sucursal si los tratamientos son globales
  mostrarModalListaTratamientos.value = true;
  
  // Quitamos el filtro .eq('sucursal_id', ...) para traer todo
  const { data, error } = await supabase
    .from('tratamientos')
    .select('*'); 

  if (error) {
    console.error("Error al obtener tratamientos:", error);
  } else {
    listaTratamientos.value = data || [];
  }
};
// Guardar en Supabase
const guardarTratamiento = async () => {
  if (!nuevoTratamiento.value.nombre || !nuevoTratamiento.value.precio) {
    return alert("Completa todos los campos");
  }

  if (tratamientoEnEdicion.value) {
    // ESTO ES PARA EDITAR (UPDATE)
    const { error } = await supabase
      .from('tratamientos')
      .update({ 
        nombre: nuevoTratamiento.value.nombre,
        precio: parseFloat(nuevoTratamiento.value.precio)
      })
      .eq('id', tratamientoEnEdicion.value);

    if (error) return alert("Error al actualizar: " + error.message);
    alert("Tratamiento actualizado");
  } else {
    // ESTO ES PARA CREAR NUEVO (INSERT)
    const { error } = await supabase
      .from('tratamientos')
      .insert([{ 
        nombre: nuevoTratamiento.value.nombre,
        precio: parseFloat(nuevoTratamiento.value.precio),
        sucursal_id: sucursalSeleccionada.value.id 
      }]);

    if (error) return alert("Error al guardar: " + error.message);
    alert("Tratamiento guardado");
  }

  // Limpiar y cerrar
  tratamientoEnEdicion.value = null;
  mostrarModalTratamientos.value = false;
  nuevoTratamiento.value = { nombre: '', precio: null };
  abrirListaTratamientos(); // Recargar la lista
};

//BOTONES DE LISTA DE TRATAMIENTOS

// Asegúrate de que esto exista
const tratamientoSeleccionado = ref(null);

const editarTratamiento = () => {
  console.log("Intentando editar...");
  
  if (!tratamientoSeleccionado.value) {
    alert("Primero selecciona un registro de la lista");
    return;
  }

  // Carga los datos
  nuevoTratamiento.value = { 
    nombre: tratamientoSeleccionado.value.nombre, 
    precio: tratamientoSeleccionado.value.precio 
  };
  tratamientoEnEdicion.value = tratamientoSeleccionado.value.id;

  // Cierra uno y abre el otro
  mostrarModalListaTratamientos.value = false;
  mostrarModalTratamientos.value = true;
  
  console.log("Modal debería estar abierto ahora");
};

const eliminarTratamiento = async () => {
  if (!tratamientoSeleccionado.value) {
    return alert("⚠️ Primero selecciona un tratamiento de la lista para eliminar.");
  }

  // Confirmación de seguridad
  const confirmar = confirm(`¿Estás seguro de eliminar "${tratamientoSeleccionado.value.nombre}"?`);
  if (!confirmar) return;

  // Lógica de eliminación en Supabase
  const { error } = await supabase
    .from('tratamientos')
    .delete()
    .eq('id', tratamientoSeleccionado.value.id);

  if (error) {
    console.error("Error al eliminar:", error);
    return alert("Error al eliminar: " + error.message);
  }

  alert("Tratamiento eliminado correctamente");
  
  // Limpiar selección y refrescar la lista
  tratamientoSeleccionado.value = null;
  abrirListaTratamientos(); // Esto vuelve a cargar los datos desde Supabase
};

const busquedaTratamientos = ref(''); // Lo que el usuario escribe

// Esta lista cambia automáticamente según lo que escribas
const tratamientosFiltrados = computed(() => {
  if (!busquedaTratamientos.value) return listaTratamientos.value;
  
  const termino = busquedaTratamientos.value.toLowerCase();
  return listaTratamientos.value.filter(t => 
    t.nombre.toLowerCase().includes(termino)
  );
});

//VER LISTA PACIENTES 

// --- ESTADOS PARA LISTA DE PACIENTES ---
const listaPacientes = ref([]);
const abrirModalLista = ref(false);

const abrirLista = async () => {
  if (!sucursalSeleccionada.value) return alert("Selecciona una sucursal");
  
  const { data, error } = await supabase
    .from('pacientes')
    .select('*')
    .eq('sucursal_id', sucursalSeleccionada.value) // <--- ESTO FILTRA POR SUCURSAL
    .order('id', { ascending: true });

  if (!error) {
    listaPacientes.value = data || [];
    abrirModalLista.value = true;
  }
};

//ver detalle paciente

// Variables para controlar el detalle
const pacienteSeleccionado = ref(null);
const mostrarModalDetalle = ref(false);

// Función que captura el paciente y abre el modal
const verDetalle = (p) => {
  pacienteSeleccionado.value = p; // Guarda todos los datos del paciente
  mostrarModalDetalle.value = true; // Abre el modal
};

//BUSCADOR paciente
const busqueda = ref('');
const obtenerPacientes = async () => {
  try {
    const { data, error } = await supabase
      .from('pacientes')
      .select('id, nombre'); // Asegúrate de que los nombres de columnas coincidan
    
    if (error) {
      console.error("Error desde Supabase:", error.message);
      return;
    }
    
    // Verifica que 'data' contenga los pacientes
    console.log("Pacientes obtenidos:", data);
    listaPacientes.value = data; 
  } catch (err) {
    console.error("Error inesperado:", err);
  }
};
// Esta función busca en Supabase en tiempo real
const buscarEnSupabase = async () => {
  if (busqueda.value.length < 2) { // Solo busca si hay más de 2 letras
    obtenerPacientes(); // Si borra todo, muestra la lista completa
    return;
  }

  const { data, error } = await supabase
    .from('pacientes')
    .select('*')
    .ilike('nombre', `%${busqueda.value}%`); // Busca coincidencias parciales

  if (!error) {
    listaPacientes.value = data;
  }
};

//CITAS REGRITADAS EN EL CALENDARIO
const formatearHora = (hora) => {
  const ampm = hora >= 12 ? 'PM' : 'AM';
  // Mantenemos la hora en formato 24h (00-23) y añadimos el sufijo
  return `${hora.toString().padStart(2, '0')}:00 ${ampm}`;
};





</script>

<template>

  <link href="https://fonts.googleapis.com/css2?family=Lemon&display=swap" rel="stylesheet"> 
  <div class="dashboard-wrapper">
    <aside class="sidebar">
      <div class="logo-box">
  <button @click="volverAlHome" class="btn-back">←</button>
  <img src="../assets/Icono.jpeg" alt="Logo" class="logo" />
</div>

      <div class="sucursal-actions">
        <button @click="toggleFormularioSucursal" class="btn-action add">+ Nueva Sucursal</button>
        <button @click="prepararEdicion" class="btn-action">Editar</button>
        <button @click="eliminarSucursal" class="btn-action delete">Eliminar</button>
      </div>

      <!-- MODALES -->
    <div v-if="mostrarFormularioSucursal" class="sucursal-form-inline">
  <h3 style="margin-bottom: 5px;">Nueva Sucursal</h3>
  
  <div class="input-group">
    <label>Nombre de Sucursal</label>
    <input v-model="nombreSucursal" placeholder="Ej. Sucursal Miraflores" class="search-input" />
  </div>
  
  <div class="input-group">
    <label>Profesional a cargo</label>
    <input v-model="nombreProfesional" placeholder="Ej. Nombre del profesional" class="search-input" />
  </div>

  <div class="form-actions">
    <button @click="guardarSucursal" class="btn-primary">Guardar</button>
    <button @click="mostrarFormularioSucursal = false" class="btn-action">Cancelar</button>
  </div>
</div>

 <div class="sidebar-section">
  <label>Sucursal</label>
  <div class="input-with-actions">
    <select v-model="sucursalSeleccionada" class="search-input">
  <option :value="null" disabled>Seleccione una sucursal</option>
  <option v-for="suc in listaSucursales" :key="suc.id" :value="suc.id">
    {{ suc.nombre }}
  </option>
</select>
  </div>
</div>

      <div class="sidebar-section">
        <label>Estado de Reserva</label>
        <select v-model="estadoReserva" class="search-input">
          <option value="activas">Activas</option>
        </select>
      </div>

    
      <div class="sidebar-section pro-section">
  <label>Profesionales</label>
  
  <div class="avatar-list">
    <div v-for="pro in profesionalesFiltrados" :key="pro.id" class="avatar-item">
      <img src="../assets/pie.webp" alt="Podología" class="avatar-icon" />
      <span>{{ pro.nombre }}</span>
    </div>

    <div v-if="sucursalSeleccionada && profesionalesFiltrados.length === 0" style="font-size: 12px; color: #94a3b8; font-style: italic;">
      No hay profesionales asignados.
    </div>
    <div v-if="!sucursalSeleccionada" style="font-size: 12px; color: #0d9488; font-style: italic;">
      Selecciona una sucursal para ver profesionales.
    </div>
  </div>
</div>
    </aside>

    <main class="main-calendar">
      <div class="calendar-wrapper">
        <header class="calendar-header">
          <div class="nav-controls">
            <button @click="irAHoy" class="btn-nav">Hoy</button>
            <div class="date-nav-group" :class="{ 'es-hoy': esHoy }">
              <button @click="cambiarDia(-1)" class="btn-icon">◀</button>
              <h2 class="fecha-display">{{ fechaFormateada }}</h2>
              <button @click="cambiarDia(1)" class="btn-icon">▶</button>
            </div>
          </div>

          <div class="sucursal-badge">
            {{ nombreSucursalActiva }}
          </div>
          
          <div class="actions-group">
  <button @click="abrirModalTratamientos" class="btn-secondary btn-tratamiento">Tratamientos</button>
  <button @click="abrirModalReserva" class="btn-secondary btn-agendar">Agendar cita</button>
  <button @click="abrirModalPaciente" class="btn-secondary btn-paciente">Registrar Paciente</button>
</div>
</header>

<div class="scroll-container">
  <div class="grid-layout">
    <div class="time-col">
      <div v-for="h in 24" :key="h" class="hour-slot">{{ formatearHora(h - 1) }}</div>
    </div>

<div class="days-col">
  <div v-if="sucursalSeleccionada && listaCitas.length === 0" class="empty-state">
    No hay citas registradas en esta sucursal para hoy.
  </div>
  
  <div v-for="cita in listaCitas" 
     :key="cita.id" 
     class="cita-card" 
     :style="obtenerEstiloCita(cita)"> <button class="btn-interactivo-cita" @click="abrirDetalleCita(cita)" type="button">
        <strong>{{ cita.nombre_paciente || 'Sin nombre' }}</strong>
         <br>
         <span class="cita-tratamiento-txt">{{ cita.tratamiento || 'Sin tratamiento' }}</span>
         <br>
         <span>{{ cita.hora ? cita.hora.substring(0, 5) : 'Sin hora' }}</span>
    </button>
</div>
         </div>
        </div>
       </div>
      </div>
    </main>


    <!-- DETALLE DE CITAS -->

<div v-if="mostrarTarjetaDetalle && citaSeleccionadaDetalle" class="modal-overlay" @click.self="cerrarTarjetaDetalle">
  <div class="modal-content detail-card-pop">
    
    <button class="btn-close-x" @click="cerrarTarjetaDetalle">×</button>
    
    <div class="detail-header-left">
      <h3>{{ citaSeleccionadaDetalle.nombre_paciente || 'Sin nombre' }}</h3>
      <span class="badge-tratamiento">{{ citaSeleccionadaDetalle.tratamiento || 'Sin tratamiento' }}</span>
    </div>
    
    <div class="detail-body">
      <div class="info-row"><strong>Fecha:</strong> <span>{{ fechaFormateada }}</span></div>
      <div class="info-row"><strong>Hora:</strong> <span>{{ citaSeleccionadaDetalle.hora ? citaSeleccionadaDetalle.hora.substring(0, 5) : 'Sin hora' }}</span></div>
      <div class="info-row"><strong>Atendido por:</strong> <span>{{ citaSeleccionadaDetalle.nombre_profesional || 'No asignado' }}</span></div>
      
      <div class="info-row">
  <strong>Celular:</strong> 
  <span class="celular-container">
    {{ citaSeleccionadaDetalle.celular || 'No registrado' }}
    <a v-if="citaSeleccionadaDetalle.celular && citaSeleccionadaDetalle.celular !== 'No registrado' && citaSeleccionadaDetalle.celular !== 'Cargando...'" 
       :href="`https://api.whatsapp.com/send?phone=51${citaSeleccionadaDetalle.celular}&text=Hola%20${encodeURIComponent(citaSeleccionadaDetalle.nombre_paciente || 'Paciente')},%20le%20escribimos%20de%20J%20%26%20M%20Podolog%C3%ADa%20y%20Reflexologia%20para%20confirmar%20su%20cita%20el%20d%C3%ADa%20${encodeURIComponent(fechaFormateada)}%20a%20las%20${encodeURIComponent(citaSeleccionadaDetalle.hora ? citaSeleccionadaDetalle.hora.substring(0, 5) : '')}%20${citaSeleccionadaDetalle.hora && parseInt(citaSeleccionadaDetalle.hora.substring(0, 2)) >= 12 ? 'PM' : 'AM'}.`" 
       target="_blank" 
       class="link-whatsapp-inline"
       style="color: #25d366; font-weight: bold; margin-left: 5px; text-decoration: none;">
       (Hablar por WhatsApp)
    </a>
  </span>
</div>

      <div class="info-row"><strong>Correo:</strong> <span>{{ citaSeleccionadaDetalle.correo || 'No registrado' }}</span></div>

      <div class="info-row">
        <strong>Diagnóstico:</strong>
        <span>{{ citaSeleccionadaDetalle.dx || 'Sin diagnóstico' }}</span>
      </div>

      

      <div class="info-row" style="margin-top: 5px !important;">
        <strong>Color de tarjeta:</strong>
        <div class="color-picker-container">
          <button 
            v-for="color in ['#84C0E2', '#fef08a', '#EBADE2', '#a7f3d0', '#F28A94', '#BF9EFA']" 
            :key="color"
            type="button"
            class="color-circle-btn"
            :style="{ backgroundColor: color }"
            :class="{ 'color-activo': citaSeleccionadaDetalle.color === color }"
            @click="cambiarColorCita(color)">
          </button>
        </div>
      </div>
    </div>

    <div class="detail-footer" style="margin-top:5px !important; margin-bottom: 15px !important; padding: 0 !important;">
        <template v-if="citaSeleccionadaDetalle && citaSeleccionadaDetalle.estado === 'confirmada'">
  <div class="texto-paciente-atendida" style="width: 100%; text-align: center; font-weight: 700; color: #15803d; background-color: #dcfce7; padding: 12px !important; border-radius: 10px !important; border: 1px solid #bbf7d0; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 14px; box-shadow: 0 2px 4px rgba(21, 128, 61, 0.05); margin: -9px 0 25px 0 !important;">
    <i class="fas fa-check-circle" style="font-size: 16px; color: #16a34a;"></i> Paciente Atendido Correctamente
  </div>
</template>

        <template v-else>
          <button type="button" @click="actualizarEstadoCita('confirmada')" class="btn-detalle-action btn-atender">
            Atender Paciente
          </button>
          <button type="button" @click="cancelarEliminarCita" class="btn-detalle-action btn-cancelar-cita">
            Eliminar Cita
          </button>
        </template>
      </div>

  </div>
</div>


    <!-- MODAL PACIENTE -->
 <div v-if="mostrarModalPaciente" class="modal-overlay" @click.self="mostrarModalPaciente = false">
  <div class="modal-content">
    <div class="modal-header">
      <div class="header-row">
        <h2>{{ modoEdicion ? 'Modificar Paciente' : 'Registrar Paciente' }}</h2>
        <button class="btn-ver-lista" type="button" @click.stop="abrirLista">Ver Lista</button>
      </div>
      <img src="../assets/Icono.jpeg" alt="Logo" class="modal-logo" />
    </div>
    
    <input v-model="nuevoPaciente.nombre" @input="nuevoPaciente.nombre = $event.target.value.toUpperCase()" placeholder="NOMBRE COMPLETO" />
    <input v-model="nuevoPaciente.telefono" @input="nuevoPaciente.telefono = $event.target.value.toUpperCase()" placeholder="TELÉFONO" />
    <input v-model="nuevoPaciente.email" @input="nuevoPaciente.email = $event.target.value.toUpperCase()" placeholder="CORREO ELECTRÓNICO" />
    <input v-model="nuevoPaciente.dx" @input="nuevoPaciente.dx = $event.target.value.toUpperCase()" placeholder="DIAGNÓSTICO (DX)" />
    <textarea v-model="nuevoPaciente.notas" @input="nuevoPaciente.notas = $event.target.value.toUpperCase()" placeholder="NOTAS INTERNAS"></textarea>
    
    <div class="modal-actions">
<button class="btn-cancelar" @click="cancelarAccion">Cancelar</button> 

<button class="btn-guardar" @click="guardarPaciente">
  {{ modoEdicion ? 'Actualizar Paciente' : 'Guardar Paciente' }}
</button>
    </div>
  </div>
</div>


    <!-- VER LISTA -->
<div v-if="abrirModalLista" class="modal-overlay" @click.self="abrirModalLista = false">
  <div class="modal-content">
    <div class="modal-header">
      <div class="header-row">
        <h2>LISTA PACIENTES</h2>
<button class="btn-ver-lista" @click="cerraryRegresar">Cerrar</button>      
</div>
      <img src="../assets/Icono.jpeg" alt="Logo" class="modal-logo" />
    </div>

<div class="search-container">
  <input 
    type="text" 
    v-model="busqueda" 
    @input="buscarEnSupabase"  placeholder="Buscar..."
    class="search-input"
  />
</div>

    
    <div style="flex: 1; overflow-y: auto; margin-top: 20px;">
      <div v-for="(p, index) in listaPacientes" :key="p.id" class="fila-paciente">
  <span class="nombre-paciente">{{ index + 1 }}. {{ p.nombre }}</span>
  
  <div class="lista-acciones">
    <button class="btn-icon ver" @click="verDetalle(p)" title="Ver">
      <ion-icon name="eye-outline"></ion-icon>
    </button>
    <button class="btn-icon editar" @click="editarPaciente(p)" title="Editar">
      <ion-icon name="pencil-outline"></ion-icon>
    </button>
    <button class="btn-icon eliminar" @click="eliminarPaciente(p.id)" title="Eliminar">
      <ion-icon name="trash-outline"></ion-icon>
    </button>
  </div>
</div>
      <div v-if="listaPacientes.length === 0" style="text-align: center; color: #888; margin-top: 20px;">
        No hay pacientes registrados.
      </div>
    </div>
  </div>
</div>

    <!-- VER DETALLE -->

<div v-if="mostrarModalDetalle" class="modal-overlay" @click.self="mostrarModalDetalle = false">
  <div class="modal-content">
    <div class="header-detalle">
      <h2>Ficha Médica</h2>
<button class="btn-cerrar-icon" @click="mostrarModalDetalle = false">
    <ion-icon name="close-circle-outline"></ion-icon>
  </button>    </div>

    <div class="lista-detalles">
      <div class="campo-dato">
        <label>NOMBRE COMPLETO</label>
        <p>{{ pacienteSeleccionado.nombre }}</p>
      </div>
      <div class="campo-dato">
        <label>TELÉFONO</label>
        <p>{{ pacienteSeleccionado.telefono }}</p>
      </div>
      <div class="campo-dato">
        <label>CORREO ELECTRÓNICO</label>
        <p>{{ pacienteSeleccionado.email }}</p>
      </div>
      <div class="campo-dato">
        <label>DIAGNÓSTICO (DX)</label>
        <p>{{ pacienteSeleccionado.dx }}</p>
      </div>
      <div class="campo-dato">
        <label>NOTAS INTERNAS</label>
        <p>{{ pacienteSeleccionado.notas }}</p>
      </div>
    </div>
  </div>
</div>

    <!-- MODAL AGENDAR CITA-->

 <div v-if="mostrarModalReserva" class="modal-overlay">
  <div class="modal-content">
    <div class="modal-header-container">
      <h2 style="color: #0d9488; margin: 0;">Agendar Nueva Cita</h2>
      <img src="../assets/Icono.jpeg" alt="Logo" class="modal-logo-header" />
    </div>

    <div class="modal-body">
      <div class="field-group">
        <label class="modal-label">Paciente</label>
        <select v-model="nuevaReserva.paciente_id" class="search-input">
          <option :value="null" disabled>Seleccionar paciente...</option>
          <option v-for="p in listaPacientes" :key="p.id" :value="p.id">{{ p.nombre }}</option>
        </select>
      </div>

      <div class="field-group">
        <label class="modal-label">Fecha</label>
        <input type="date" v-model="nuevaReserva.fecha" class="search-input" />
      </div>

      <div class="field-group">
  <label class="modal-label">Tratamiento</label>
  <select v-model="nuevaReserva.tratamiento" class="search-input">
    <option value="" disabled>Seleccionar tratamiento...</option>
    <option 
      v-for="t in listaTratamientos" 
      :key="t.id" 
      :value="t.nombre" 
    >
      {{ t.nombre }}
    </option>
  </select>
</div>

      <div class="field-group">
        <label class="modal-label">Horario</label>
        <select v-model="nuevaReserva.hora" class="search-input">
              <option value="" disabled>Seleccionar hora...</option>

          <option v-for="h in horasDisponibles" :key="h.value" :value="h.value">{{ h.label }}</option>
        </select>
      </div>
    </div>

    <div class="modal-actions">
<button class="btn-cancelar" @click="cerrarYLimpiarModal">Cancelar</button>      <button class="btn-guardar" @click="guardarCita">Agendar Cita</button>
    </div>
  </div>
</div>

    <!-- MODAL TRATAMIENTOS-->
<div v-if="mostrarModalTratamientos" class="modal-overlay" @click.self="mostrarModalTratamientos = false">
  <div class="modal-content" style="padding: 24px !important; border-radius: 16px !important; max-width: 400px; width: 100%;">
    
    <div class="header-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px !important;">
      <h2 style="color: #008080; margin: 0; font-size: 20px; font-weight: bold;">
        {{ editandoTratamiento ? 'Editar Tratamiento' : 'Nuevo Tratamiento' }}
      </h2>
      <img src="../assets/Icono.jpeg" alt="Logo" style="width: 42px; height: 42px; border-radius: 8px; object-fit: cover;" />
    </div>

    <div style="margin-bottom: 24px !important; display: flex; justify-content: flex-start;">
      <button class="btn-ver-lista" @click="abrirListaTratamientos" style="border-radius: 8px !important; padding: 12px 25px!important; font-weight: 600 !important; background-color: #f1f5f9 !important; color: #008080 !important; border: 1px dashed #008080 !important; cursor: pointer !important; transition: all 0.2s !important; display: flex; align-items: center; gap: 6px; font-size: 13px; width: auto !important;">
        <i class="fas fa-list-ul"></i> Ver Lista
      </button>
    </div>
    
    <div style="margin-bottom: 18px !important;">
      <label class="modal-label" style="display: block; margin-bottom: 8px !important; font-weight: 600; color: #475569; font-size: 13px;">Nombre del Tratamiento</label>
      <input v-model="nuevoTratamiento.nombre" class="search-input" placeholder="Ej: Podología Preventiva" style="width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 8px; border: 1px solid #cbd5e1;" />
    </div>

<div style="margin-bottom: 28px !important;">
  <label class="modal-label" style="display: block; margin-bottom: 8px !important; font-weight: 600; color: #475569; font-size: 13px;">Precio del Servicio</label>
  <div style="position: relative; display: flex; justify-content: center; align-items: center;">
    <div style="position: relative; width: 100%; max-width: 180px;">
      <span style="position: absolute; left: 20px; top: 50%; transform: translateY(-50%); color: #008080; font-weight: bold; font-size: 16px; pointer-events: none;">S/</span>
      <input 
        v-model="nuevoTratamiento.precio" 
        type="number" 
        class="search-input" 
        placeholder="0.00" 
        style="width: 100%; box-sizing: border-box; padding: 12px 12px 12px 45px; border-radius: 10px; border: 1px solid #cbd5e1; text-align: center; font-size: 18px; font-weight: bold; color: #0f172a; background-color: #f8fafc; transition: all 0.2s;" 
      />
    </div>
  </div>
</div>

   <div class="modal-actions" style="display: flex !important; gap: 12px !important; margin-top: 0 !important; padding: 0 !important;">
  <button class="btn-guardar" @click="guardarTratamiento" style="border-radius: 10px !important; padding: 12px !important; font-weight: 600 !important; flex: 1 !important; cursor: pointer !important; background-color: #008080; color: white; border: none;">
    {{ editandoTratamiento ? 'Actualizar' : 'Guardar' }}
  </button>
  <button class="btn-cancelar" @click="mostrarModalTratamientos = false" style="border-radius: 10px !important; padding: 12px !important; font-weight: 600 !important; flex: 1 !important; cursor: pointer !important; background-color: #fee2e2; color: #ef4444; border: none;">
    Cerrar
  </button>
</div>

  </div>
</div>

    <!-- LISTA DE TRATAMIENTOS -->

<div v-if="mostrarModalListaTratamientos" class="modal-overlay" @click.self="mostrarModalListaTratamientos = false">
  <!-- Agregamos la clase .modal-flex-container para controlar el botón -->
  <div class="modal-content custom-list-modal modal-flex-container">
    
    <div class="modal-header">
      <h2>LISTA DE TRATAMIENTOS</h2>
      <img src="../assets/Icono.jpeg" class="modal-logo" />
    </div>

    <div class="search-container">
      <input type="text" v-model="busquedaTratamientos" placeholder="🔍 BUSCAR TRATAMIENTO..." class="search-input" />
    </div>

    <!-- Contenedor que crece o se encoge, pero siempre deja espacio al botón -->
    <div class="lista-items-wrapper">
  <div v-if="tratamientosFiltrados.length > 0" class="lista-items">
    <div v-for="t in tratamientosFiltrados" 
         :key="t.id" 
         class="fila-tratamiento-card"
         :class="{ 'seleccionado': tratamientoSeleccionado?.id === t.id }"
         @click="tratamientoSeleccionado = t">
      <span class="nombre-trat">{{ t.nombre.toUpperCase() }}</span>
      <span class="precio-badge">S/ {{ t.precio }}</span>
    </div>
  </div>
  <div v-else class="empty-state">
    No se encontraron resultados.
  </div>
</div>


 <div class="footer-acciones">
  <button type="button" class="btn-accion btn-editar" @click.stop="editarTratamiento">
    <ion-icon name="pencil-sharp"></ion-icon>
  </button>
  
  <button type="button" class="btn-accion btn-eliminar" @click.stop="eliminarTratamiento">
    <ion-icon name="trash-outline"></ion-icon>
  </button>
  
  <button type="button" class="btn-cerrar-full" @click.stop="mostrarModalListaTratamientos = false">
    Cerrar
  </button>
</div>

  </div>
</div>





  </div>
</template>





<style scoped>


.logo-container {
  display: flex;
  align-items: center;
  gap: 15px; /* Espacio entre la flecha y el logo */
  margin-bottom: 10px;
}

.btn-back {
  background: #e6f6f3; /* Color turquesa bajito */
  color: #0d9488;      /* Color turquesa oscuro */
  border: 1px solid #0d9488;
  width: 35px;
  height: 35px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-back:hover {
  background: #0d9488;
  color: white;
}


/* Aplicar el borde al contenedor principal del calendario */
.scroll-container {
  flex: 1;
  overflow-y: auto;
  border: 3px solid #0d9488; /* Opcional: si quieres borde interno también */
  border-radius: 20px;
  gap: 8px; /* Espacio entre el header y el scroll */

}


/* Contenedor que agrupa la fecha y el calendario */
.calendar-wrapper {
  margin-left: 5px;
  flex: 1;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 32px);
  box-sizing: border-box;
  gap: 8px; /* Espacio entre el header y el scroll */
} 




/* Ajuste del header dentro del nuevo contenedor */
.calendar-header {
  background: white;
  padding: 16px 24px;
  border-radius: 20px; /* Radio consistente */
  border: 3px solid #0d9488; /* Opcional: si quieres borde interno también */
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: none;
  margin-bottom: 0; /* Ya no necesitamos margen abajo porque usamos 'gap' en el wrapper */
} 




/* Reset Global */
.dashboard-wrapper {
  display: flex;
  height: 100vh;
  width: 100vw;
  margin: 0 !important;
  padding: 16px;
  background-color: #f8fafc;
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  box-sizing: border-box;
  gap: 8px;
}

/* Sidebar Estilo Profesional */
.sidebar {
  width: 280px;
  background: white;
  border: 3px solid #0d9488;
  border-radius: 24px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  height: calc(100vh - 32px);
  box-sizing: border-box;
}

.logo { width: 60px; height: 60px; border-radius: 12px; object-fit: cover; }

/* Etiquetas: Negras, gruesas y resaltadas */
.sidebar-section label {
  font-size: 11px;
  font-weight: 900;
  color: #000000;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
  
}
.sidebar-section input[type="text"] {
  width: calc(100% - 8px); /* Reduce el ancho ligeramente */
  margin: 0 4px;           /* Crea un margen lateral de 4px */
  height: 40px;            /* Reduce la altura como querías */
  padding: 8px 12px;       /* Ajusta el espacio interno */
  box-sizing: border-box;  /* Asegura que el padding no desborde el ancho */
}
/* Inputs y Selects */
.search-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #325a8e;
  border-radius: 10px;
  background: #f8fafc;
  color: #065b60;
  font-weight: 600;
}

/* Acciones en los inputs */
.input-with-actions { display: flex; align-items: center; gap: 6px; }
.action-icons { display: flex; gap: 2px; }
.icon-btn {
  background: #f1f5f9;
  border: none;
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  color: #475569;
  font-weight: bold;
} 

/* Profesionales */

/* Nuevo estilo para la imagen del icono */
.avatar-icon {
  width: 30px;
  height: 30px;
  object-fit: contain; /* Asegura que la imagen no se deforme */
  border-radius: 50%;  /* Mantiene el estilo circular */
  background: #f1f5f9; /* Fondo suave por si la imagen tiene transparencia */
  padding: 4px;        /* Un poco de aire alrededor del icono */
}
/* Contenedor principal de la sección */
.pro-section {
  margin-top: 25px;
  padding-top: 20px;
  /* Esta es la línea divisoria turquesa bajito */
  border-top: 2px solid #e6f6f3; 
}

/* Lista de profesionales */
.avatar-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 15px;
}

/* Cada ítem del profesional */
.avatar-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 12px;
  background: #ffffff;
  /* Borde turquesa bajito */
  border: 1px solid #e6f6f3; 
  border-radius: 14px;
  transition: all 0.25s ease;
}

/* Opcional: Para que resalte un poco más al pasar el mouse */
.avatar-item:hover {
  border-color: #0d9488;
}

/* Círculo de color */
.avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* Nombre del profesional */
.avatar-item span {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  font-family: 'Inter', sans-serif;
}
/* Calendario */
.main-calendar {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 32px); /* Mismo cálculo que el sidebar */
  overflow: hidden;
  box-sizing: border-box;
}

.btn-primary { background: #0d9488; color: white; padding: 10px 20px; border-radius: 12px; border: none; cursor: pointer; }

/* Scroll y Horas */
/* 1. Asegura que el contenedor no tenga desbordamiento extra */
.scroll-container { 
  flex: 1; 
  overflow-y: auto; 
  background: white; 
  border-radius: 20px;
  /* Esto evita que el scroll se pase de largo */
  display: flex; 
  flex-direction: column;
}

/* 2. Define la altura exacta de las 24 horas (24 * 60px = 1440px) */
.grid-layout {
  display: grid;
  grid-template-columns: 70px 1fr;
  height: 1440px; 
}

/* 3. Aplica border-box para que los bordes no sumen píxeles extra */
.time-col, .hour-slot {
  box-sizing: border-box;
}

.time-col { 
  width: 70px; 
  background: white; 
  border-right: 1px solid #f1f5f9; 
  flex-shrink: 0; 
}



.hour-slot { 
  height: 60px; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  color: #161616; 
  font-size: 11px; 
  font-weight: 700;
  border-bottom: 1px solid #f1f5f9; /* Opcional: mantén tus bordes */
}
/*------------------------------------------------------------------*/ 

/* Contenedor de la fecha para que esté en el centro */
.nav-controls {
  display: flex;
  align-items: center;
  gap: 20px;
}

.date-nav-group {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f8fafc;
  padding: 4px 16px;
  border-radius: 50px; /* Forma de pastilla */
  border: 1px solid #e2e8f0;
}

.fecha-display {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  min-width: 220px; /* Para que no salte al cambiar de día */
  text-align: center;
  text-transform: capitalize;
}

/* Estilo para los botones de navegación */
.btn-icon {
  background: white;
  border: 1px solid #cbd5e1;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #0d9488;
  color: white;
  border-color: #0d9488;
}

.btn-nav {
  background: #e6f6f3; /* Turquesa bajito (fondo claro) */
  color: #0d9488;      /* Texto turquesa oscuro para contraste */
  border: 1px solid #0d9488;
  padding: 6px 16px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease; /* Transición suave al pasar el mouse */
}

.btn-nav:hover {
  background: #0d9488; /* Turquesa fuerte */
  color: white;        /* Texto blanco */
  border-color: #0d9488;
} 
/* Botones */
/* --- BOTONES DE ACCIÓN --- */
.actions-group { 
  display: flex; 
  gap: 8px; 
}

/* Estilo base compartido */
.btn-secondary { 
  padding: 10px 20px; 
  border-radius: 12px; 
  border: none; 
  cursor: pointer; 
  color: white !important;
  font-weight: 600;
  transition: opacity 0.2s;
}

/* Colores distintos (aquí forzamos el color) */
.btn-tratamiento { background-color: #065b60 !important; }
.btn-agendar     { background-color: #325a8e !important; }
.btn-paciente    { background-color: #0d9488 !important; }

/* Aseguramos que no tengan opacidad */
.btn-secondary:hover { opacity: 0.9; }

/* Color turquesa suave cuando la fecha es el día de hoy */
.date-nav-group.es-hoy {
  background: #e6f6f3 !important; /* Turquesa muy clarito */
  border: 1px solid #0d9488 !important;
}

/* Para resaltar el texto de la fecha cuando es hoy */
.es-hoy .fecha-display {
  color: #0c0c0c;
  font-weight: 800;
}

/* Cuando NO es hoy, el fondo vuelve a ser blanco (por defecto) */
.date-nav-group {
  transition: all 0.3s ease; /* Transición suave al cambiar */
}

/*-------------sucursal-------------------------------------------- */
.sucursal-badge {
  /* Fondo y colores */
  background: transparent; 
  color: #0d9488;
  
  /* Quitamos el borde como pediste */
  border: none; 
  
  font-family: "cooper Black", Times, serif;
  /* Ajuste de tamaño y fuente */
  padding: 8px 20px;
  font-size: 25px; /* Letra un poco más grande */
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  
  /* Centrado y disposición */
  display: flex;
  align-items: center;
  justify-content: center;
  
  /* Transición */
  transition: all 0.3s ease;
}

/* Opcional: Si quieres que siga sintiéndose interactivo al pasar el mouse */
.sucursal-badge:hover {
  color: #055952; /* Un tono un poco más oscuro al pasar el mouse */
  cursor: default;
}

/*BOTONES */
:root {
  --color-principal: #008080; /* Turquesa fuerte */
  --color-secundario: #00a8a8; /* Turquesa claro */
  --color-fondo-modal: #f8ffff; /* Turquesa muy pálido para fondos */
  --color-borde: #325a8e;       /* Un contraste azulado profesional */
  --color-texto: #065b60;       /* Turquesa oscuro para legibilidad */
}

.sucursal-box {
  background: #ffffff;
  border: 1px solid #e2e8f0; /* Borde sutil */
  border-radius: 12px;       /* Bordes redondeados */
  padding: 12px;             /* Espacio interno (respiración) */
  margin-top: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02); /* Sombra muy suave */
}

.sucursal-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 9px;          /* Espacio entre el select y los botones */
  padding-top: 10px;
  border-top: 1px solid #f1f5f9; /* Línea divisoria elegante */
}

.btn-action {
  background: none;
  border: none;
  font-size: 10px;
  font-weight: 800;
  color: #64748b;
  cursor: pointer;
  padding: 4px;
}

.btn-action.add { color: #0d9488; }
.btn-action.delete:hover { color: #e11d48; }
/* Efecto de color al pasar el cursor */
.btn-action:hover {
  color: #0f172a;           /* Oscurece el texto */
  background: #9bc0e4;     /* Un gris muy suave de fondo */
  border-radius: 6px;      /* Redondea un poco el fondo al pasar */
}

/* Color específico para añadir cuando pasas el mouse */
.btn-action.add:hover {
  background: #0d9488;     /* Fondo turquesa */
  color: #ffffff;          /* Texto blanco */
}

/* Color específico para eliminar cuando pasas el mouse */
.btn-action.delete:hover {
  background: #e11d48;     /* Fondo rojo */
  color: #ffffff;          /* Texto blanco */
}

/*NUEVA SICURSAL*/
.sucursal-form-inline {
  background: #ffffff;
  padding: 16px;
  border-radius: 16px;
  border: 2px solid #0d9488;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 10px 0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

/* Título dentro del formulario */
.sucursal-form-inline h3 {
  font-size: 12px;
  margin: 0;
  color: #0d9488;
  text-transform: uppercase;
  font-weight: 800;
}

/* Inputs para que tengan el mismo estilo que los demás */
.sucursal-form-inline .search-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-sizing: border-box;
}

/* Botones alineados a la derecha */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 5px;
}

/* Asegurar que el modal de paciente no interfiera */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.input-group label {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  color: #0d9488; /* El mismo turquesa de tu marca */
  padding-left: 4px;
}

/* Asegurar que el formulario no se superponga */
.sucursal-form-inline {
  background: #ffffff;
  padding: 15px;
  border-radius: 16px;
  border: 2px solid #0d9488;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 10px 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
/*------------------------------------------------------------ */
/*BOTONES */
/* AGREGAR PACINETE NUEVO*/

.modal-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.3);
  display: flex; justify-content: center; align-items: center;
  z-index: 1000;
}
.modal-content input, 
.modal-content textarea {
  text-transform: uppercase;
font-family: sans-serif; 
/* Esto usa la fuente predeterminada del sistema (Arial, Roboto, etc.) */}
.modal-content {
  font-family: 'Lemon'; /* Aplica la fuente Lemon */
  background: white; padding: 25px; border-radius: 20px;
  width: 450px; border: 2px solid #008080;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.modal-header h2 { color: #004d4d; font-size: 24px; margin: 0; }
.modal-logo { width: 50px; }
input, textarea {
  width: 100%; padding: 12px; margin-bottom: 12px;
  border: 1px solid #ccc; border-radius: 8px; box-sizing: border-box;
}
.modal-actions { display: flex; gap: 15px; }
.btn-cancelar { flex: 1; padding: 10px; border-radius: 8px; border: none; background: #e0e0e0; cursor: pointer; }
.btn-guardar { flex: 1; padding: 10px; border-radius: 8px; border: none; background: #008080; color: white; cursor: pointer; }

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.btn-ver-lista {
  background: #f0fdfa;       /* Color turquesa muy suave */
  color: #008080;            /* Color principal */
  border: 1px solid #008080;
  padding: 4px 12px;
  border-radius: 20px;       /* Muy redondeado para verse moderno */
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-ver-lista:hover {
  background: #008080;
  color: white;
}




/*--------------------AGENDAR CITA--------------------- */
.modal-label {
  margin: 0 0 4px 0 !important;
  font-weight: 600;
  font-size: 14px;
  color: #334155;
}
/* Contenedor del Modal */
.modal-content {
  background: white;
  width: 450px;
  max-height: 90vh;
  border-radius: 16px;
  padding: 15px;
  display: flex;
  flex-direction: column;
box-shadow: 0 20px 40px rgba(0,0,0,0.15);  position: relative;
  gap: -9px;
  max-height: 90vh; /* Para que no se salga de la pantalla */
  overflow-y: auto;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 4px; /* Espacio corto entre el label y su input */
  margin-bottom: 5px; /* Separación uniforme hacia el siguiente campo */
}
/* Cuerpo con scroll solo si es necesario */
.modal-body {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: -15px;
  padding-right: 5px;
}

/* Inputs y Selects */
.search-input {
  width: 100%; padding: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background-color: #f8fafc;
  font-size: 13px;
}

/* Asegurar que el logo esté a la derecha */
.modal-header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.modal-logo-header {
  width: 45px;
  height: 45px;
  object-fit: contain;
}
.modal-actions {
  display: flex;
  gap:15px;
  justify-content: flex-end;
  border-top: 1px solid #e2e8f0;
  padding-top: 15px; /* Aumentado para que no se pegue */
  margin-top: 5px;
  flex-shrink: 0;    /* IMPORTANTE: Esto evita que el flexbox aplaste los botones */
}

/*------------------------------------------------------*/

/*VER LISTA PACIENTE S*/
.modal-content {
  font-family: sans-serif;
  background: white;
  padding: 25px;
  border-radius: 20px;
  width: 450px;       /* Ancho idéntico */
  height: 410px;      /* Alto fijo para que siempre sea igual */
  border: 2px solid #008080;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;   /* Evita que se desborde */
}

/* Contenedor horizontal */
.lista-acciones {
  display: flex;
  flex-direction: row; /* Alinea los iconos en fila */
  gap: 8px;            /* Espacio entre cada icono */
  align-items: center;
}

/* Estilo base del botón */
.btn-icon {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: 0.2s;
}

.btn-icon:hover {
  background: #e2e8f0;
}

/* Colores personalizados por tipo */
.btn-icon.ver ion-icon     { color: #0d9488; } /* Turquesa */
.btn-icon.editar ion-icon  { color: #325a8e; } /* Azul */
.btn-icon.eliminar ion-icon { color: #e11d48; } /* Rojo */

/* Tamaño uniforme */
ion-icon {
  font-size: 20px;
}

/* Contenedor de la fila */
.fila-paciente {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 8px; /* Espacio entre registros */
  border: 1px solid #0d9488; /* Borde pequeño y suave */
  border-radius: 12px;       /* Esquinas redondeadas */
  background-color: #ffffff;
  transition: border-color 0.2s;
}

/* Alineación horizontal de los iconos */
.lista-acciones {
  display: flex;
  flex-direction: row;
  gap: 8px;
}

/* Estilo base de los botones */
.btn-icon {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 6px 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.2s;
}

/* Colores específicos según la acción */
.btn-icon.ver ion-icon      { color: #0d9488; } /* Turquesa */
.btn-icon.editar ion-icon   { color: #325a8e; } /* Azul */
.btn-icon.eliminar ion-icon { color: #e11d48; } /* Rojo */

.btn-icon:hover {
  background: #edf2f7;
}

.nombre-paciente {
  font-weight: 600;
  color: #1e293b;
}

.btn-cerrar {
  background-color: #ffffff;
  color: #e11d48;
  border: 2px solid #e11d48;
  padding: 8px 30px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: block;
  margin: 20px auto 0 auto;
}

.btn-cerrar:hover {
  background-color: #e11d48;
  color: white;
}

.search-container input { border: 2px solid #008080; border-radius: 20px; padding: 10px; width: 100%; outline: none; } .search-container button { background: #008080; color: white; border: none; border-radius: 50%; padding: 8px 12px; margin-left: -40px; cursor: pointer; }

.search-container { margin-bottom: -20px; }


/*ver detalle*/ 
/* Contenedor del Modal */
.modal-content {
  width: 90%;
  max-width: 400px; /* Más estrecho para que no se vea gigante */
  max-height: 80vh;
  background: white;
  border-radius: 20px;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

/* Header con botón X grande y rojo */
.header-detalle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.header-detalle h2 {
  margin: 0;
  color: #008080;
}

.header-detalle button {
  background: none;
  border: none;
  color: #ef4444; /* Rojo */
  font-size: 32px; /* Más grande */
  font-weight: bold;
  cursor: pointer;
  line-height: 1;
}

/* Lista compacta */
.lista-detalles {
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px; /* Menos espacio entre cuadros */
}

/* Campos de datos compactos */
.campo-dato {
  border: 1px solid #008080;
  border-radius: 10px;
  padding: 8px 12px; /* Padding reducido */
}

.campo-dato label {
  display: block;
  font-size: 8px; /* Etiqueta más pequeña */
  font-weight: 900;
  color: #008080;
  margin-bottom: 2px;
}

.campo-dato p {
  margin: 0;
  font-size: 14px; /* Tamaño de texto legible pero no gigante */
  color: #334155;
  font-weight: 600;
}

.btn-cerrar-icon {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: transform 0.2s;
}

.btn-cerrar-icon ion-icon {
  font-size: 34px; /* Tamaño grande */
  color: #ef4444;  /* Color rojo */
}

.btn-cerrar-icon:hover {
  transform: scale(1.1); /* Efecto al pasar el mouse */
}
/*------------------------------------------------------------------*/
/*TRATAMIENTOS*/
/* Ajusta el contenedor de la lista para separar del buscador */
.lista-items {
  max-height: 300px;
  overflow-y: auto;
  display: block; 
  margin-top: 13px; /* <--- ESTO es lo que separa el buscador de los registros */
}
.modal-content h2 {
  font-size: 28px;
  color: #008080;
  margin: 0 0 30px 0; /* <--- ESTE 30px es el espacio debajo del título */
  text-align: center; /* Opcional: Centrarlo se ve muy profesional */
}
/* Ajusta el grupo para controlar el espacio interno */
.input-grupo {
  display: flex;
  flex-direction: column;
  margin-bottom: 20px; /* Espacio entre diferentes grupos de campos */
}

/* AQUÍ ESTÁ LA SOLUCIÓN: Separa la etiqueta del input */
.modal-label {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px; /* ESTO es lo que separa la letra de la caja */
  display: block;
}

/* Asegura que el input no tenga margen superior que lo pegue al texto */
.search-input {
  width: 100%;
  padding: 12px 20px;
  border: 2px solid #008080; /* Color principal de tratamientos */
  border-radius: 15px;
  outline: none;
  font-size: 14px;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

/*ESTILOS LISTA TRATAMIENTOS  */
.custom-list-modal {
  background: #ffffff;
  border-radius: 25px;
  padding: 30px;
  width: 400px;
  border: 3px solid #008080;
  box-shadow: 0 20px 40px rgba(0,0,0,0.15);
}

.fila-tratamiento-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  margin: 10px 0;
  background: #f8fafc;
  border-radius: 15px;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.fila-tratamiento-card:hover {
  background: #e6f6f3;
  border-color: #0d9488;
  transform: translateY(-2px);
  cursor: pointer;
}

.nombre-trat {
  font-weight: 800;
  color: #334155;
}

.precio-badge {
  background: #0d9488;
  color: white;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 700;
}

/**BOTONE S DE LA LOSTA */
.btn-cerrar-full {
  width: 100%;
  margin-top: auto; 
  padding: 12px;
  /* Rojo muy bajito (casi transparente) para el estado normal */
  background: #e38e8e; 
  border: 2px solid #d68181;
  border-radius: 12px;
  font-weight: 700;
  /* Color de texto oscuro para que se lea bien sobre el rojo bajito */
  color: #0f0e0e; 
  cursor: pointer;
  transition: all 0.3s ease;
}

/* Efecto al pasar el cursor: Rojo intenso */
.btn-cerrar-full:hover {
  background: #ef4444; /* Rojo fuerte */
  color: #ffffff;      /* Texto blanco */
  border-color: #ef4444;
  transform: translateY(-2px);
}

/* Contenedor que alinea los botones horizontalmente */
.footer-acciones {
  display: flex;
  gap: 10px;
  margin-top: auto; /* Mantiene todo al fondo */
  width: 100%;
}

/* Estilo base para botones pequeños */
.btn-accion {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 16px;
}

/* Botón Editar (Color neutro/azulado) */
.btn-editar {
  background: #f1f5f9;
  color: #334155;
}

.btn-editar:hover {
  background: #cbd5e1;
}

/* Botón Eliminar (Color igual al de Cerrar) */
.btn-eliminar {
  background: #fce7e7;
  color: #b91c1c;
  border-color: #f8d7d7;
}

.btn-eliminar:hover {
  background: #ef4444;
  color: #ffffff;
}

/* Ajuste del botón cerrar para que ocupe el resto del espacio */
.btn-cerrar-full {
  flex-grow: 1; /* Esto hace que el botón cerrar sea más largo que los iconos */
  margin-top: 0; 
  /* ... resto de tus estilos previos ... */
}

/*--------------------*/


.empty-state {
  text-align: center;
  padding: 40px;
  color: #94a3b8;
  font-style: italic;
}

.search-input:focus {
  border-color: #0d9488;
  box-shadow: 0 0 8px rgba(13, 148, 136, 0.3);
}

/**----------------------------------- */
.modal-flex-container {
  display: flex;
  flex-direction: column;
  height: 500px; /* Define una altura total fija para el modal */
}


.fila-tratamiento-card.seleccionado {
  background-color: #e0f2fe !important; /* Azul suave */
  border: 2px solid #3b82f6 !important; /* Borde visible */
}

.days-col {
  position: relative; /* Esto encierra las citas dentro de la columna central */
  width: 100%;
  height: 100%;
  overflow: hidden; /* Evita que cualquier elemento se salga de sus límites */
}

.cita-card {
  position: absolute;
  /* Controla el ancho para que sea un botón cortito y no ocupe todo */
  width: 180px; 
  height: 170px; 
  
  /* Centrado o alineación opcional en la columna */
  left: 15px; 
  
  /* Bordes bien ovalados y diseño limpio */
  border-radius: 20px; 
  padding: 4px 12px;
  background-color: #3b82f6; 
  color: white;
  font-size: 11px;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
  
  /* Alineación interna del texto */
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
}

.paciente-nombre {
  font-size: 14px;
  color: #064e3b;
  font-weight: 700;
}

.info-inferior {
  display: flex;
  gap: 8px;
  align-items: center;
}

.cita-hora {
  font-size: 11px;
  color: #64748b;
  background: #e2e8f0;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.cita-tratamiento {
  font-size: 11px;
  color: #475569;
  font-style: italic;
}


/* Estilo para que el botón use todo el contenedor sin romper el diseño */
.btn-interactivo-cita {
  background: transparent;
  border: none;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  text-align: left;
  width: 100%;
  height: 100%;
  padding: 0;
  cursor: pointer;
  display: block;
}

/* Efecto opcional: un sutil cambio al pasar el mouse por encima */
.btn-interactivo-cita:hover {
  opacity: 0.9;
}

.cita-tratamiento-txt {
  font-size: 10px;
  opacity: 0.9;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis; /* Esto añade el '...' si el nombre del tratamiento es largo */
}

/**DETALLE DE CITS */

.detail-card-pop {
  background: #ffffff !important;
  width: 340px !important;
  border-radius: 16px !important;
  padding: 24px !important;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25) !important;
  display: flex !important;
  flex-direction: column !important;
  position: relative !important; /* Esencial para posicionar la X */
  text-align: left !important;   /* Fuerza a que todo se alinee a la izquierda */
}

.btn-close-x {
  position: absolute !important;
  top: 15px !important;
  right: 18px !important;
  background: none !important;
  border: none !important;
  font-size: 24px !important;
  color: #a30d15 !important;
  cursor: pointer !important;
  line-height: 1 !important;
  padding: 0 !important;
}

.detail-header-left h3 {
  margin: 0 0 6px 0 !important;
  font-size: 18px !important;
  color: #1e293b !important;
  text-align: left !important;
}

.btn-close-x:hover {
  color: #64748b !important;
}
.header-user-info h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
  color: #1e293b;
}

.badge-tratamiento {
  background-color: #e0f2fe !important;
  color: #0369a1 !important;
  padding: 4px 10px !important;
  border-radius: 12px !important;
  font-size: 11px !important;
  font-weight: bold !important;
  display: inline-block !important;
}

.info-row {
  display: flex !important;
  justify-content: space-between !important;
  margin: 10px 0 !important;
  font-size: 13px !important;
  color: #475569 !important;
  border-bottom: 1px dashed #f1f5f9 !important;
  padding-bottom: 6px !important;
}

.select-estado-color {
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  font-size: 12px;
  outline: none;
}

.detail-footer {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.btn-whatsapp {
  background-color: #25d366;
  color: white;
  text-decoration: none;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-ficha {
  background-color: #0d9488;
  color: white;
}
/* Contenedor del celular para alinear al costado */
.celular-container {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
}

/* Enlace de WhatsApp elegante al costado del número */
.link-whatsapp-inline {
  color: #25d366 !important; /* Verde oficial de WhatsApp */
  font-weight: bold !important;
  text-decoration: none !important;
  font-size: 12px !important;
}

.link-whatsapp-inline:hover {
  text-decoration: underline !important;
}

/*--------------------------------------------------- */
.detail-footer {
  display: flex !important;
  gap: 10px !important;
  margin-top: 20px !important;
}

.btn-detalle-action {
  flex: 1 !important;
  padding: 10px 14px !important;
  border: none !important;
  border-radius: 8px !important;
  font-size: 13px !important;
  font-weight: bold !important;
  cursor: pointer !important;
  transition: background 0.2s !important;
  text-align: center !important;
}

.evento-confirmada { 
  background-color: #dcfce7 !important; 
  color: #15803d !important; 
  border-left: 4px solid #4ade80 !important; 
}
.btn-atender {
  background-color: #0d9488 !important; /* Color Plomo correspondiente a Atendido */
  color: white !important;
}

.btn-cancelar-cita {
  background-color: #fee2e2 !important; /* Fondo sutil para Inasistencia/Cancelar */
  color: #b91c1c !important;
 
}

/* Input completamente mimetizado con los textos normales */
.input-invisible-derecha {
  border: none !important;
  background: transparent !important;
  font-family: inherit !important;
  font-size: 13px !important; /* Mismo tamaño exacto que tus .info-row */
  color: #475569 !important; /* Mismo color exacto que tus .info-row */
  text-align: right !important;
  width: 60% !important;
  outline: none !important;
  padding: 0 !important;
}

.input-invisible-derecha:focus {
  color: #1e293b !important;
  border-bottom: 1px solid #cbd5e1 !important;
}

/* COLORES DE CARD */

/* Asegura que el contenedor de los colores empuje todo hacia la derecha */
.color-picker-container {
  display: flex !important;
  gap: 6px !important;
  align-items: center !important;
  justify-content: flex-end !important;
}

/* Estilo para que los botones sean círculos perfectos */
.color-circle-btn {
  width: 18px !important;
  height: 18px !important;
  border-radius: 50% !important; /* Círculo perfecto */
  cursor: pointer !important;
  padding: 0 !important;
  box-sizing: border-box !important;
  transition: transform 0.1s ease !important;
  border: 2px solid transparent !important; /* Borde transparente por defecto */
}

/* Efecto hover al pasar el mouse */
.color-circle-btn:hover {
  transform: scale(1.15) !important;
}

/* Clase que se activa automáticamente al seleccionar el color */
.color-circle-btn.color-activo {
  border-color: #000000 !important; /* Fuerza el borde negro redondo */
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.5) !important;
}


/* ==========================================================================
   ESTILOS ADAPTABLES DEFINITIVOS AL 100% (MÓVIL, TABLET Y LAPTOP)
   ========================================================================== */

@media (max-width: 1254px) {
  /* =======================================================
     1. EL ANCHO DEL SIDEBAR (Mantén los 3 valores iguales)
     ======================================================= */

 .dashboard-wrapper .sidebar {
  width: 110px !important;
  min-width: 110px !important;
  max-width: 110px !important;
  
  /* Mueve el sidebar completamente hacia el borde izquierdo pegadito */
  margin-left: -5px !important;     /* Ajusta este número (ej. -10px o -12px) si necesitas pegarlo aún más */
  margin-right: auto !important;    /* Empuja todo el resto de la interfaz hacia la derecha */
  align-self: flex-start !important;
  margin-top: -5px;
}


 .sidebar {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    
    /* Forzamos el tamaño exacto e idéntico en las tres propiedades */
    width:90px !important;     
    min-width: 20px !important; 
    max-width: 110px !important; 
  height: 100% !important;
    padding: 10px 5px !important;
    box-sizing: border-box !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
    gap: 12px !important;
  }
  /* =======================================================
     2. TAMAÑO DE LA LETRA DEL LOGO (J&M / Texto del Logo)
     ======================================================= */
  .sidebar .logo-box,
  .sidebar [class*="logo"] {
    font-size: 14px !important; /* <--- CAMBIA ESTE NÚMERO para la letra del logo */
    font-weight: bold !important;
    text-align: center !important;
  }

  /* Si tu logo tiene una imagen, controlas su tamaño aquí */
  .sidebar img.logo {
    width: 100% !important;
    max-width: 60px !important; /* <--- Tamaño de la imagen del logo */
    height: auto !important;
  }

  /* =======================================================
     3. TAMAÑO DE LOS BOTONES Y SELECTORES DENTRO DEL SIDEBAR
     ======================================================= */
  .sidebar button,
  .sidebar select,
  .sidebar input,
  .sidebar .btn-back,
  .sidebar [class*="btn"] {
    font-size: 12px !important; /* <--- CAMBIA ESTE NÚMERO para la letra de los botones */
    padding: 6px 8px !important; /* <--- Margen interno de los botones (alto y ancho) */
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }

  /* Enlaces o textos pequeños debajo de los botones (como "Editar", "+ Nueva") */
  .sidebar a,
  .sidebar .btn-link,
  .sidebar span {
    font-size: 11px !important; /* <--- Letra de los enlaces pequeños */
    text-align: center !important;
  }

 .sidebar .btn-back {
    width: 30px !important;
    min-width: 30px !important;
    height: 30px !important;
    margin-right: 80px !important;   /* Empuja todo el contenido a la derecha */
    margin-left: 25px !important;    /* Margen negativo para pegarlo al borde izquierdo exacto */
    align-self: flex-start !important; /* Alineación rígida al inicio del contenedor flex */
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    padding: 0 !important;
  }

  .sidebar .sucursal-actions {
    width: 100% !important;
    padding: 0 px !important;    /* Deja 10px de espacio libre a la izquierda y derecha del borde */
    box-sizing: border-box !important; /* Evita que el padding estire la sección hacia afuera */
    display: flex !important;
    flex-direction: column !important;
    gap: 3px !important;           /* Separa los elementos internos como los títulos de sus inputs */
  }

  .dashboard-wrapper .sidebar .input-with-actions select.search-input {
  padding-left: 2px !important;
  padding-right: 12px !important; /* Espacio mínimo indispensable para la flecha del select */
  font-size: 11px !important;
  text-overflow: clip !important;   /* Desactiva los tres puntos (...) para priorizar ver las letras */
}

.dashboard-wrapper .sidebar .sidebar-section select.search-input {
 
  padding-left: 5px !important;
  padding-right: 12px !important; 
  font-size: 11px !important;
  text-overflow: clip !important;
  white-space: nowrap !important;
}

 .dashboard-wrapper .sidebar .avatar-list {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;     /* Centra los bloques de tarjetas en el sidebar */
  justify-content: center !important;
  gap: 5px !important;
  width: 100% !important;
}

.dashboard-wrapper .sidebar .avatar-item {
  display: grid !important;
  grid-template-columns: 24px 1fr !important; /* Columna 1 fija para el icono (24px) y Columna 2 para el texto */
  align-items: center !important;             /* Centra verticalmente el pie y el texto */
  justify-content: center !important;
  width: 100% !important;
  padding: 6px 4px !important;
  box-sizing: border-box !important;
  gap: 4px !important;                        /* Separación constante entre el icono y el nombre */
}

.dashboard-wrapper .sidebar .avatar-icon {
  width: 20px !important;                     /* Define un ancho fijo para el icono */
  height: 20px !important;                    /* Define un alto fijo para el icono */
  flex-shrink: 0 !important;
  justify-self: center !important;            /* Mantiene el icono perfectamente centrado en su columna */
  margin: 0 !important;                       /* Limpia márgenes para que no se desfase */
}

.dashboard-wrapper .sidebar .avatar-item span {
  font-size: 11px !important;
  text-align: left !important;                /* Alineado a la izquierda para un orden visual perfecto */
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: clip !important;
}

 

  /* CORRECCIÓN: Ajuste ultra compacto para el formulario dentro del sidebar */
.sucursal-form-inline {
  width: 100% !important;
  max-width: 100% !important;
  padding: 4px !important;            /* Reduce el espacio interno al mínimo */
  margin: 5px 0 !important;
  box-sizing: border-box !important;
}

/* Reduce los textos de los títulos del formulario */
.sucursal-form-inline h3 {
  font-size: 9px !important;
  font-weight: 800 !important;
  letter-spacing: 0.5px !important;
  margin-bottom: 6px !important;
}

.sucursal-form-inline .input-group {
  margin-bottom: 5px !important;
  width: 100% !important;
}

/* Reduce las etiquetas (Label) */
.sucursal-form-inline .input-group label {
  font-size: 7.5px !important;       /* Letra más pequeña para que entre completa */
  font-weight: bold !important;
  white-space: normal !important;     /* Permite que el texto baje a la siguiente línea si no cabe */
  word-break: break-word !important;  /* Rompe palabras largas de forma segura */
  line-height: 1.1 !important;        /* Espaciado interlineal compacto */
  color: #008b8b !important;          /* Mantiene tu color corporativo verde oscuro */
}

/* Encoge las cajas de texto (Input) para que no se desborden del ancho */
.sucursal-form-inline input.search-input {
  font-size: 8px !important;            /* Letra más pequeña para el texto que escribas */
  padding: 3px 2px !important;          /* Reduce al mínimo el margen interno lateral */
  height: 24px !important;
  text-align: center !important;        /* Centra el texto para que se lea mejor */
  box-sizing: border-box !important;
}

/* Alinea los botones de Guardar y Cancelar uno abajo del otro para ahorrar ancho */
.sucursal-form-inline .form-actions {
  display: flex !important;
  flex-direction: column !important;  /* Apilados verticalmente para que no se corten */
  gap: 3px !important;
  width: 100% !important;
  margin-top: 5px !important;
}

/* Achica los botones de acción del formulario */
.sucursal-form-inline .form-actions button {
  font-size: 9px !important;
  padding: 3px 0 !important;
  height: 22px !important;
  width: 100% !important;
  text-align: center !important;
}
.sucursal-form-inline input.search-input::placeholder {
  font-size: 7.5px !important;          /* Tamaño ideal para que "Ej. Sucursal Miraflores" no se corte */
  color: #94a3b8 !important;            /* Gris claro legible */
  text-align: center !important;
}



/* ==========================================================================
   SOLUCIÓN PARA PANTALLAS CHICAS (max-width: 768px)
   ========================================================================== */
@media (max-width: 768px) {
  .calendar-header {
    display: flex !important;
    flex-direction: column !important;
    gap: 12px !important;
    padding: 12px !important;
    background: white !important;
    border: 1.5px solid #0d9488 !important;
    border-radius: 14px !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }

  /* Modificamos esta sección para que los elementos se apilen verticalmente */
  .nav-controls {
    display: flex !important;
    flex-direction: column !important; /* El botón "Hoy" arriba y la fecha abajo */
    align-items: center !important;
    gap: 8px !important;
    width: 100% !important;
  }

  .nav-controls .btn-nav {
    width: 100% !important; /* El botón ocupa el ancho para que sea fácil de presionar */
    max-width: 120px !important;
    height: 25px !important;
    font-size: 13px !important;
  }

  /* Contenedor de la fecha expandido al 100% para que no se corte nada */
  /* CORREGIDO: Ajustes para que encaje perfectamente en Samsung e iPhone sin desbordar */
  .date-nav-group {
    display: flex !important;
    flex-direction: row !important;
    align-items: center !important;
    justify-content: space-between !important; 
    gap: 4px !important; /* Reduce el espacio interno para que quepa la flecha */
    min-width: 0 !important; /* Elimina la restricción que sacaba la flecha de la pantalla */
    border: 2px solid #0d9488 !important;
    border-radius: 20px !important;
    padding: 5px 8px !important; 
    width: 100% !important;
    box-sizing: border-box !important;
  }

  /* La fecha ahora tiene espacio completo */
  .calendar-header h2.fecha-display {
    font-size: 15px !important; 
    font-weight: 700 !important;
    white-space: nowrap !important; 
    overflow: visible !important;   
    margin: 0 !important;
    text-align: left !important; /* Cambiado a la izquierda */
  }

  /* Fila de Sucursal */
  .sucursal-badge {
    font-size: 14px !important;
    font-family: "Cooper Black", serif !important;
    color: #0d9488 !important;
    text-align: center !important;
    text-transform: uppercase !important;
    width: 100% !important;
    margin: -8px 0 !important;
  }

  /* Fila de los 3 botones inferiores simétricos */
  .actions-group {
    display: flex !important;
    width: 100% !important;
    justify-content: space-between !important;
    gap: 6px !important;
  }

  .actions-group .btn-secondary,
  .actions-group select {
    flex: 1 !important;
    min-width: 0 !important;
    height: 32px !important;
    font-size: 10px !important;
    padding: 2px 4px !important;
    text-align: center !important;
    border-radius: 20px !important;
    white-space: nowrap !important;
    display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  }
}


/* ==========================================================================
   CELULARES
   ========================================================================== */
@media (max-width: 430px) {
  /* Contenedor principal relativo para posicionar las esquinas */
  .date-nav-group {
    display: block !important; /* Cambiado a block para control absoluto interno */
    position: relative !important;
    padding: 8px 16px !important; /* Espacio libre exacto a los lados para las flechas */
    height: 34px !important;
    box-sizing: border-box !important;
    width: 100% !important;
  }

  /* JALA EL BOTÓN IZQUIERDO TOTALMENTE A LA IZQUIERDA */
  .date-nav-group button:first-of-type,
  .date-nav-group .btn-icon:first-of-type {
    position: absolute !important;
    left: 6px !important;
    top: 50% !important;
    transform: translateY(-50%) !important;
    width: 24px !important;
    height: 24px !important;
    display: inline-flex !important;
    justify-content: center !important;
    align-items: center !important;
    margin: 0 !important;
    padding: 0 !important;
    background: transparent !important;
  }

  /* JALA EL BOTÓN DERECHO TOTALMENTE A LA DERECHA */
  .date-nav-group button:last-of-type,
  .date-nav-group .btn-icon:last-of-type {
    position: absolute !important;
    right: 6px !important;
    top: 50% !important;
    transform: translateY(-50%) !important;
    width: 24px !important;
    height: 24px !important;
    display: inline-flex !important;
    justify-content: center !important;
    align-items: center !important;
    margin: 0 !important;
    padding: 0 !important;
    background: transparent !important;
  }

  /* CENTRA EL TEXTO PERFECTAMENTE EN EL ESPACIO RESTANTE */
  /* CORREGIDO: Fuerza a la letra a quedarse exactamente en el centro matemático de la caja */
  .calendar-header h2.fecha-display {
    font-size: 11px !important; 
    font-weight: 700 !important;
    text-align: center !important; 
    display: block !important;
    width: 100% !important;
    margin: 0 !important; /* Limpia cualquier empuje lateral */
    padding: 0 !important;
    white-space: nowrap !important;
    overflow: visible !important;
    box-sizing: border-box !important;
  }

  /* Mantiene los botones inferiores compactos */
  .actions-group .btn-secondary,
  .actions-group select {
    font-size: 8px !important;
    padding: 2px 1px !important;
  }
}
  
  /* =======================================================
     MANTENEMOS EL RESTO DEL CALENDARIO EXACTAMENTE IGUAL
     ======================================================= */
  .dashboard-wrapper {
    display: flex !important;
    flex-direction: row !important;
    height: 100vh !important;
    width: 100% !important;
    max-width: 100vw !important;
    padding: 8px !important;
    gap: 8px !important;
    box-sizing: border-box !important;
    overflow: hidden !important;
  }

  .main-content,
  .calendar-container,
  .calendar-wrapper {
    display: flex !important;
    flex-direction: column !important;
    flex: 1 !important;
    width: auto !important;
    height: 100% !important;
    overflow: hidden !important;
    box-sizing: border-box !important;
  }

  

  .calendar-header h2 {
    font-size: 1rem !important;
    text-align: center !important;
    margin: 0 !important;
  }

  .calendar-header button,
  .navigation-buttons {
    width: 100% !important;
    display: flex !important;
    justify-content: center !important;
    gap: 4px !important;
  }

  .scroll-container {
    display: block !important;
    width: 100% !important;
    flex: 1 !important;
    height: 100% !important;
    overflow-y: auto !important;
    overflow-x: auto !important;
    position: relative !important;
    box-sizing: border-box !important;
    background: #ffffff !important;
    border: 2px solid #0d9488 !important;
    border-radius: 16px !important;
    padding: 4px !important;
    -webkit-overflow-scrolling: touch !important;
  }

  .calendar-grid {
    display: grid !important;
    grid-template-columns: 60px 1fr !important;
    position: relative !important;
    width: 1200px !important; 
    height: 1440px !important;
    overflow: visible !important;
  }

  .days-col {
    display: grid !important;
    grid-template-columns: repeat(7, 1fr) !important;
    position: relative !important;
    height: 100% !important;
    width: 100% !important;
    overflow: visible !important;
  }

  .day-column {
    position: relative !important;
    height: 100% !important;
    width: 100% !important;
    display: block !important;
    overflow: visible !important;
  }

  .time-slot,
  .appointment-item,
  .day-column > div {
    position: absolute !important;
    box-sizing: border-box !important;
    transform: none !important;
  }
}



</style>