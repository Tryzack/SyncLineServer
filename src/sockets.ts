import { Socket } from 'socket.io';
import { findOne, insertOne, aggregateFind } from './utils/dbComponent';
import { secretKey } from '../index';
import jwt from 'jsonwebtoken';

const users: Map<string, Socket> = new Map();

/**
 *  Message interface
 * @param message {string} - message content
 * @param timestamp {string} - message timestamp
 * @param sender {string} - user who sent the message
 * @param receiver {string} - username or group Id of the receiver
 * @param user {boolean} - true if it is a user message, false if it is a group message
 */
interface message {
	message: string;
	timestamp: string;
	sender: string;
	receiver: string;
	user: boolean;
}

export async function ioConnection(socket: Socket) {
	const token: string = socket.handshake.auth.token;
	const authResult = await authenticate(token);

	if ('error' in authResult) {
		socket.emit('error', authResult.errorMessage);
		return socket.disconnect(true);
	}
	const id: string = authResult.id;
	const username: string = authResult.username;
	const contacts = await getContacts(id);

	if ('error' in contacts) {
		socket.emit('error', contacts.errorMessage);
		return socket.disconnect(true);
	}
	console.log('User connected');
	users.set(username, socket);

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

	socket.on(
		'chat-message',
		async (data: { message: string; receiver: string; timestamp: string }) => {
			const { message, receiver, timestamp } = data;
			if (
				!message ||
				!receiver ||
				!timestamp ||
				typeof message !== 'string' ||
				typeof receiver !== 'string' ||
				typeof timestamp !== 'string'
			) {
				socket.emit('error', 'Invalid request');
				return;
			}

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
			if (
				!message ||
				!receiver ||
				!timestamp ||
				typeof message !== 'string' ||
				typeof receiver !== 'string' ||
				typeof timestamp !== 'string'
			) {
				socket.emit('error', 'Invalid request');
				return;
			}

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

async function insertMessage(message: message) {
	const { error, message: errorMessage } = await insertOne('messages', {
		message: message.message,
		timestamp: message.timestamp,
		sender: message.sender,
		receiver: message.receiver,
		user: message.user
	});
	if (error) {
		return { error: true, errorMessage };
	}
	return { error: false };
}
