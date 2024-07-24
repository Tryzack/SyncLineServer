import { Socket } from 'socket.io';
import { findOne, insertOne, aggregateFind, find } from './utils/dbComponent';
import { secretKey } from '../index';
import jwt from 'jsonwebtoken';
import { insertChatMessage } from './utils/otherUtils';
import { validateStrings } from './utils/otherUtils';
import { ObjectId } from 'mongodb';
import { getfriends } from './utils/otherUtils';

const users: Map<string, Socket> = new Map();

export async function ioConnection(socket: Socket) {
	// Check if the user is authenticated
	const token: string = socket.handshake.auth.token;
	const authResult = await authenticate(token);

	if ('error' in authResult) {
		socket.emit('error', authResult.errorMessage);
		return socket.disconnect(true);
	}

	// Check if the user has friends
	const id: string = authResult.id;
	const username: string = authResult.username;
	const friends = await getfriends(id);

	if ('error' in friends) {
		socket.emit('error', friends.errorMessage);
		console.log('User disconnected', friends.errorMessage);
		return socket.disconnect(true);
	}

	const userData = await findOne('users', {
		_id: id,
		disabled: { isDisabled: false, timestamp: null }
	});

	if (userData.error) {
		socket.emit('error', userData.message);
		console.log('User disconnected', userData.message);
		return socket.disconnect(true);
	}

	if (!userData.result || Object.keys(userData.result).length === 0) {
		socket.emit('error', 'User not found');
		console.log('User disconnected', 'User not found');
		return socket.disconnect(true);
	}

	// Add user to the users map if the user is authenticated
	console.log('User connected');
	users.set(username, socket);

	// Tell friends (if any) that the user is connected
	for (const friend of friends.result) {
		const friendSocket = users.get(friend);
		if (friendSocket) {
			friendSocket.emit('user-connected', username);
			socket.emit('user-connected', friend);
		}
	}

	socket.on(
		'chat-message',
		async (data: { message: string; receiver: string; chat: string | null }) => {
			let { message, receiver, chat } = data;
			const timestamp = new Date().toISOString();

			if (!validateStrings([message, receiver, timestamp]))
				return socket.emit('error', 'Invalid request');
			message = message.trim();
			receiver = receiver.trim();

			const socketReceiver = users.get(receiver);
			if (socketReceiver)
				socketReceiver.emit('chat-message', {
					message,
					sender: username,
					timestamp
				});

			const result = await insertChatMessage(
				{
					message,
					messageType: 'text',
					sender: username,
					timestamp,
					receiver: receiver,
					user: true
				},
				chat
			);
			if (result.error) {
				socket.emit('error', result.errorMessage);
			}
			socket.emit('message-sent', { receiver, message, timestamp });
		}
	);

	socket.on('group-message', async (data: { message: string; chat: string }) => {
		// need changes
		try {
			let { message, chat } = data;
			const timestamp = new Date().toISOString();
			if (!validateStrings([message, chat, timestamp]))
				return socket.emit('error', 'Invalid request');

			message = message.trim();
			chat = chat.trim();

			const group = await aggregateFind('groups', [
				{
					$match: {
						_id: ObjectId.createFromHexString(chat),
						user: false
					}
				},
				{
					$lookup: {
						from: 'users',
						localField: 'members',
						foreignField: '_id',
						as: 'membersInfo'
					}
				},
				{
					$project: {
						membersInfo: {
							$map: {
								input: '$membersInfo',
								as: 'member',
								in: {
									username: '$$member.username'
								}
							}
						}
					}
				}
			]);
			if (group.error) return socket.emit('error', group.message);

			if (group.result.length === 0) return socket.emit('error', 'Group not found');

			const members: Array<{ username: string }> = group.result.membersInfo;
			for (const member of members) {
				const socketMember = users.get(member.username);
				if (socketMember)
					socketMember.emit('group-message', {
						message,
						sender: username,
						timestamp
					});
			}
			const result = await insertChatMessage(
				{
					message,
					messageType: 'text',
					sender: username,
					receiver: group.result._id,
					timestamp,
					user: false
				},
				chat
			);
			if (result.error) {
				socket.emit('error', result.errorMessage);
			}

			socket.emit('message-sent', { chat, message, timestamp });
		} catch (error) {
			console.error('Error sending group message', error);
			socket.emit('error', 'Error sending group message');
		}
	});

	socket.on('disconnect', () => {
		users.delete(username);
		for (const friend of friends.result) {
			const friendSocket = users.get(friend);
			if (friendSocket) {
				friendSocket.emit('user-disconnected', username);
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
