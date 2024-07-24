import { Request, Response } from 'express';
import { find, findOne, insertOne, updateOne, deleteOne } from '../utils/dbComponent';
import { validateStrings } from '../utils/otherUtils';

export async function createGroup(req: Request, res: Response): Promise<Response> {
	const userId: string = req.body.user.userId;

	const name: string | undefined = req.body.name;
	const description: string = req.body.description || '';
	const memberUsers: string[] = req.body.members || [];
	const picture: string = req.body.picture || '';
	if (validateStrings([name, description, picture, ...memberUsers]))
		return res.status(400).json({ error: true, message: 'Invalid request' });

	const { error, message, result } = await find('users', { _id: { $in: memberUsers } });
	if (error) return res.status(500).json({ error: true, message });
	if (result.length !== memberUsers.length)
		return res.status(404).json({ error: true, message: 'Users not found' });

	const members = result.map((user: any) => user._id);

	const group = await insertOne('chats', {
		name,
		description,
		members: [userId, ...members],
		admins: [userId],
		picture: picture || ''
	});
	if (group.error) return res.status(500).json({ error: true, message: group.message });
	return res.status(200).json({ error: false, group: group.result });
}

export async function updateGroup(req: Request, res: Response): Promise<Response> {
	const { userId } = req.body.user;
	const { groupId } = req.body.group;

	const name: string | undefined = req.body.name;
	const description: string | undefined = req.body.description;
	const members: string[] | undefined = req.body.members;
	const admins: string[] | undefined = req.body.admins;
	const picture: string | undefined = req.body.picture;

	if (
		!(Array.isArray(members) || typeof members === 'undefined') ||
		!(Array.isArray(admins) || typeof admins === 'undefined') ||
		!(typeof name === 'string' || typeof name === 'undefined') ||
		!(typeof description === 'string' || typeof description === 'undefined') ||
		!(typeof picture === 'string' || typeof picture === 'undefined') ||
		!(
			Array.isArray(members) ||
			typeof name === 'string' ||
			typeof description === 'string' ||
			typeof picture === 'string'
		)
	) {
		return res.status(400).json({ error: true, message: 'Invalid request' });
	}

	const update: {
		name?: string;
		description?: string;
		members?: string[];
		admins?: string[];
		picture?: string;
	} = {};
	if (name) update.name = name;
	if (description) update.description = description;
	if (members) update.members = members;
	if (admins) update.admins = admins;
	if (picture) update.picture = picture;

	const group = await updateOne('chats', { _id: groupId, admins: userId }, update);
	if (group.error) return res.status(500).json({ error: true, message: group.message });
	return res.status(200).json({ error: false, group: group.result });
}

export async function deleteGroup(req: Request, res: Response): Promise<Response> {
	const { userId } = req.body.user;
	const { groupId } = req.query;
	const group = await deleteOne('chats', { _id: groupId, admins: userId });
	if (group.error) return res.status(500).json({ error: true, message: group.message });
	return res.status(200).json({ error: false, group: group.result });
}
