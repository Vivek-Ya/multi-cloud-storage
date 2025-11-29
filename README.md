# Multi-Cloud Storage

Multi-Cloud Storage is a production-ready platform for connecting Google Drive, Microsoft OneDrive, and Dropbox accounts, giving teams a single pane of glass for browsing, uploading, moving, and securing files across providers. The application ships with polished branding, a neon night theme, resilient notifications, analytics, and an opinionated developer experience for running locally or in production.

---

## Feature Overview

- Unified dashboard that aggregates storage usage, account health, and recent activity per provider
- OAuth 2.0 sign-in for Google, Microsoft, and Dropbox with server-side token storage and automatic refresh
- Rich file manager with grid and list layouts, drag and drop uploads, bulk operations, folder creation, rename, move, download, and star toggles
- Global search across providers with type filters, quick actions, and smart empty states
- Storage analytics that surface quota utilization, provider breakdowns, and starred item counts
- Real-time notifications, contextual toasts, and progress indicators backed by Material UI and custom theming
- Full light and night mode support using CSS variables and provider color accents
- Centralized asset pipeline (`frontend/src/assets/logos/`) for app and provider branding

---

## Architecture Overview

- **Frontend**: React 19 with Create React App, React Router, Context API for auth/cloud state, Material UI components, and a custom drag-and-drop zone backed by `react-dropzone`.
- **Backend**: Spring Boot 3 application with Spring Security, Spring Data JPA, and dedicated services for Google Drive, OneDrive, and Dropbox.
- **Database**: MySQL persists users, linked accounts, file metadata, and analytics snapshots.
- **Integrations**: Google Drive REST API, Microsoft Graph API, and Dropbox API for file CRUD, folder management, and quota retrieval.
- **Security**: JWT-based session tokens, encrypted provider refresh tokens, and structured logging for traceability.

```
[ Browser (React App) ] <-> [ Spring Boot API ] <-> [ MySQL ]
                                      |
        [ Google Drive ]   [ OneDrive / Graph ]   [ Dropbox ]
```

---

## Technology Stack

- React 19, Create React App, Material UI, React Router, Axios, react-dropzone
- Java 17, Spring Boot 3, Spring Security, Spring Data JPA, OAuth 2.0 Client
- MySQL 8.x, Maven Wrapper, JUnit 5, Mockito, React Testing Library

---

## Getting Started

### Prerequisites

- Java 17+
- Node.js 18+
- Maven Wrapper (bundled as `./mvnw`)
- MySQL (local instance or remote connection string)
- OAuth credentials for Google, Microsoft, and Dropbox providers

### Backend Setup

```bash
cd backend
./mvnw spring-boot:run
```

Configure database credentials and OAuth secrets either in `src/main/resources/application.properties` or by exporting environment variables (see Configuration). The default profile uses `spring.jpa.hibernate.ddl-auto=update` to manage schema changes automatically.

To build a production jar:

```bash
./mvnw -DskipTests package
```

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

The development server proxies API requests to `http://localhost:8080/api`. For a production build run `npm run build` and serve the contents of the generated `frontend/build` directory.

---

## Configuration

### Backend Environment Variables

```bash
export SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/multicloud_storage
export SPRING_DATASOURCE_USERNAME=your_db_user
export SPRING_DATASOURCE_PASSWORD=your_db_password

export JWT_SECRET=your_jwt_secret
export JWT_EXPIRATION=86400000
export JWT_REFRESH_EXPIRATION=604800000

export GOOGLE_CLIENT_ID=your_google_client_id
export GOOGLE_CLIENT_SECRET=your_google_client_secret

export ONEDRIVE_CLIENT_ID=your_onedrive_client_id
export ONEDRIVE_CLIENT_SECRET=your_onedrive_client_secret

export DROPBOX_CLIENT_ID=your_dropbox_client_id
export DROPBOX_CLIENT_SECRET=your_dropbox_client_secret
```

Set redirect URIs in each provider console to `http://localhost:8080/oauth2/callback/{provider}` for local development. For deployment, mirror the domain of your backend service.

### Frontend Environment Variables (`frontend/.env`)

```
REACT_APP_API_BASE_URL=http://localhost:8080/api
```

---

## Provider Configuration Cheatsheet

- **Google Cloud Console**: Create OAuth credentials (web application), enable Google Drive API, add redirect URIs, download the client secret JSON, and map to the environment variables above.
- **Microsoft Azure Portal**: Register an application, configure delegated permissions for Microsoft Graph (Files.ReadWrite.All, offline_access), add redirect URIs, generate a client secret.
- **Dropbox App Console**: Create a scoped app with Full Dropbox access, generate the app key/secret, and allow `http://localhost:8080/oauth2/callback/dropbox` as a redirect URI.

---

## Key Workflows

1. **User onboarding**: Sign up and log in to receive access and refresh tokens for subsequent API calls.
2. **Link providers**: Launch OAuth for Google, Microsoft, or Dropbox. Refresh tokens are stored server-side and refreshed automatically when needed.
3. **Explore files**: Browse using grid or list views, filter by provider, search across clouds, and open context menus for actions.
4. **Manage content**: Drag and drop uploads into folders, rename or move files, star important documents, and manage folders end-to-end.
5. **Bulk operations**: Multi-select files for delete or move and monitor progress via toast notifications.
6. **Analytics**: Review usage breakdowns, quota trends, and starred item counts on the dashboard analytics tab.

