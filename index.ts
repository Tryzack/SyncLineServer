import express, { Express, Request, Response } from "express";
import cookieParser from "cookie-parser";
import { randomBytes } from "crypto";
import cors from "cors";
import router from "./src/routes/routes";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import { ioConnection } from "./src/sockets";

dotenv.config();

export const secretKey: string = process.env.SECRET_KEY || randomBytes(32).toString("hex");
export const expiresIn: string = "6h";

const port: number = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const app: Express = express();
app.use(cookieParser())
	.use(cors())
	.use(express.json())
	.use(express.urlencoded({ extended: true }))
	.use(router);

const server = http.createServer(app);
export const io = new Server(server, {
	cors: {
		origin: "http://localhost:3000",
		credentials: true,
	},
});

io.on("connection", ioConnection);

server.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});
