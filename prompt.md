**Contexto y Rol**
Actúa como un desarrollador full-stack senior especializado en aplicaciones web modernas, con experiencia en diseño UX/UI móvil, Firebase y arquitecturas escalables. Tu objetivo es crear una aplicación web de recordatorios optimizada para dispositivos móviles, con una experiencia fluida, intuitiva y profesional.

---

**Consulta / Tarea**
Diseñar y desarrollar una aplicación web de recordatorios (tipo notas personales) donde los usuarios puedan crear, gestionar y compartir recordatorios dentro de grupos.

---

**Especificaciones Funcionales**

1. **Gestión de usuarios**

   * Registro e inicio de sesión (Firebase Authentication).
   * Perfil de usuario básico.
   * Sistema de grupos: los usuarios pueden pertenecer a uno o varios grupos.

2. **Recordatorios / Notas**

   * Crear, editar y eliminar recordatorios.
   * Cada recordatorio debe incluir:

     * Título
     * Descripción
     * Fecha y hora
     * Nivel de importancia (baja, media, alta)
     * Color personalizable
     * Categoría (trabajo, personal, urgente, etc.)
   * Visualización clara y rápida desde la app principal.

3. **Calendario**

   * Vista de calendario integrada.
   * Los recordatorios deben aparecer asociados a fechas específicas.
   * Posibilidad de filtrar por categorías, colores o importancia.
   * Interacción táctil optimizada para móvil.

4. **Sistema de compartición**

   * Un usuario puede enviar un recordatorio a otro usuario dentro del mismo grupo.
   * El recordatorio recibido aparecerá automáticamente en la app del destinatario.
   * Identificación visual de recordatorios recibidos vs propios.
   * Posibilidad de aceptar, modificar o eliminar recordatorios recibidos.

5. **Sincronización en tiempo real**

   * Uso de Firebase Firestore para base de datos en tiempo real.
   * Actualización instantánea de cambios entre usuarios.

---

**Especificaciones Técnicas**

* **Frontend**

  * Framework: React (preferiblemente con Next.js o Vite)
  * Diseño mobile-first (responsive, optimizado para móviles)
  * UI moderna (Material UI, Tailwind CSS o similar)
  * UX clara, minimalista y profesional

* **Backend**

  * Firebase (Firestore + Authentication + Hosting)
  * Arquitectura serverless

* **Código**

  * 100% open source
  * Estructurado, limpio y modular
  * Buenas prácticas (hooks, separación de lógica, componentes reutilizables)

---

**Criterios de Calidad**

* Experiencia de usuario simple, rápida y sin fricción.
* Diseño visual atractivo y profesional (tipo app moderna SaaS).
* Navegación intuitiva con pocos clics.
* Rendimiento optimizado en dispositivos móviles.
* Código mantenible y escalable.
* Seguridad básica en autenticación y acceso a datos (reglas de Firebase).

---

**Cómo debe ser la respuesta**

* Proporcionar:

  1. Arquitectura general de la aplicación.
  2. Estructura de carpetas recomendada.
  3. Tecnologías elegidas con justificación.
  4. Componentes principales (UI + lógica).
  5. Esquema de base de datos en Firebase.
  6. Ejemplo de código clave (crear nota, compartir, calendario).
  7. Recomendaciones de diseño UX/UI.
* El resultado debe ser directamente utilizable como base para desarrollo real.
