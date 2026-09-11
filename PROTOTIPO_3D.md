# WojakMeter — experimento 3D v07

Copia del proyecto adjunto. No se ha publicado ni enviado a GitHub.

## Probar

1. En esta carpeta ejecuta `npm install` y `npm run dev`.
2. Abre `http://localhost:3000`.
3. Pulsa **Probar personaje 3D**, encima del escenario del personaje.
4. Cambia el timeframe o modo del índice: el 3D recibe los cuatro ejes del mismo hero-rig del sitio.
5. **Volver al personaje original** restaura el render anterior y pausa el 3D.

Prueba manual de las siete emociones: `/wojak-3d/lab.html`.

## Cambios

- `pages/index.js`: carga el puente del personaje.
- `public/wojak-3d/bridge.js`: activación, lectura de ejes, mensajería y pausa.
- `public/wojak-3d/viewer.html`: visor integrado sin panel de laboratorio.
- `public/wojak-3d/lab.html`: controles independientes para revisar las emociones.

Piel blanca cálida en Neutral; rojo intenso en Frustration, rojo menos intenso en Concern,
rosa claro en Doubt; verde claro en Optimism, verde medio en Content y verde intenso en Euphoria.
La pigmentación mantiene variación del mapa de piel y recibe iluminación; los ojos,
ropa y dientes conservan sus materiales. Transiciones continuas sin cambiar de malla.
Se quitaron las arrugas procedurales añadidas. Las gotas ahora son geometría transparente
con reflejos de entorno y movimiento descendente sobre la superficie de la cara.

El visor conserva la geometría y movimiento de v06. Es un prototipo: el agua usa una
aproximación en tiempo real y requiere revisión visual; no simula fluidos. El modelo
no tiene nuevos clips horneados. El visor integra los recursos para facilitar las pruebas
(~27 MB); no es todavía la distribución optimizada para producción.

## Rama de prueba

Dentro de TU repositorio, crea la rama antes de copiar los cambios:

    git switch -c experiment/wojak-3d-v07

Para incorporar solo el experimento, copia los dos HTML y bridge.js dentro de
`public/wojak-3d/` y añade a tu `pages/index.js` la carga de Script que muestra esta copia.
El paquete incluye un patch limitado a esos archivos. No reemplaces tu .env ni tus credenciales.
No se hizo push, merge ni despliegue.

Validación: `npm run build` terminó correctamente. Pruebas del puente de datos y pausa aprobadas. No se verificó el render WebGL ni la respuesta de las APIs con credenciales de producción.
