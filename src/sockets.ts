import { Socket } from "socket.io";
import { findOne, find } from "./utils/dbComponent";
import { secretKey } from "../index";
import jwt from "jsonwebtoken";

const users: Map<string, Socket> = new Map();

export async function ioConnection(socket: Socket) {
	console.log("User is trying to connect");
	const token: string = socket.handshake.auth.token;
	const authResult = await authenticate(token);

	if ("error" in authResult) {
		socket.emit("error", authResult.errorMessage);
		return socket.disconnect(true);
	}
	const id: string = authResult.id;
	const username: string = authResult.username;
	const contacts = await getContacts(id);

	if ("error" in contacts) {
		socket.emit("error", contacts.errorMessage);
		return socket.disconnect(true);
	}
	console.log("User connected");
	users.set(username, socket);

	for (const contact of contacts.result) {
		const contactSocket = users.get(contact);
		if (contactSocket) {
			contactSocket.emit("user-connected", username);
		}
	}

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
		for (const contact of contacts.result) {
			const contactSocket = users.get(contact);
			if (contactSocket) {
				contactSocket.emit("user-disconnected", username);
			}
		}
	});
}

async function authenticate(token: string): Promise<{ error: boolean; errorMessage: string } | { username: string; id: string }> {
	if (!token || typeof token !== "string") {
		return { error: true, errorMessage: "Invalid request" };
	}

	let userId: string = "";
	let authResult: boolean = false;
	jwt.verify(token, secretKey, (err: any, decoded: any) => {
		if (err) {
			authResult = true;
		} else {
			userId = decoded.userId;
		}
	});

	if (authResult) {
		return { error: true, errorMessage: "Invalid token" };
	}

	const { error, message, result } = await findOne("users", { _id: userId });
	if (error) {
		return { error: true, errorMessage: message };
	}

	if (!result || Object.keys(result).length === 0) {
		return { error: true, errorMessage: "User not found" };
	}

	return { username: result.username, id: userId };
}

async function getContacts(userId: string): Promise<{ error: boolean; errorMessage: string } | { result: Array<string> }> {
	const { error, message, result } = await findOne("users", { _id: userId });
	if (error) {
		return { error: true, errorMessage: message };
	}

	if (!result || Object.keys(result).length === 0) {
		return { error: true, errorMessage: "User not found" };
	}
	return { result: result.contacts };
}
