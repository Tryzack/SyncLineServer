import { Socket } from "socket.io";
import { io } from "../index";
import { findOne } from "./utils/dbComponent";
import { secretKey } from "../index";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

const users = new Map();

io.on("connection", async (socket: Socket) => {
	const token: string = socket.handshake.auth.token;
	const { error, result } = await authenticate(token);
	if (error) {
		socket.emit("error", result);
		return socket.disconnect(true);
	}
	const username: string = result;
	users.set(username, socket);

	socket.on("send-chat-message", (data: { messageType: string; message: string; receiverUsername: string; timestamp: string }) => {
		const { messageType, message, receiverUsername, timestamp } = data;
		if (
			!messageType ||
			!message ||
			!receiverUsername ||
			!timestamp ||
			typeof messageType !== "string" ||
			typeof message !== "string" ||
			typeof receiverUsername !== "string" ||
			typeof timestamp !== "string"
		) {
			socket.emit("error", "Invalid request");
			return;
		}

		const receiver = users.get(receiverUsername.trim());

		if (!receiver) {
			socket.emit("error", "Receiver not found");
			return;
		}

		receiver.emit("chat-message", { messageType, message, senderUsername: username, timestamp });
	});

	socket.on("disconnect", () => {
		users.delete(username);
		socket.broadcast.emit("user-disconnected", username);
	});
});

async function authenticate(token: string): Promise<{ error: boolean; result: string }> {
	if (!token || typeof token !== "string") {
		return { error: true, result: "Invalid request" };
	}

	let userId: string = "";

	jwt.verify(token, secretKey, (err: any, decoded: any) => {
		if (err) {
			return { error: true, result: "Access denied" };
		} else {
			userId = decoded.userId;
		}
	});

	const { error, message, result } = await findOne("users", { _id: ObjectId.createFromHexString(userId) });
	if (error) {
		return { error: true, result: message };
	}

	if (!result || Object.keys(result).length === 0) {
		return { error: true, result: "User not found" };
	}

	return { error: false, result: result.username };
}
