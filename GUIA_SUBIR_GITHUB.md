# 📦 GUÍA PARA SUBIR A GITHUB - MiroFish Quant V4.1

## ⚠️ IMPORTANTE: El repositorio NO existe aún en tu cuenta de GitHub

El código está 100% completo y commiteado localmente, pero necesitas crear el repositorio en GitHub primero.

---

## 🔑 PASO 1: Crear Repositorio en GitHub (Desde tu navegador)

1. **Ve a:** https://github.com/new
2. **Inicia sesión** con tu cuenta: `javiertarazon@gmail.com`
3. **Nombre del repositorio:** `mirofish-quant`
4. **Descripción:** "Sistema de predicciones rentables para Polymarket con IA, noticias en tiempo real y copy trading"
5. **Visibilidad:** Público o Privado (tú eliges)
6. **NO marques** "Initialize this repository with a README" (déjalo vacío)
7. **Haz clic en:** "Create repository"

---

## 🔑 PASO 2: Configurar Autenticación en GitHub

### Opción A: Usando Token Personal (RECOMENDADO)

1. **Ve a:** https://github.com/settings/tokens
2. **Click en:** "Generate new token (classic)"
3. **Nota:** `MiroFish Quant Deployment`
4. **Expiration:** 90 días (o lo que prefieras)
5. **Scopes/Permisos:** Marca solo `repo` (todo el árbol)
6. **Click en:** "Generate token"
7. **¡COPIA EL TOKEN INMEDIATAMENTE!** (ej: `ghp_xxxxxxxxxxxxxxxxxxxx`)

### Opción B: Usando SSH (Alternativa)

1. Genera una clave SSH si no tienes:
   ```bash
   ssh-keygen -t ed25519 -C "javiertarazon@gmail.com"
   ```
2. Agrega la clave pública a GitHub:
   - Ve a: https://github.com/settings/keys
   - Click en "New SSH key"
   - Pega el contenido de `~/.ssh/id_ed25519.pub`

---

## 🔑 PASO 3: Subir el Código al Repositorio Creado

### Si usas Token HTTPS (Opción A):

```bash
cd /workspace/mirofish-quant

# Remover remote anterior si existe
git remote remove origin 2>/dev/null || true

# Agregar remote con tu token
git remote add origin https://TUSUARIO:ghp_TU_TOKEN_AQUI@github.com/javiertarazon/mirofish-quant.git

# Renombrar branch a main
git branch -M main

# Subir todo
git push -u origin main --force
```

**Reemplaza:**
- `TUSUARIO` → Tu username de GitHub (no el email)
- `ghp_TU_TOKEN_AQUI` → El token que generaste

### Si usas SSH (Opción B):

```bash
cd /workspace/mirofish-quant

# Remover remote anterior si existe
git remote remove origin 2>/dev/null || true

# Agregar remote SSH
git remote add origin git@github.com:javiertarazon/mirofish-quant.git

# Renombrar branch a main
git branch -M main

# Subir todo
git push -u origin main --force
```

---

## ✅ VERIFICACIÓN

Después de subir, verifica en tu navegador:
https://github.com/javiertarazon/mirofish-quant

Deberías ver todos los archivos:
- ✅ README.md
- ✅ package.json
- ✅ prisma/schema.prisma
- ✅ src/index.js
- ✅ config/.env (¡cuidado! este tiene tus API keys)

---

## 🔒 SEGURIDAD: Proteger tus API Keys

El archivo `.env` contiene tus claves privadas. Tienes 2 opciones:

### Opción 1: No subir .env a GitHub (RECOMENDADO)

```bash
# Eliminar .env del último commit
cd /workspace/mirofish-quant
git reset HEAD~1
git add config/.env.example  # Si creas uno de ejemplo sin keys
git commit -m "feat: MiroFish Quant V4.1 (sin .env con keys)"
git push -u origin main --force
```

Luego crea `config/.env.example` SIN las keys reales:
```
NEWS_API_KEY=TU_CLAVE_AQUI
API_SPORTS_KEY=TU_CLAVE_AQUI
TELEGRAM_BOT_TOKEN=TU_TOKEN_AQUI
TELEGRAM_CHAT_ID=TU_CHAT_ID
DATABASE_URL=file:./dev.db
```

### Opción 2: Hacer el repositorio PRIVADO

Si ya subiste el `.env` con las keys:
1. Ve a: https://github.com/javiertarazon/mirofish-quant/settings
2. Scroll hasta "Danger Zone"
3. Click en "Change visibility"
4. Selecciona "Make private"
5. Confirma

---

## 📋 RESUMEN DE ARCHIVOS LISTOS PARA SUBIR

| Archivo | Estado | Contiene |
|---------|--------|----------|
| README.md | ✅ Listo | Documentación completa |
| package.json | ✅ Listo | Dependencias y scripts |
| prisma/schema.prisma | ✅ Listo | 9 tablas de BD |
| src/index.js | ✅ Listo | Punto de entrada principal |
| config/.env | ⚠️ Con keys | Tus API keys reales |
| .gitignore | ✅ Listo | Excluye node_modules, .env, etc. |

---

## 🎯 PRÓXIMOS PASOS DESPUÉS DE SUBIR

Una vez el repo esté en GitHub:

1. **Clona en tu máquina local:**
   ```bash
   git clone https://github.com/javiertarazon/mirofish-quant.git
   cd mirofish-quant
   ```

2. **Instala dependencias:**
   ```bash
   npm install
   ```

3. **Inicializa base de datos:**
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init_schema
   ```

4. **Configura tu Chat ID de Telegram:**
   - Abre tu bot en Telegram: busca `MiroFishSignalsBot`
   - Envía `/start`
   - Luego ve a: https://api.telegram.org/bot8280779815:AAFwJ6a9j9wLOH7ZghxAS_hElaJ_FAq2ros/getUpdates
   - Copia tu `"chat":{"id":XXXXXXXX}` y ponlo en `.env`

5. **¡Ejecuta el sistema!**
   ```bash
   npm start
   ```

---

## 🆘 SOPORTE

Si tienes problemas:

1. **Error de autenticación:** Usa un token nuevo desde https://github.com/settings/tokens
2. **Error de repositorio no encontrado:** Asegúrate de haberlo creado en github.com/new
3. **Error de permisos:** Verifica que el token tenga scope `repo` completo
4. **¿Olvidaste tu username de GitHub?** Ve a https://github.com/settings/profile

---

**¿Necesitas ayuda con algún paso específico? ¡Avísame!**
