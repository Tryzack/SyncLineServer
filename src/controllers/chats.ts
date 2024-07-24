import { Request, Response } from 'express';
import { findOne, aggregateFind, find, insertOne } from '../utils/dbComponent';
import { ObjectId } from 'mongodb';

export async function getChats(req: Request, res: Response) {
	const memberId: string = req.body.user.userId;
	console.log(memberId);

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
					message: { $slice: ['$message', 1] } // Limit to the first 1 messages
				}
			},
			{
				$unwind: '$message'
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
				$unwind: '$messages'
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
				$project: {
					_id: 1,
					user: 1,
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
					messages: { $push: '$messageContent' }
				}
			},
			{
				$project: {
					_id: 1,
					user: 1,
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