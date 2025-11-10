# Docker Compose - Entornos Development y Production

Este proyecto usa múltiples archivos Docker Compose para gestionar diferentes entornos.

## Archivos

- **`compose.yaml`** - Configuración base común a todos los entornos
- **`compose.dev.yaml`** - Overrides para desarrollo (hot-reload, volumes, devDependencies)
- **`compose.prod.yaml`** - Overrides para producción (optimizado, sin volumes, resource limits)

## Comandos

### Development (Desarrollo)

```powershell
# Levantar servicios en modo desarrollo
docker compose -f compose.yaml -f compose.dev.yaml up --build

# Levantar en background
docker compose -f compose.yaml -f compose.dev.yaml up -d --build

# Ver logs
docker compose -f compose.yaml -f compose.dev.yaml logs -f

# Detener servicios
docker compose -f compose.yaml -f compose.dev.yaml down

# Reconstruir sin cache
docker compose -f compose.yaml -f compose.dev.yaml build --no-cache
```

### Production (Producción)

```powershell
# Levantar servicios en modo producción
docker compose -f compose.yaml -f compose.prod.yaml up -d --build

# Ver logs
docker compose -f compose.yaml -f compose.prod.yaml logs -f

# Detener servicios
docker compose -f compose.yaml -f compose.prod.yaml down

# Reconstruir sin cache
docker compose -f compose.yaml -f compose.prod.yaml build --no-cache
```

### Simplificar comandos (Opcional)

Para no escribir `-f compose.yaml -f compose.dev.yaml` cada vez, puedes:

#### Opción 1: Variables de entorno (PowerShell)

```powershell
# Development
$env:COMPOSE_FILE="compose.yaml;compose.dev.yaml"
docker compose up -d

# Production
$env:COMPOSE_FILE="compose.yaml;compose.prod.yaml"
docker compose up -d
```

#### Opción 2: Alias en PowerShell Profile

Añade a tu `$PROFILE` (ejecuta `notepad $PROFILE`):

```powershell
function docker-compose-dev {
    docker compose -f compose.yaml -f compose.dev.yaml @args
}

function docker-compose-prod {
    docker compose -f compose.yaml -f compose.prod.yaml @args
}

Set-Alias dcd docker-compose-dev
Set-Alias dcp docker-compose-prod
```

Después podrás ejecutar:
```powershell
dcd up -d        # Development
dcp up -d        # Production
dcd logs -f      # Ver logs de dev
dcp down         # Detener prod
```

#### Opción 3: Scripts PowerShell

Crea archivos `dev.ps1` y `prod.ps1`:

**dev.ps1:**
```powershell
docker compose -f compose.yaml -f compose.dev.yaml $args
```

**prod.ps1:**
```powershell
docker compose -f compose.yaml -f compose.prod.yaml $args
```

Uso:
```powershell
.\dev.ps1 up -d
.\prod.ps1 up -d --build
```

## Diferencias clave entre Dev y Prod

| Característica | Development | Production |
|----------------|-------------|------------|
| **Volumes** | ✅ Montados (hot-reload) | ❌ No (código en imagen) |
| **Command** | `npm run dev` / `start:dev` | `node dist/main` / `node server.js` |
| **NODE_ENV** | `development` | `production` |
| **Restart** | `unless-stopped` | `always` |
| **Build cache** | Reutiliza node_modules | Build limpio optimizado |
| **Resource limits** | ❌ No | ✅ Sí (CPU/Memory) |
| **devDependencies** | ✅ Instaladas | ❌ Solo dependencies |

## Troubleshooting

### Contenedores salen inmediatamente (Exited 0)
- Verifica que el `command:` en `compose.dev.yaml` sea correcto para cada servicio
- Comprueba que los scripts existen en `package.json` (ej. `npm run dev`, `npm run start:dev`)

### Cambios no se reflejan en development
- Asegúrate de estar usando el archivo `compose.dev.yaml`
- Verifica que los volumes estén montados correctamente
- Comprueba que la app tenga hot-reload configurado (Next.js, NestJS)

### Producción no arranca
- Verifica que los Dockerfiles tengan `CMD` correctos
- Comprueba que el build se complete sin errores
- Revisa logs: `docker compose -f compose.yaml -f compose.prod.yaml logs`

### Port conflicts
- Si obtienes error de puertos ocupados, cambia los puertos en `compose.yaml`
- O detén los contenedores existentes: `docker compose down`
