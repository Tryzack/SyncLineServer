import { Request, Response } from 'express';
import {
	find,
	findOne,
	insertOne,
	updateOne,
	deleteOne,
	complexUpdateOne,
	aggregateFind
} from '../utils/dbComponent';
import { validateStrings } from '../utils/otherUtils';
import { ObjectId } from 'mongodb';
import { lookup } from 'dns';

export async function createGroup(req: Request, res: Response): Promise<Response> {
	const userId: string = req.body.user.userId;

	const name: string | undefined = req.body.name;
	const description: string = req.body.description || '';
	const memberUsers: string[] = req.body.members || [];
	const picture: string = req.body.picture || null;
	if (!validateStrings([name, description, ...memberUsers]))
		return res.status(400).json({ error: true, message: 'Invalid request' });

	let error,
		message,
		result = [];
	if (memberUsers.length > 0) {
		const userResult = await find('users', { username: { $in: memberUsers } });
		error = userResult.error;
		message = userResult.message;
		result = userResult.result;
	}
	if (error) return res.status(500).json({ error: true, message });
	if (result.length !== memberUsers.length)
		return res.status(404).json({ error: true, message: 'Users not found' });

	console.log(result);
	const members = result.map((user: any) => user._id);

	const group = await insertOne('chats', {
		name,
		description,
		members: [ObjectId.createFromHexString(userId), ...members],
		admins: [ObjectId.createFromHexString(userId)],
		url: picture,
		user: false
	});
	if (group.error) return res.status(500).json({ error: true, message: group.message });
	return res.status(200).json({ error: false, group: group.result });
}

export async function updateGroup(req: Request, res: Response): Promise<Response> {
	const { userId } = req.body.user;
	const { groupId } = req.body;
	const name: string | undefined = req.body.name;
	const description: string | undefined = req.body.description;
	const picture: string | undefined = req.body.picture;

	if (
		!(typeof name === 'string' || typeof name === 'undefined') ||
		!(typeof description === 'string' || typeof description === 'undefined') ||
		!(typeof picture === 'string' || typeof picture === 'undefined')
	) {
		return res.status(400).json({ error: true, message: 'Invalid request' });
	}

	const update: {
		name?: string;
		description?: string;
		members?: string[];
		admins?: string[];
		url?: string;
	} = {};
	if (name) update.name = name;
	if (description) update.description = description;
	if (picture) update.url = picture;

	/* const checkGroup = await findOne('chats', {
		_id: ObjectId.createFromHexString(groupId),
		admins: ObjectId.createFromHexString(userId)
	}); */
	const group = await updateOne(
		'chats',
		{ _id: groupId, admins: ObjectId.createFromHexString(userId) },
		update
	);
	if (group.error) return res.status(500).json({ error: true, message: group.message });
	return res.status(200).json({ error: false, group: group.result });
}

export async function deleteGroup(req: Request, res: Response): Promise<Response> {
	const { userId } = req.body.user;
	const { groupId } = req.query;
	const group = await deleteOne('chats', {
		_id: groupId,
		admins: ObjectId.createFromHexString(userId)
	});
	if (group.error) return res.status(500).json({ error: true, message: group.message });
	return res.status(200).json({ error: false, group: group.result });
}

export async function addMembers(req: Request, res: Response): Promise<Response> {
	const { userId } = req.body.user;
	const { groupId } = req.body;
	const { members } = req.body; // array of ids
	if (!Array.isArray(members))
		return res.status(400).json({ error: true, message: 'Invalid request' });

	const group = await findOne('chats', {
		_id: groupId,
		admins: ObjectId.createFromHexString(userId)
	});
	if (group.error) return res.status(500).json({ error: true, message: group.message });
	if (!group.result || Object.keys(group.result).length === 0)
		return res.status(404).json({ error: true, message: 'Group not found' });
	const ObjectIdsFromMebers = members.map((member: string) =>
		ObjectId.createFromHexString(member)
	);
	// check if member is already in group
	const membersInGroup = group.result.members.map((member: any) => member.toString());
	const membersToAdd = ObjectIdsFromMebers.filter(
		(member) => !membersInGroup.includes(member.toString())
	);

	if (membersToAdd.length === 0)
		return res.status(400).json({ error: true, message: 'Members already in group' });

	const update = await complexUpdateOne(
		'chats',
		{ _id: groupId },
		{ $push: { members: { $each: membersToAdd } } }
	);
	if (update.error) return res.status(500).json({ error: true, message: update.message });
	return res.status(200).json({ error: false, group: update.result });
}

export async function removeMember(req: Request, res: Response): Promise<Response> {
	const { userId } = req.body.user;
	const { groupId, member } = req.body;
	const group = await findOne('chats', {
		_id: groupId,
		admins: ObjectId.createFromHexString(userId)
	});
	if (group.error) return res.status(500).json({ error: true, message: group.message });
	if (!group.result || Object.keys(group.result).length === 0)
		return res.status(404).json({ error: true, message: 'Group not found' });

	const user = await findOne('users', { username: member });
	if (user.error) return res.status(500).json({ error: true, message: user.message });
	if (!user.result || Object.keys(user.result).length === 0)
		return res.status(404).json({ error: true, message: 'User not found' });
	const memberId = user.result._id;

	const update = await complexUpdateOne(
		'chats',
		{ _id: groupId },
		{ $pull: { members: memberId } }
	);
	if (update.error) return res.status(500).json({ error: true, message: update.message });
	return res.status(200).json({ error: false, group: update.result });
}

export async function getGroups(req: Request, res: Response): Promise<Response> {
	const { userId } = req.body.user;
	const groups = await aggregateFind('chats', [
		{
			$match: {
				admins: ObjectId.createFromHexString(userId),
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
				_id: 1,
				name: 1,
				membersInfo: 1
			}
		}
	]);
	if (groups.error) return res.status(500).json({ error: true, message: groups.message });
	return res.status(200).json({ error: false, groups: groups.result });
}
