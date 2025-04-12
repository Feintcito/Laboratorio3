# 📅 Sprint Plan - Desarrollo Ágil de Software de Ciberseguridad

## 🧠 Sprint Objetivo
Desarrollar las funcionalidades críticas del sistema de detección y respuesta a incidentes en ciberseguridad. Duración del sprint: **2 semanas**

---

## 🔖 Historias de Usuario

### 🟡 Historia 1: Monitorear el tráfico en tiempo real
**Como** analista de seguridad, **quiero** visualizar el tráfico de red en tiempo real, **para** detectar comportamientos sospechosos y responder rápidamente.

- Valor al usuario: ⭐⭐⭐⭐⭐
- Prioridad: Alta

### 🟡 Historia 2: Análisis automatizado de vulnerabilidades
**Como** responsable de infraestructura, **quiero** que el sistema analice periódicamente mis activos, **para** detectar vulnerabilidades sin intervención manual.

- Valor al usuario: ⭐⭐⭐⭐☆
- Prioridad: Alta

### 🟡 Historia 3: Generación de alertas personalizadas
**Como** operador SOC, **quiero** recibir alertas automáticas ante incidentes críticos, **para** actuar sin demora.

- Valor al usuario: ⭐⭐⭐⭐☆
- Prioridad: Media

---

## ✅ Tablero de Sprint

### 📝 To Do

| Tarea                                                                 | Historia     | Tiempo Estimado |
|----------------------------------------------------------------------|--------------|------------------|
| Definir métricas de tráfico relevantes (IP, puertos, protocolos)     | Historia 1   | 2h               |
| Crear módulo de captura de paquetes                                 | Historia 1   | 4h               |
| Implementar script de escaneo automatizado                          | Historia 2   | 3h               |
| Crear base de datos local para firmas de vulnerabilidades           | Historia 2   | 2h               |
| Diseñar plantilla base para alertas (email y consola)               | Historia 3   | 1.5h             |
| Definir tipos de eventos críticos (DoS, malware, anomalías)         | Historia 3   | 2h               |

---

### 🚧 In Progress

| Tarea                                            | Historia     | Tiempo Estimado |
|-------------------------------------------------|--------------|------------------|
| Visualización en tiempo real con WebSocket      | Historia 1   | 5h               |
| Integración de herramienta de escaneo (OpenVAS) | Historia 2   | 4h               |

---

### ✅ Done

| Tarea                                                   | Historia     | Tiempo Real |
|----------------------------------------------------------|--------------|--------------|
| Revisión de requisitos con stakeholders                  | Todas        | 1.5h         |
| Configuración del entorno de desarrollo                  | Todas        | 2h           |

---

## 🧑‍💻 Asignaciones sugeridas

- **Dev 1:** Historia 1 completa (Monitoreo)
- **Dev 2:** Historia 2 completa (Vulnerabilidades)
- **Dev 3:** Historia 3 (Alertas)

---

## 🔁 Revisión del Sprint

- **Demo** agendada para el día 14.
- **Daily Meetings:** 15 min cada mañana.
- **Retrospectiva:** cierre del día 14 para ajustar prioridades futuras.

