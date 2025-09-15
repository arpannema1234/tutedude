# Deployment Guide

## Quick Deploy Setup

### Frontend (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
cd frontend
vercel

# Configure environment variables in Vercel dashboard:
# VITE_API_URL=https://your-backend-url.com
```

### Backend (Railway/Heroku)

#### Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy backend
cd backend
railway login
railway init
railway up
```

#### Heroku

```bash
# Install Heroku CLI
npm install -g heroku

# Deploy backend
cd backend
heroku create tutedude-proctoring-api
git push heroku main
```

### Database (MongoDB Atlas)

1. Create account at https://mongodb.com/atlas
2. Create new cluster
3. Get connection string
4. Update MONGODB_URI in environment variables

### Environment Variables

#### Backend (.env)

```env
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tutedude_proctoring
NODE_ENV=production
```

#### Frontend (Vercel)

```env
VITE_API_URL=https://your-backend-url.com
```

## Demo Deployment Links

-   **Live Demo**: [https://tutedude-proctoring.vercel.app](https://tutedude-proctoring.vercel.app)
-   **Backend API**: [https://tutedude-proctoring-api.railway.app](https://tutedude-proctoring-api.railway.app)
-   **GitHub Repository**: [https://github.com/username/tutedude-proctoring](https://github.com/username/tutedude-proctoring)

## Performance Optimization

### Frontend

-   Code splitting with React.lazy()
-   MediaPipe/TensorFlow.js CDN loading
-   Canvas rendering optimization
-   Webpack bundle optimization

### Backend

-   MongoDB indexing for sessions
-   Compression middleware
-   Request rate limiting
-   File upload size limits

## Monitoring & Analytics

### Error Tracking

-   Frontend: Sentry integration
-   Backend: Winston logging
-   Database: MongoDB Atlas monitoring

### Performance Metrics

-   Video processing FPS
-   Detection accuracy rates
-   API response times
-   User session analytics
