# Guia para actualizar GitHub - MiroFish Quant V5

## Repositorio remoto

Repositorio configurado:

```bash
origin https://github.com/javiertarazon/Mirofish-quant-polymarket-zai.git
```

El repositorio ya existe. No uses `git push --force` salvo que quieras sobrescribir historial de forma deliberada.

## Seguridad antes de subir

- No subir `.env`.
- No subir `config/.env`.
- No subir claves privadas, tokens de Telegram, tokens de GitHub ni wallets.
- Si una clave fue publicada alguna vez, rotarla antes de usar el sistema.

`.gitignore` ya excluye `node_modules/`, `.env`, `config/.env`, bases SQLite locales y el cliente generado de Prisma.

## Actualizar el repositorio

```bash
git status -sb
npm test
git add -A
git commit -m "Document and publish MiroFish Quant V5"
git push origin main
```

## Instalacion desde cero

```bash
git clone https://github.com/javiertarazon/Mirofish-quant-polymarket-zai.git
cd Mirofish-quant-polymarket-zai
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev --name init_schema
RUN_ONCE=true npm start
```

## Dashboard

```bash
npm run dashboard
```

Abre `http://127.0.0.1:3000`. El dashboard permite monitoreo y ejecución manual de ciclos `shadow`.

## Documentacion incluida

- `README.md`: entrada rapida del proyecto.
- `docs/REQUIREMENTS.md`: requisitos tecnicos, variables, comandos y seguridad.
- `docs/SYSTEM_OVERVIEW.md`: explicacion completa de arquitectura, flujo, agentes, persistencia y dashboard.
- `.env.example` y `config/.env.example`: plantillas sin secretos.

## Autenticacion

Si `git push` pide credenciales:

- Usa un Personal Access Token con permiso `repo` para HTTPS.
- O cambia el remoto a SSH y registra tu clave en GitHub.

```bash
git remote set-url origin git@github.com:javiertarazon/Mirofish-quant-polymarket-zai.git
```
