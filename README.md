# Recordatorios

Aplicación web de recordatorios personales y grupales con notificaciones, compartición y sincronización en tiempo real.

## Características principales

### Autenticación y Perfil
- Inicio de sesión/registro con Firebase Authentication
- Perfil de usuario básico
- Gestión de tokens FCM para notificaciones push

### Gestión de Recordatorios
- Crear, editar, eliminar recordatorios
- Campos: título, descripción, fecha/hora, importancia (baja/media/alta), color, categoría
- Recordatorios permanentes (sin fecha/hora)
- Marcar como completado/descompletado
- Favoritos (estrella) con orden prioritario
- Duplicar recordatorio
- Subtareas (checklist) con barra de progreso
- Etiquetas (tags) con filtrado
- Posponer (Snooze) 5/10/30/60 min
- Vista "Hoy", "Próximos", "Completados"
- Búsqueda y filtros por importancia/categoría/favoritos/etiquetas
- Colores personalizables

### Calendario
- Vista mensual con recordatorios por día
- Navegación entre meses
- Filtrado por día
- Exportar a .ICS (Google/Apple Calendar)
- Exportar backup .JSON

### Compartición y Grupos
- Crear y unirse a grupos con código de invitación
- Compartir recordatorios con miembros del grupo
- Aceptar/rechazar recordatorios recibidos
- Identificación visual propios/recibidos
- Roles: Propietario/Admin/Miembro
- Expulsar miembros (Admin+)
- Regenerar/activar/desactivar código de invitación (Admin+)
- Ver envíos con estado (Pendiente/Aceptado/Rechazado/Revocado)
- Revocar envíos pendientes

### Notificaciones
- Notificaciones locales (5 min antes + hora exacta)
- Notificaciones push FCM
- Service Worker para notificaciones en background
- Soporte acciones en notificación
- Badge permanente (Android)
- Toasts in-app

### Recurrentes
- Diario/Semanal/Mensual/Anual
- Intervalo configurable
- Selección días de semana (semanal)
- Finalizar tras N veces / infinito
- Auto-creación al completar

### PWA
- Instalable (custom install prompt)
- Offline-ready con Workbox
- Service Worker con estrategias de caché
- Iconos y manifest
- Compatibilidad móvil

### UX/UI
- Diseño dark + glassmorphism
- Mobile-first
- Animaciones suaves
- Skeleton/estados vacíos
- Modal bottom-sheet
- Tabs y filtros deslizables

## Tecnologías
- React 19 + Vite
- Firebase (Auth/Firestore/FCM)
- Workbox (PWA)
- date-fns
- react-hot-toast
- react-router-dom

## Estructura
```
src/
  components/ (ui, reminders, groups, layout, shared)
  context/ (Auth, Reminders)
  pages/ (Home, Calendar, Shared, Groups, Profile, Login)
  services/ (firebase, auth, reminders, groups, notifications)
  utils/ (dateUtils, colorUtils, tasksUtils, recurrence, icsExport)
  styles/ (index.css)
  sw.js
```

## Scripts
```bash
npm run dev
npm run build
npm run preview
```
