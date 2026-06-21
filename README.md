# Chess Game — Linkuri utile

## 🌐 Producție (Railway)

| Rol | Link |
|-----|------|
| **Host** — creezi o cameră nouă | https://chess-game-production-6550.up.railway.app/host |
| **Spectate** — urmărești ultimul meci (auto) | https://chess-game-production-6550.up.railway.app/spectate |
| **Jucător 2** — primit prin QR de la host | https://chess-game-production-6550.up.railway.app/play/{roomId}?token={token} |
| **Audience** — vot public | https://chess-game-production-6550.up.railway.app/audience/{roomId} |
| **Spectate cameră specifică** | https://chess-game-production-6550.up.railway.app/spectate/{roomId} |

## 💻 Local (development)

| Rol | Link |
|-----|------|
| **Host** | http://localhost:4200/host |
| **Spectate** (auto ultimul meci) | http://localhost:4200/spectate |
| **Jucător 2** | http://localhost:4200/play/{roomId}?token={token} |
| **Audience** | http://localhost:4200/audience/{roomId} |

## 🚀 Cum pornești local

```bash
# Backend
cd backend && npm run dev

# Frontend (alt terminal)
cd frontend && ng serve
```

## 🚢 Deploy

```bash
railway up --service chess-game
```