---

## API Surface

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/api/auth/signup` | Register a new account |
| POST | `/api/auth/login` | Authenticate and issue JWT tokens |
| POST | `/api/auth/refresh` | Exchange a refresh token for a new access token |
| POST | `/api/auth/logout` | Invalidate the refresh token |
| POST | `/api/auth/change-password` | Update the current user's password |
| GET | `/api/cloud-accounts` | List linked cloud accounts with quota summaries |
| POST | `/api/cloud-accounts/{accountId}/folder` | Create a folder in the target cloud |
| GET | `/api/cloud-accounts/{accountId}/files` | Retrieve files and folders for the account |
| GET | `/api/cloud-accounts/files/{fileId}/download` | Stream a file download |
| POST | `/api/cloud-accounts/{accountId}/upload` | Upload a file (supports optional folder path) |
| PUT | `/api/cloud-accounts/files/{fileId}/rename` | Rename an existing file |
| PUT | `/api/cloud-accounts/files/{fileId}/move` | Move a file within the provider |
| DELETE | `/api/cloud-accounts/files/{fileId}` | Delete a file |
| DELETE | `/api/cloud-accounts/files/batch` | Delete multiple files at once |
| PUT | `/api/cloud-accounts/files/{fileId}/star` | Toggle star status |
| GET | `/api/cloud-accounts/search` | Search files across providers |
| GET | `/api/cloud-accounts/analytics` | Fetch aggregated storage analytics |
| DELETE | `/api/cloud-accounts/{accountId}` | Disconnect a cloud provider |
| GET | `/oauth2/authorize/{provider}` | Start an OAuth authorization code flow |
| GET | `/oauth2/callback/{provider}` | OAuth callback endpoint |

Refer to the controllers in `backend/src/main/java/com/multicloud/controller` for request/response contracts. DTOs live in `backend/src/main/java/com/multicloud/dto`.

---

## Testing

- **Backend**: `cd backend && ./mvnw test`
- **Frontend**: `cd frontend && npm test`

Add integration or end-to-end coverage as needed; testing defaults use JUnit 5 on the backend and React Testing Library on the frontend.

---

## Deployment

### Backend (Render + GHCR)

1. Enable the `Backend Docker Image` workflow (`.github/workflows/backend-docker.yml`) to publish `ghcr.io/<github-org-or-user>/multi-cloud-backend:latest` on every push to `main`.
2. Create a new Web Service in Render by importing `render.yaml`. Select the `multicloud-backend` service; Render will build directly from `backend/Dockerfile`.
3. Connect the generated Render _Standard MySQL_ database (`multicloud-db`). The blueprint wires `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, and `DB_PASSWORD` automatically.
4. Populate the remaining secrets (`JWT_SECRET`, OAuth client details, `CORS_ALLOWED_ORIGINS`, etc.) in the Render dashboard.
5. After the first deployment completes, run smoke tests against a simple authenticated flow (e.g., `POST /api/auth/login`) and confirm the dashboard renders via the hosted frontend.

### Frontend (Render Static Site)

1. The `render.yaml` blueprint provisions the `multicloud-frontend` static site. Import the blueprint or create the service manually with `npm install && npm run build` and publish `frontend/build`.
2. Set `REACT_APP_API_BASE_URL` to the HTTPS URL of the deployed backend (e.g., `https://multicloud-backend.onrender.com/api`).
3. Rebuild the static site whenever backend endpoints change; Render can auto-deploy on push with the included build filter.

### Common Checklist

- Update OAuth redirect URIs to match the Render hostname of the backend.
- Rotate secrets regularly and keep database backups enabled.
- Configure custom domains and HTTPS in Render before go-live.
---

## Troubleshooting

- `NoSuchElementException` while starting with `mvn spring-boot : run`: remove the space and run `./mvnw spring-boot:run`.
- `AccessDeniedException` on OAuth callback: confirm redirect URIs and ensure HTTPS is used in production.
- Port conflicts on `3000` or `8080`: use `npx kill-port 3000` or `lsof -i :8080` to terminate stale processes.
- Drag and drop uploads not triggering: verify browser supports the File System Access API and that `Content-Length` limits are adequate in `application.properties`.
- Provider quotas out of sync: trigger a manual refresh from the analytics panel or call `/api/cloud-accounts/analytics` after re-authenticating the provider.

---

## Project Status

All core milestones are complete:

- [x] Authentication, authorization, and JWT session management
- [x] Full Google Drive, OneDrive, and Dropbox parity (upload, rename, move, delete, folders)
- [x] Cross-provider search, analytics, and starring
- [x] Drag and drop uploads with progress monitoring
- [x] Multi-select batch operations
- [x] Automated unit and integration test coverage
- [x] Production-ready logging configuration and documentation

Future enhancements will be tracked in GitHub issues.

---

Happy shipping!
