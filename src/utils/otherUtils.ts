import { Message } from './interfaces';
import { insertOne, find, findOne, aggregateFind } from './dbComponent';
import { ObjectId } from 'mongodb';
/**
 * Function to validate an array of strings
 * @param strArray {Array<string>} - array of strings to validate
 * @returns {boolean} - true if all strings are valid, false otherwise
 */
export function validateStrings(strArray: Array<any>): boolean {
	for (const str of strArray) {
		if (typeof str !== 'string' || str.trim().length === 0) {
			return false;
		}
	}
	return true;
}

export async function getfriends(
	userId: string
): Promise<{ error: boolean; errorMessage: string } | { result: Array<string> }> {
	const { error, message, result } = await findOne('users', { _id: userId });
	if (error) {
		return { error: true, errorMessage: message };
	}

	if (!result || Object.keys(result).length === 0) {
		return { error: true, errorMessage: 'User not found' };
	}
	return { result: result.friends };
}

export async function getChatMessages(limit: number = 20, chat: string) {
	const { error, result, message } = await find(
		'messages',
		{
			chatId: chat
		},
		limit
	);
	if (error) {
		return { error: true, errorMessage: message };
	}
	return { error: false, messages: result };
}

export async function insertChatMessage(
	message: Message,
	chat: string
): Promise<{ error: boolean; errorMessage?: string }> {
	// Insert message into the databas
	const {
		error,
		message: errorMessage,
		result
	} = await insertOne('messages', {
		message: message.message,
		type: message.type, // text, image, video, audio, file
		timestamp: message.timestamp,
		sender: message.sender
	});
	if (error) {
		return { error: true, errorMessage };
	}

	insertOne('chat-messages', {
		chatId: ObjectId.createFromHexString(chat),
		messageId: result.insertedId
	});

	return { error: false };
}
