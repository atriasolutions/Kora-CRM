# Kora CRM — Frontend (Vite + React)

Stack: Vite, React 19, TypeScript, Tailwind CSS v4, Radix UI (patrón tipo shadcn), Recharts, Lucide.

La interfaz está pensada para **móvil y escritorio**: debajo de `lg` (1024px) el menú lateral es un **panel deslizante** (icono de menú en la barra superior); el panel derecho de contacto sigue oculto hasta `lg` para dar espacio al contenido. Se usan `viewport-fit=cover` y márgenes seguros (`safe-area`) en header, drawer y scroll principal.

## Arranque local

```bash
npm install
npm run dev
```

## Conectar con Express (Node.js)

1. **Variables de entorno**  
   Define `VITE_API_URL` apuntando al origen base de tu API, por ejemplo:

   ```bash
   export VITE_API_URL=http://localhost:4000
   ```

   Úsalo en el cliente con [`src/api/client.ts`](src/api/client.ts) (`apiBaseURL()`, `fetchJSON`).

2. **Proxy en desarrollo (opcional)**  
   Para evitar CORS mientras desarrollas, descomenta la clave `proxy` en [`vite.config.ts`](vite.config.ts) y enruta rutas como `/api` hacia tu servidor Express.

3. **Contrato**  
   Este frontend asume una API REST JSON; las vistas usan datos mock en `src/data/dashboard.mock.ts` hasta que sustituyas las llamadas por `fetch`/React Query u otra capa de datos.
