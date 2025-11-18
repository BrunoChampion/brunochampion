# TrackMe - Habit Time Tracker

Una aplicación web simple para el registro de tiempo invertido en hábitos, construida con Next.js, NestJS, PostgreSQL y Prisma.

## 🚀 Características

- **Autenticación JWT**: Registro y login seguros con tokens JWT
- **Gestión de Hábitos**: Crear, ver y eliminar hábitos personalizados
- **Cronómetro**: Iniciar y detener cronómetros para cada hábito
- **Métricas**: Visualizar tiempo invertido por semana y por mes
- **Diseño Moderno**: Interface con Tailwind CSS v4

## 📋 Requisitos Previos

- Node.js 18+ 
- PostgreSQL 12+
- npm o yarn

## 🛠️ Instalación

### 1. Configurar Base de Datos

Crea una base de datos PostgreSQL:

```sql
CREATE DATABASE trackeame;
```

### 2. Configurar Backend

```bash
cd trackeame-back

# Instalar dependencias
npm install

# Configurar variables de entorno
# Edita el archivo .env con tus credenciales de PostgreSQL
# DATABASE_URL="postgresql://usuario:password@localhost:5432/trackeame?schema=public"

# Ejecutar migraciones de Prisma
npx prisma migrate dev --name init

# Generar cliente de Prisma
npx prisma generate
```

### 3. Configurar Frontend

```bash
cd ../trackeame-front

# Instalar dependencias
npm install

# El archivo .env.local ya está configurado
```

## 🚀 Ejecución

### Iniciar Backend (Puerto 3000)

```bash
cd trackeame-back
npm run start:dev
```

El backend estará disponible en `http://localhost:3000`

### Iniciar Frontend (Puerto 3001)

```bash
cd trackeame-front
npm run dev -- -p 3001
```

El frontend estará disponible en `http://localhost:3001`

## 📱 Uso

1. **Registro**: Accede a `http://localhost:3001/register` y crea una cuenta
2. **Login**: Inicia sesión con tus credenciales
3. **Crear Hábito**: En el dashboard, haz clic en "Create Habit"
4. **Iniciar Cronómetro**: Haz clic en "Start Timer" para comenzar a medir tiempo
5. **Detener Cronómetro**: Haz clic en "Stop Timer" para detener y guardar el tiempo
6. **Ver Métricas**: Las métricas semanales y mensuales se actualizan automáticamente

## 🗂️ Estructura del Proyecto

```
trackeame-back/
├── src/
│   ├── auth/          # Módulo de autenticación JWT
│   ├── habits/        # Módulo CRUD de hábitos
│   ├── timer/         # Módulo de cronómetro
│   └── prisma/        # Servicio de Prisma
└── prisma/
    └── schema.prisma  # Esquema de base de datos

trackeame-front/
├── pages/
│   ├── index.tsx      # Página de inicio
│   ├── login.tsx      # Página de login
│   ├── register.tsx   # Página de registro
│   └── dashboard.tsx  # Dashboard principal
├── contexts/
│   └── AuthContext.tsx # Context de autenticación
└── lib/
    └── api.ts         # Cliente API con Axios
```

## 🔑 Variables de Entorno

### Backend (.env)

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/trackeame?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"
PORT=3000
FRONTEND_URL="http://localhost:3001"
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

## 🔒 Seguridad

- Las contraseñas se hashean con bcrypt
- Autenticación mediante JWT
- CORS configurado para el frontend
- Validación de datos con class-validator

## 🛣️ API Endpoints

### Autenticación
- `POST /auth/register` - Registrar nuevo usuario
- `POST /auth/login` - Iniciar sesión
- `GET /auth/profile` - Obtener perfil (requiere auth)

### Hábitos
- `GET /habits` - Listar todos los hábitos del usuario
- `POST /habits` - Crear nuevo hábito
- `GET /habits/:id` - Obtener un hábito específico
- `PATCH /habits/:id` - Actualizar hábito
- `DELETE /habits/:id` - Eliminar hábito
- `GET /habits/:id/metrics` - Obtener métricas del hábito

### Timer
- `POST /timer/start` - Iniciar cronómetro
- `POST /timer/stop/:id` - Detener cronómetro
- `GET /timer/active` - Obtener cronómetro activo
- `GET /timer/entries` - Obtener historial de tiempo

## 📊 Base de Datos

El esquema incluye las siguientes tablas:
- `users` - Usuarios del sistema
- `habits` - Hábitos creados por usuarios
- `time_entries` - Registros de tiempo invertido
- `sessions` - Sesiones de autenticación
- `accounts` - Cuentas OAuth (para futura implementación)

## 🎨 Tecnologías Utilizadas

### Backend
- NestJS - Framework de Node.js
- Prisma - ORM para PostgreSQL
- Passport JWT - Autenticación
- bcrypt - Hashing de contraseñas
- class-validator - Validación de DTOs

### Frontend
- Next.js - Framework de React
- TypeScript - Tipado estático
- Tailwind CSS v4 - Estilos
- Axios - Cliente HTTP
- Context API - Gestión de estado

## 📝 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 👨‍💻 Desarrollo

Para ejecutar las migraciones de base de datos:

```bash
cd trackeame-back
npx prisma migrate dev
```

Para visualizar la base de datos con Prisma Studio:

```bash
cd trackeame-back
npx prisma studio
```

## 🐛 Troubleshooting

### Error: "Cannot connect to database"
- Verifica que PostgreSQL esté corriendo
- Comprueba las credenciales en el archivo .env

### Error: "Port already in use"
- Cambia el puerto en el archivo .env (backend) o al iniciar (frontend)

### Error: "Module not found"
- Ejecuta `npm install` en ambos proyectos
