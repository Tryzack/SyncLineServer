import { Socket } from 'socket.io';
import { findOne, insertOne, aggregateFind } from './utils/dbComponent';
import { secretKey } from '../index';
import jwt from 'jsonwebtoken';
import { Message } from './utils/interfaces';
import { validateStrings } from './utils/otherUtils';

const users: Map<string, Socket> = new Map();

export async function ioConnection(socket: Socket) {
	// Check if the user is authenticated
	const token: string = socket.handshake.auth.token;
	const authResult = await authenticate(token);

	if ('error' in authResult) {
		socket.emit('error', authResult.errorMessage);
		return socket.disconnect(true);
	}

	// Check if the user has contacts
	const id: string = authResult.id;
	const username: string = authResult.username;
	const contacts = await getContacts(id);

	if ('error' in contacts) {
		socket.emit('error', contacts.errorMessage);
		return socket.disconnect(true);
	}

	// Add user to the users map if the user is authenticated
	console.log('User connected');
	users.set(username, socket);

	// Tell contacts (if any) that the user is connected
	for (const contact of contacts.result) {
		const contactSocket = users.get(contact);
		if (contactSocket) {
			contactSocket.emit('user-connected', username);
		}
	}

	const messages = await aggregateFind('messages', [
		{
			$match: {
				sender: username
			}
		},
		{
			$sort: {
				timestamp: 1
			}
		},
		{
			$group: {
				_id: '$receiver',
				message: { $first: '$message' },
				timestamp: { $first: '$timestamp' },
				user: { $first: '$user' },
				sender: { $first: '$sender' }
			}
		},
		{
			$limit: 10
		}
	]);

	console.log(messages); // not implemented yet

	socket.on(
		'chat-message',
		async (data: { message: string; receiver: string; timestamp: string }) => {
			let { message, receiver, timestamp } = data;

			if (!validateStrings([message, receiver, timestamp]))
				return socket.emit('error', 'Invalid request');

			const userReceiver = await findOne('users', { username: receiver });
			if (userReceiver.error) {
				socket.emit('error', { message: userReceiver.message });
				return;
			}

			const socketReceiver = users.get(receiver.trim());
			if (socketReceiver)
				socketReceiver.emit('chat-message', {
					message,
					sender: username,
					timestamp,
					senderData: {
						username,
						picture: userReceiver.result.picture,
						description: userReceiver.result.description
					}
				});

			const result = await insertMessage({
				message,
				messageType: 'text',
				sender: username,
				receiver,
				timestamp,
				user: true
			});
			if (result.error) {
				socket.emit('error', result.errorMessage);
			}
			socket.emit('message-sent', { receiver, message, timestamp });
		}
	);

	socket.on(
		'group-message',
		async (data: { message: string; receiver: string; timestamp: string }) => {
			const { message, receiver, timestamp } = data;
			if (!validateStrings([message, receiver, timestamp]))
				return socket.emit('error', 'Invalid request');

			const group = await findOne('groups', { _id: receiver });
			if (group.error) {
				socket.emit('error', group.message);
				return;
			}

			const members = group.result.members;
			for (const member of members) {
				const socketMember = users.get(member);
				if (socketMember)
					socketMember.emit('group-message', {
						message,
						sender: username,
						timestamp,
						senderData: {
							username,
							pcture: group.result.picture,
							description: group.result.description
						}
					});
			}

			const result = await insertMessage({
				message,
				messageType: 'text',
				sender: username,
				receiver,
				timestamp,
				user: false
			});
			if (result.error) {
				socket.emit('error', result.errorMessage);
			}
			socket.emit('message-sent', { receiver, message, timestamp });
		}
	);

	socket.on('disconnect', () => {
		users.delete(username);
		for (const contact of contacts.result) {
			const contactSocket = users.get(contact);
			if (contactSocket) {
				contactSocket.emit('user-disconnected', username);
			}
		}
	});
}

// Authenticate the user
async function authenticate(
	token: string
): Promise<{ error: boolean; errorMessage: string } | { username: string; id: string }> {
	if (!token || typeof token !== 'string') {
		return { error: true, errorMessage: 'Invalid request' };
	}

	let userId: string = '';
	let authResult: boolean = false;
	jwt.verify(token, secretKey, (err: any, decoded: any) => {
		if (err) {
			authResult = true;
		} else {
			userId = decoded.userId;
		}
	});

	if (authResult) {
		return { error: true, errorMessage: 'Invalid token' };
	}

	const { error, message, result } = await findOne('users', { _id: userId });
	if (error) {
		return { error: true, errorMessage: message };
	}

	if (!result || Object.keys(result).length === 0) {
		return { error: true, errorMessage: 'User not found' };
	}

	return { username: result.username, id: userId };
}

// Get contacts of the user
async function getContacts(
	userId: string
): Promise<{ error: boolean; errorMessage: string } | { result: Array<string> }> {
	const { error, message, result } = await findOne('users', { _id: userId });
	if (error) {
		return { error: true, errorMessage: message };
	}

	if (!result || Object.keys(result).length === 0) {
		return { error: true, errorMessage: 'User not found' };
	}
	return { result: result.contacts };
}

// Insert message into the database
async function insertMessage(message: Message) {
	const { error, message: errorMessage } = await insertOne('messages', {
		message: message.message,
		messageType: message.messageType, // text, image, video, audio, file
		timestamp: message.timestamp,
		sender: message.sender,
		receiver: message.receiver, // username or group Id
		user: message.user // true if it is a user message, false if it is a group message
	});
	if (error) {
		return { error: true, errorMessage };
	}
	return { error: false };
}
