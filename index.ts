// imports
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import router from './src/routes/routes';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import { ioConnection } from './src/sockets';
import * as serviceAccountKey from './serviceAccountKey.json';
import FirebaseComponent from './src/utils/firebaseComponent';
import { Mailer } from './src/utils/mailerComponent';
import { randomBytes } from 'crypto';
import { getClient } from './src/utils/dbComponent';

dotenv.config();

// Firebase initialization
export const firebaseComponent: FirebaseComponent = new FirebaseComponent(
	serviceAccountKey,
	process.env.BUCKET_URL || ''
);
console.log('Firebase initialized');

// Mailer initialization
export const mailer: Mailer = new Mailer(process.env.EMAIL || '', process.env.PASSWORD || '');
console.log('Mailer initialized');

// Secret key and expiry time initialization
export const secretKey: string = process.env.SECRET_KEY || randomBytes(32).toString('hex');
export const expiresIn: string = process.env.EXPIRES_IN || '1h';
console.log('Secret key and expiry time set');

// Database connection
export const client = getClient().then((client) => {
	if (!client) {
		throw new Error('Database connection failed');
	} else {
		console.log('Database connected');
	}
});

// Server initialization
const port: number = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const app: Express = express();

// Middlewares initialization
app.use(cookieParser())
	.use(cors())
	.use(express.json())
	.use(express.urlencoded({ extended: true }))
	.use(router);

// Socket initialization
const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		origin: 'http://localhost:3000',
		credentials: true
	}
});

// Socket configuration
io.on('connection', ioConnection);

// Server listening
server.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});
