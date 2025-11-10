# Configuración de NGINX como Reverse Proxy

Este documento explica cómo está configurado NGINX para manejar múltiples aplicaciones con subdominios.

## 🌐 Arquitectura de Dominios

Tu configuración usa **subdominios** para separar las aplicaciones:

| Aplicación | Dominio | Puerto Interno | Servicio Docker |
|------------|---------|----------------|-----------------|
| **Portfolio** | `https://tudominio.com` | 3000 | `portfolio` |
| **Trackeame Frontend** | `https://trackeame.tudominio.com` | 3001 | `trackeame-frontend` |
| **Trackeame Backend API** | `https://api.trackeame.tudominio.com` | 4000 | `trackeame-backend` |

## 📋 Variables de Entorno Requeridas

Añade estas variables a tu archivo `.env`:

```bash
# Dominio principal para el portfolio
APP_DOMAIN=tudominio.com

# Subdominio para Trackeame Frontend
TRACKEAME_DOMAIN=trackeame.tudominio.com

# Subdominio para Trackeame Backend API
TRACKEAME_API_DOMAIN=api.trackeame.tudominio.com

# Email para Let's Encrypt (SSL)
SSL_EMAIL=tu@email.com
```

## 🚀 Pasos para Desplegar con SSL (Producción)

### 1. Configurar DNS

En tu proveedor de dominio (GoDaddy, Namecheap, Cloudflare, etc.), crea estos registros DNS tipo `A`:

```
tudominio.com                  → IP_DE_TU_SERVIDOR
trackeame.tudominio.com        → IP_DE_TU_SERVIDOR
api.trackeame.tudominio.com    → IP_DE_TU_SERVIDOR
```

O si usas un comodín (wildcard):
```
*.tudominio.com                → IP_DE_TU_SERVIDOR
tudominio.com                  → IP_DE_TU_SERVIDOR
```

### 2. Obtener Certificados SSL (Primera vez)

Antes de levantar nginx con SSL, necesitas obtener los certificados. Ejecuta:

```powershell
# Detener nginx si está corriendo
.\prod.ps1 stop nginx

# Crear directorios para certbot
New-Item -ItemType Directory -Path .\nginx\certbot\conf -Force
New-Item -ItemType Directory -Path .\nginx\certbot\www -Force

# Obtener certificados para cada dominio
docker run -it --rm `
  -v ${PWD}\nginx\certbot\conf:/etc/letsencrypt `
  -v ${PWD}\nginx\certbot\www:/var/www/certbot `
  certbot/certbot certonly --webroot `
  -w /var/www/certbot `
  --email tudominio@gmail.com `
  --agree-tos --no-eff-email `
  -d tudominio.com

docker run -it --rm `
  -v ${PWD}\nginx\certbot\conf:/etc/letsencrypt `
  -v ${PWD}\nginx\certbot\www:/var/www/certbot `
  certbot/certbot certonly --webroot `
  -w /var/www/certbot `
  --email tudominio@gmail.com `
  --agree-tos --no-eff-email `
  -d trackeame.tudominio.com

docker run -it --rm `
  -v ${PWD}\nginx\certbot\conf:/etc/letsencrypt `
  -v ${PWD}\nginx\certbot\www:/var/www/certbot `
  certbot/certbot certonly --webroot `
  -w /var/www/certbot `
  --email tudominio@gmail.com `
  --agree-tos --no-eff-email `
  -d api.trackeame.tudominio.com
```

### 3. Levantar servicios en producción

```powershell
.\prod.ps1 up -d --build
```

### 4. Verificar logs

```powershell
# Ver logs de nginx
.\prod.ps1 logs -f nginx

# Ver todos los logs
.\prod.ps1 logs -f
```

## 🔧 Características de la Configuración

### ✅ Portfolio (Dominio Principal)
- **HTTP → HTTPS redirect** automático
- **Compression** (gzip) activada
- **HTTP/2** habilitado
- Proxy a `portfolio:3000`

### ✅ Trackeame Frontend
- **HTTP → HTTPS redirect** automático
- **Compression** (gzip) activada
- **HTTP/2** habilitado
- Proxy a `trackeame-frontend:3001`
- WebSocket support (para hot-reload en dev)

### ✅ Trackeame Backend API
- **HTTP → HTTPS redirect** automático
- **CORS** configurado para permitir requests desde `trackeame.tudominio.com`
- **Compression** (gzip) activada
- **HTTP/2** habilitado
- Proxy a `trackeame-backend:4000`
- Maneja preflight requests (OPTIONS)

### 🔄 Auto-reload de Certificados
El script `99-autoreload.sh` recarga automáticamente nginx cada 6 horas para aplicar certificados renovados.

## 🧪 Desarrollo Local (Sin SSL)

En desarrollo, nginx **NO se ejecuta**. Las aplicaciones se acceden directamente:

```powershell
.\dev.ps1 up -d --build
```

URLs de desarrollo:
- Portfolio: http://localhost:3000
- Trackeame Frontend: http://localhost:3001
- Trackeame Backend: http://localhost:4000
- PostgreSQL: localhost:5432

## 🐛 Troubleshooting

### Problema: "502 Bad Gateway"
**Causa:** El servicio backend no está corriendo o no responde.

**Solución:**
```powershell
# Ver logs del servicio que falla
.\prod.ps1 logs trackeame-backend

# Reiniciar el servicio
.\prod.ps1 restart trackeame-backend
```

### Problema: "SSL certificate not found"
**Causa:** Los certificados SSL no se generaron correctamente.

**Solución:**
```powershell
# Verificar que existen los certificados
ls .\nginx\certbot\conf\live\

# Si no existen, seguir paso 2 de "Obtener Certificados SSL"
```

### Problema: CORS errors en el frontend
**Causa:** El backend API no está permitiendo requests desde el frontend.

**Solución:** Verifica que la variable `TRACKEAME_DOMAIN` en `.env` sea correcta y coincida con el dominio desde donde se hacen las requests.

### Problema: "Connection refused" al acceder a la app
**Causa:** Los puertos 80/443 no están abiertos en el firewall del servidor.

**Solución (Linux):**
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```

**Solución (Windows Server):**
```powershell
New-NetFirewallRule -DisplayName "HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "HTTPS" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow
```

## 📚 Referencias

- [NGINX Reverse Proxy Guide](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Docker Compose Networking](https://docs.docker.com/compose/networking/)
