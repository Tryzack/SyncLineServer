import express, { Express, Request, Response } from "express";
import cookieParser from "cookie-parser";
import { randomBytes } from "crypto";
import cors from "cors";
import router from "./src/routes/routes";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";

dotenv.config();

export const secretKey: string = randomBytes(32).toString("hex");
export const expiresIn: string = "6h";

const port: number = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const app: Express = express();
app.use(cookieParser())
	.use(cors())
	.use(express.json())
	.use(express.urlencoded({ extended: true }))
	.use(router);

const server = http.createServer(app);
export const io = new Server(server);

server.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});
