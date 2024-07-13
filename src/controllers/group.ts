import { Request, Response } from 'express';
import { find, findOne, insertOne, updateOne, deleteOne } from '../utils/dbComponent';

export async function getGroups(req: Request, res: Response): Promise<Response> {
	const { userId } = req.body.user;
	const groups = await find('groups', { members: userId });
	if (groups.error) return res.status(500).json({ error: true, message: groups.message });
	return res.status(200).json({ error: false, groups: groups.result });
}

export async function getGroup(req: Request, res: Response): Promise<Response> {
	const { userId } = req.body.user;
	const { groupId } = req.query;
	const group = await findOne('groups', { _id: groupId, members: userId });
	if (group.error) return res.status(500).json({ error: true, message: group.message });
	return res.status(200).json({ error: false, group: group.result });
}

export async function createGroup(req: Request, res: Response): Promise<Response> {
	const userId: string = req.body.user.userId;

	const name: string | undefined = req.body.name;
	const description: string = req.body.description || '';
	const members: string[] = req.body.members || [];
	const picture: string = req.body.picture || '';
	if (
		!Array.isArray(members) ||
		!name ||
		!(typeof name === 'string') ||
		!(typeof description === 'string') ||
		!(typeof picture === 'string')
	)
		return res.status(400).json({ error: true, message: 'Invalid request' });

	const group = await insertOne('groups', {
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
	const { groupId } = req.query;
	const name: string | undefined = req.body.name;
	const description: string | undefined = req.body.description;
	const members: string[] | undefined = req.body.members;
	const picture: string | undefined = req.body.picture;
	if (
		!(Array.isArray(members) || typeof members === 'undefined') ||
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
		picture?: string;
	} = {};
	if (name) update.name = name;
	if (description) update.description = description;
	if (members) update.members = members;
	if (picture) update.picture = picture;

	const group = await updateOne('groups', { _id: groupId, admins: userId }, update);
	if (group.error) return res.status(500).json({ error: true, message: group.message });
	return res.status(200).json({ error: false, group: group.result });
}

export async function deleteGroup(req: Request, res: Response): Promise<Response> {
	const { userId } = req.body.user;
	const { groupId } = req.query;
	const group = await deleteOne('groups', { _id: groupId, admins: userId });
	if (group.error) return res.status(500).json({ error: true, message: group.message });
	return res.status(200).json({ error: false, group: group.result });
}
