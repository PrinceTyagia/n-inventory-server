import express from "express"
import dotenv from 'dotenv'
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerFile from "./swagger-output.json"
import swaggerUi from 'swagger-ui-express';
import connectDB from "./db/database"

const app = express();
dotenv.config();
connectDB()
// hello

// CORS Configuration
app.use(
  cors({
    origin: ['http://localhost:3000', 'https://n-inventory-frontend.vercel.app'],
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type', 'orgid'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);

// Middleware Setup
app.use(express.json()); 
app.use(cookieParser()); 

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));
app.get('/docs-json', (req, res) => {
  res.json(swaggerFile);
});

import healthRouter from "./routes/health"
import authRouter from "./routes/auth.routes"
import orgRouter from "./routes/orgainsation.routes"
import userRouter from "./routes/user.routes"
import locRouter from "./routes/loactions.routes"
import roleRouter from "./routes/role.routes"
app.use('/api/v1', healthRouter);
app.use("/api/v1/",authRouter)
app.use("/api/v1/",orgRouter)
app.use("/api/v1/",userRouter)
app.use("/api/v1/",locRouter)
app.use("/api/v1/",roleRouter)


const PORT = process.env.AUTH_SERVICE_PORT || 8000;

app.listen(PORT, () => {
    console.log(`✅ Auth Service is running on port ${PORT}`);
    console.log(`📄 Swagger docs available at: http://localhost:${PORT}/api-docs`);
  });

