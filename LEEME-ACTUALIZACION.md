# WojakMeter Pro — integración en el proyecto real

El diseño aprobado está integrado directamente en tu proyecto Next.js. Este paquete utiliza tus propias rutas API, assets y configuración de Vercel. No necesita la publicación privada anterior ni añade un proxy hacia wojakmeter.com.

## Cómo aplicarlo

1. Conserva una copia de tu proyecto actual o crea una rama de GitHub para revisar el cambio.
2. Descomprime este ZIP. Dentro de `Wojakmeter-clean-main` está la raíz del proyecto: allí están `package.json`, `pages`, `public`, `styles` y `vercel.json`.
3. Copia el contenido de esa carpeta en la raíz de tu repositorio. No crees otra carpeta `Wojakmeter-clean-main` dentro del proyecto existente.
4. Conserva tus archivos `.env` locales y las variables ya configuradas en Vercel. No se requieren nuevas variables para este diseño.
5. Sube los cambios a GitHub. Si Vercel está conectado a esa rama, utilizará su flujo de despliegue habitual.

Para comprobarlo localmente: `npm ci`, `npm run build` y `npm run start`.

## Archivos modificados

- `pages/index.js`: navegación lateral, espacios separados por herramienta y nuevo panel principal. Conserva JSX editable, SEO y generación original de metadatos.
- `pages/_app.js`: carga de la hoja de estilo del rediseño.
- `public/script.js`: MOOD se inicializa al abrir su espacio; algunas consultas periódicas se pausan cuando su herramienta no está visible.
- `pages/about.js` y `components/LegalLayout.js`: el enlace de regreso a la portada carga una página completa para reiniciar correctamente los motores del panel.

## Archivos nuevos

- `styles/pro-workspace.css`: diseño aprobado, limitado al panel para conservar el aspecto de las páginas informativas.
- `public/pro-shell.js`: navegación, estado de conexión y acceso por teclado a las tarjetas.
- `components/WorkspaceScripts.js`: carga ordenada de los motores después de la hidratación de React.
- `package-lock.json`: versiones resueltas durante la instalación de las dependencias originales.
- Este documento.

## Comprobaciones realizadas

- `npm run build` completó correctamente la compilación optimizada, validación de tipos y generación de páginas.
- Los scripts modificados pasaron la validación de sintaxis.
- Los identificadores JSX del panel son únicos y las nueve entradas de navegación tienen su espacio correspondiente.
- Todos los archivos de `pages/api`, `lib`, `vercel.json`, `next.config.js` y `package.json` se compararon con el ZIP original y permanecen idénticos.
- Se mantiene el cron `/api/history-snapshot` cada 15 minutos.
- No se incluyeron `node_modules`, `.next` ni credenciales nuevas.

## Alcance y pendientes

Este ZIP está preparado para integrarlo en tu repositorio. No se ha subido a tu GitHub ni desplegado al dominio real. La compilación no comprueba las credenciales, proveedores de datos, escrituras en la base de datos o comportamiento visual en navegador; esos servicios deben verificarse en tu entorno de despliegue.

Se conservaron las versiones originales de dependencias. La instalación de Next.js 14.2.3 mostró un aviso de vulnerabilidad conocida. Su actualización de seguridad queda pendiente y no está incluida en esta integración visual.
