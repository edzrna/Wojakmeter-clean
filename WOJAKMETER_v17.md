# WojakMeter — integración 3D v17

Proyecto preparado para experimentar en una rama. No se publicó ni se modificó GitHub.

## Uso
1. Descomprime el proyecto completo, o aplica el ZIP Actualizacion sobre la raíz de tu proyecto.
2. Conserva las variables de entorno que ya usa tu sitio. No se incluyen credenciales.
3. Ejecuta npm install y npm run dev. Abre http://localhost:3000.
4. El hero carga el 3D automáticamente. Los otros personajes siguen iguales.
5. El laboratorio opcional está en /wojak-3d/lab.html; no hay enlaces ni controles de laboratorio en el hero público.

## Cambios
- Sudadera y cabeza comparten el giro horizontal del puntero/dedo.
- Duda: mayor asimetría de cejas, ojo contrario entrecerrado, boca tensa y ladeo variable.
- Iluminación y FX predeterminados copiados de los dos JSON entregados.
- Las preferencias antiguas del navegador no sustituyen los ajustes del hero público.
- Acabado visual del hero: superficies oscuras, bordes discretos, traza histórica atenuada y jerarquía tipográfica. Se conservan las rejillas y puntos de cambio responsivos.
- Hero permanente sin selector de vista 3D, botones de cámara ni controles de efectos.
- Si no carga WebGL/modelo, permanece el personaje anterior como respaldo.
- Render suspendido fuera de pantalla o en pestaña oculta.

## Reacción al mercado
Se reutiliza la respuesta de /api/index-score que ya solicita hero-rig.js; no se añaden peticiones.
El índice canónico mostrado gobierna la emoción y el color. Los ejes existentes gobiernan respiración, temblor, fatiga y tensión.
Volatilidad y desacuerdo entre componentes ya forman parte de esos ejes en lib/hero-profiles.js.
En la lectura del momento, parts.headlines modula discretamente activación/tensión y parts.volumeAnom refuerza activación; delta diferencia presión descendente de recuperación.
No se interpreta un titular como un evento nuevo en cada fotograma, ni se inventa un newsShock.
Las ventanas históricas conservan sus propios ejes y delta; no reciben titulares o volumen del momento.
Lecturas de más de 45 minutos, inválidas o ausentes no añaden modificadores. La respiración base continúa.
Se preservan los siete tramos; los modificadores cambian actuación, no el número del índice.
market-response.js contiene los coeficientes para calibrarlos después de observar datos reales.

## Verificación
npm run build: correcto.
node tests/character-market.cjs: correcto (límites, estrés, datos viejos/ausentes, separación de ventanas).
JavaScript del personaje: sintaxis comprobada.
Pendiente de validación visual en navegador con WebGL y APIs configuradas: parecido, costuras al girar, rendimiento móvil y amplitud de actuación. No se afirma validación gráfica ni conexión a la base de datos de producción.

Los JSON en public/wojak-3d documentan los valores incorporados en character-app.js; para cambiar los predeterminados deben actualizarse también las constantes lightDefaults y FX_DEFAULTS.
