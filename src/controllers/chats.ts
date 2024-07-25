import { Request, Response } from 'express';
import { findOne, aggregateFind, find, insertOne, deleteMany } from '../utils/dbComponent';
import { ObjectId } from 'mongodb';

export async function getChats(req: Request, res: Response) {
	const memberId: string = req.body.user.userId;

	try {
		const chats = await aggregateFind('chats', [
			{
				$match: { members: ObjectId.createFromHexString(memberId) } // Match chats where the member is part of chat
			},
			{
				$lookup: {
					from: 'chat-messages',
					localField: '_id',
					foreignField: 'chatId',
					as: 'message'
				}
			},
			{
				$project: {
					members: 1,
					user: 1,
					name: 1,
					description: 1,
					url: 1,
					message: { $slice: ['$message', 1] } // Limit to the first 1 messages
				}
			},
			{
				$unwind: { path: '$messages', preserveNullAndEmptyArrays: true }
			},
			{
				$lookup: {
					from: 'messages',
					localField: 'message.messageId',
					foreignField: '_id',
					as: 'message.messageContent'
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
					_id: 1,
					user: 1,
					name: 1,
					description: 1,
					url: 1,
					members: {
						$map: {
							input: '$membersInfo',
							as: 'member',
							in: {
								username: '$$member.username',
								url: '$$member.url'
							}
						}
					},
					'message.messageContent': 1
				}
			}
		]);
		if (chats.error) {
			return res.status(500).json({ error: true, errorMessage: chats.message });
		}

		return res.status(200).json(chats);
	} catch (error) {
		return res.status(500).json({ error: true, errorMessage: error });
	}
}

export async function getChatMessages(req: Request, res: Response) {
	const chatId: string = req.query.chat as string;
	const limit: number = parseInt(req.query.limit as string) || 50;
	const skip: number = parseInt(req.query.skip as string) || 0;

	try {
		const chat = await aggregateFind('chats', [
			{
				$match: {
					_id: ObjectId.createFromHexString(chatId)
				}
			},
			{
				$lookup: {
					from: 'chat-messages',
					localField: '_id',
					foreignField: 'chatId',
					as: 'messages'
				}
			},
			{
				$unwind: { path: '$messages', preserveNullAndEmptyArrays: true }
			},
			{
				$lookup: {
					from: 'messages',
					localField: 'messages.messageId',
					foreignField: '_id',
					as: 'messageContent'
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
				$lookup: {
					from: 'users',
					localField: 'admins',
					foreignField: '_id',
					as: 'adminsInfo'
				}
			},
			{
				$project: {
					_id: 1,
					user: 1,
					name: 1,
					description: 1,
					admins: {
						$map: {
							input: '$adminsInfo',
							as: 'admin',
							in: '$$admin.username'
						}
					},
					members: {
						$map: {
							input: '$membersInfo',
							as: 'member',
							in: {
								username: '$$member.username'
							}
						}
					},
					messageContent: '$messageContent'
				}
			},
			{
				$sort: {
					'messageContent.timestamp': -1
				}
			},
			{
				$group: {
					_id: '$_id',
					user: { $first: '$user' },
					members: { $first: '$members' },
					admins: { $first: '$admins' },
					messages: { $push: '$messageContent' },
					name: { $first: '$name' },
					description: { $first: '$description' }
				}
			},
			{
				$project: {
					_id: 1,
					user: 1,
					name: 1,
					description: 1,
					admins: 1,
					members: 1,
					messages: { $slice: ['$messages', skip, limit] }
				}
			}
		]);
		if (chat.error) {
			return res.status(500).json({ error: true, errorMessage: chat.message });
		}
		return res.status(200).json(chat);
	} catch (error) {
		return res.status(500).json({ error: true, errorMessage: error });
	}
}

export async function createChat(req: Request, res: Response) {
	const userId: string = req.body.user.userId;
	const member: string = req.body.member; // username

	try {
		const { error, message, result } = await findOne('users', { username: member });
		if (error) return res.status(500).json({ error: true, errorMessage: message });

		if (!result || Object.keys(result).length === 0)
			return res.status(404).json({ error: true, errorMessage: 'User not found' });

		const chat = await insertOne('chats', {
			members: [ObjectId.createFromHexString(userId), result._id],
			user: true
		});
		if (chat.error) return res.status(500).json({ error: true, errorMessage: chat.message });

		return res.status(200).json({
			error: false,
			message: 'Chat created successfully',
			chatId: chat.result.insertedId
		});
	} catch (error) {
		return res.status(500).json({ error: true, errorMessage: error });
	}
}

export async function deleteChat(req: Request, res: Response) {
	const userId: string = req.body.user.userId;
	const chatId: string = req.body.chatId;
	//find chat, chat-messages where chatId = chatId, and delete messages using the id from chat-messages, then delete chat and chat-messages
	try {
		const chat = await findOne('chats', {
			_id: chatId,
			members: ObjectId.createFromHexString(userId)
		});
		if (chat.error) return res.status(500).json({ error: true, errorMessage: chat.message });
		if (!chat.result || Object.keys(chat.result).length === 0)
			return res.status(404).json({ error: true, errorMessage: 'Chat not found' });

		const chatMessages = await find('chat-messages', { chatId: chatId });
		if (chatMessages.error)
			return res.status(500).json({ error: true, errorMessage: chatMessages.message });

		const deleteMessages = await deleteMany('messages', {
			_id: {
				$in: chatMessages.result.map((message: any) =>
					ObjectId.createFromHexString(message.messageId)
				)
			}
		});
		if (deleteMessages.error)
			return res.status(500).json({ error: true, errorMessage: deleteMessages.message });

		const deleteChatMessages = await deleteMany('chat-messages', {
			chatId: ObjectId.createFromHexString(chatId)
		});
		if (deleteChatMessages.error)
			return res.status(500).json({ error: true, errorMessage: deleteChatMessages.message });

		const deleteChat = await deleteMany('chats', { _id: chatId });
		if (deleteChat.error)
			return res.status(500).json({ error: true, errorMessage: deleteChat.message });

		return res.status(200).json({ error: false, message: 'Chat deleted successfully' });
	} catch (error) {
		return res.status(500).json({ error: true, errorMessage: error });
	}
}
