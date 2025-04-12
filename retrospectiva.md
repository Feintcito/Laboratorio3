# 🌀 Retrospectiva del Sprint - Proyecto de Análisis de Vulnerabilidades con Nmap y CVEs

## 🔍 Visión General

Durante este sprint, se desarrolló un sistema de análisis de vulnerabilidades en redes locales, apoyado en herramientas como **Nmap** para la detección de servicios y **una API pública (circl.lu)** para la obtención de CVEs relacionados. Se integraron funcionalidades como descubrimiento de hosts activos, escaneo de los puertos más comunes, extracción de versiones de servicios, y presentación de vulnerabilidades.

---

## 📚 Aprendizajes Clave

### ✅ Técnicos
- **Automatización de Nmap** con Python y subprocess para ejecución de comandos desde script.
- **Uso de expresiones regulares** para extraer información relevante de la salida de Nmap.
- **Consumo de APIs REST** desde Python usando `requests`, con enfoque en seguridad informática (CVEs).
- Integración de distintos componentes en un solo script funcional multiplataforma (Windows y Linux).
- Escaneo eficiente de red local (subred /24) y filtrado de puertos usando `--top-ports`.

### ✅ Prácticos
- **Trabajo modular** con funciones específicas por responsabilidad.
- Simulación de flujos de trabajo tipo Trello y GitHub Projects con JSON.
- Generación de scripts `.sh` para automatización de subida de issues a GitHub.
- Buen uso del entorno de desarrollo en Windows y WSL/Kali para pruebas cruzadas.

---

## ⚠️ Dificultades Encontradas

| Problema | Causa | Solución Implementada |
|---------|-------|------------------------|
| `jq: command not found` al usar el script `.sh` | Falta del binario `jq` en el sistema | Instalación de jq con el gestor de paquetes adecuado |
| `UnboundLocalError` en `ip` | Variable usada antes de ser definida | Validación y declaración previa de `ip` |
| Errores al ejecutar GH CLI | `gh` no estaba instalado | Se guió la instalación paso a paso |
| Interpretación incorrecta del formato de salidas de Nmap | Cambios en la salida por versión de sistema | Se afinaron las expresiones regulares y pruebas |
| Gestión de datos JSON para importar a GitHub Projects | Falta de estructura correcta | Se creó el archivo con el formato esperado |

---

## 🚀 Mejoras a Implementar

- [ ] Incluir opción para exportar los resultados a un archivo `.json` o `.xlsx` para informes posteriores.
- [ ] Agregar un sistema de logging para registrar escaneos anteriores con timestamp.
- [ ] Mejorar la UI por consola (menús interactivos o menú de selección).
- [ ] Soporte para más APIs de CVE (como NVD o Vulners).
- [ ] Validación de red ingresada (`192.168.X.X/24`) con IPy o netaddr para evitar errores.

---

## 🧠 Reflexión Final

El sprint permitió conectar conocimientos de redes, seguridad y automatización en Python. Se comprendió la importancia de modularizar código, gestionar errores y hacer pruebas en diferentes sistemas operativos. La integración de Nmap con APIs de seguridad demostró cómo se puede construir una herramienta útil para entornos reales de ciberseguridad, especialmente para actividades de pentesting básico o diagnóstico de red.

> 💡 *Este proyecto servirá como base para futuros desarrollos más avanzados orientados a entornos SOC o proyectos cloud.*

---

⏱️ **Duración del Sprint:** 1 semana  
👥 **Equipo:** Individual (estudiante/desarrollador)  
📍 **Contexto:** Laboratorio de Ingeniería de Software / Ciberseguridad
