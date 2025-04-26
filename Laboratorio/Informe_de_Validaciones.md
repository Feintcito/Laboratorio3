# Informe de Validaciones - Sistema de Comunicación IoT Industrial

## 1. Introducción

Este documento presenta el informe de validaciones del Sistema de Comunicación IoT Industrial. Su propósito es documentar las actividades realizadas para asegurar que los requerimientos definidos en el Documento SRS han sido revisados, ajustados y alineados con los objetivos del proyecto. La validación se realizó mediante revisiones entre pares, análisis de trazabilidad y recolección de feedback técnico.

## 2. Revisión entre Pares

Se organizó una sesión formal de revisión entre pares el 17 de abril de 2025. Participaron desarrolladores de firmware, ingenieros de pruebas, y representantes del área de ciberseguridad industrial. La dinámica incluyó:

- Evaluación del documento SRS desde el rol de diferentes stakeholders (usuarios finales, técnicos de mantenimiento, ingenieros de red, etc.).
- Uso de una plantilla de observación para identificar inconsistencias, ambigüedades o áreas poco definidas.
- Discusión guiada sección por sección, incluyendo requerimientos funcionales, no funcionales y restricciones.

**Hallazgos Principales:**
- Ambigüedad en la periodicidad de transmisión de datos críticos.
- Ausencia inicial de logs de diagnóstico y métricas QoS.
- Necesidad de reforzar las condiciones de seguridad ante fallas de conexión.

## 3. Feedback y Ajustes

Posterior a la revisión, se clasificaron los comentarios y se tomaron acciones correctivas. Los cambios principales realizados en el SRS fueron:

- Inclusión de requerimientos RF06 (logs de diagnóstico) y RF07 (actualizaciones OTA).
- Ajuste del requerimiento RF02 para definir explícitamente la condición de "evento crítico".
- Adición de métricas para monitoreo del rendimiento como latencia, tasa de reconexión y consumo energético.
- Incorporación de pruebas de validación de seguridad (penetration testing) en el apartado de criterios de aceptación.

Todos estos cambios se verificaron mediante una revisión secundaria en la que se confirmó la aceptación por parte del equipo técnico.

## 4. Trazabilidad

Se realizó un análisis de trazabilidad para asegurar que cada requerimiento del SRS esté vinculado a los siguientes elementos:

- **Objetivos del Sistema:** como la transmisión segura, confiable y eficiente de datos en entornos industriales.
- **Necesidades del Caso de Estudio:** considerando los desafíos propios del entorno como interferencias electromagnéticas, consumo energético y actualizaciones remotas.
- **Casos de Prueba:** cada requerimiento cuenta con uno o más test cases documentados en la matriz de trazabilidad (sección 8 del SRS).

**Instrumentos Utilizados:**
- Matriz de trazabilidad ID Requisito → Descripción → Pruebas Asociadas → Estado.
- Identificación de dependencias con componentes de hardware y protocolos de comunicación utilizados (MQTT, TCP/IP, OTA).

## 5. Conclusión

El proceso de validación permitió mejorar sustancialmente la calidad del documento SRS, asegurando la alineación con los objetivos del sistema y la preparación adecuada para la etapa de implementación. La trazabilidad completa y las pruebas asociadas garantizarán que el cumplimiento de cada requerimiento pueda ser verificado durante las pruebas de integración y aceptación.

**Fecha de Validación:** 17 - 19 de abril de 2025  
**Versión Validada del SRS:** 2.0

---

*Este documento complementa al SRS oficial y sirve como evidencia del proceso de validación técnica.*

