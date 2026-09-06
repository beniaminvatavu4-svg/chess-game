# Chess Game — Linkuri utile

## 🎮 Flux de joc (stream)

1. **Tu (Alb/Host)** → deschizi `/host`, creezi meciul, dai click „Joacă ca Alb"
2. **Adversarul (Negru)** → deschide `/join`, intră automat în jocul tău curent
3. **Spectatorii** → deschid `/watch`, văd tabla live

---

## 🌐 Producție (Railway)

| Rol | Link |
|-----|------|
| **Host** — creezi meciul | https://chess-game-production-6550.up.railway.app/host |
| **Adversar (Negru)** — join automat | https://chess-game-production-6550.up.railway.app/join |
| **Spectatori** — watch live | https://chess-game-production-6550.up.railway.app/watch |

## 💻 Local (development)

| Rol | Link |
|-----|------|
| **Host** | http://localhost:4200/host |
| **Adversar (Negru)** | http://localhost:4200/join |
| **Spectatori** | http://localhost:4200/watch |

---

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
