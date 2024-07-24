import { Request, Response } from 'express';
import { findOne, complexUpdateOne } from '../utils/dbComponent';
import { validateStrings } from '../utils/otherUtils';

export async function getFriends(req: Request, res: Response): Promise<Response> {
	const result = await findOne('users', {
		_id: req.body.user.userId
	});
	if (result.error) {
		return res.status(500).json({
			error: true,
			message: result.message
		});
	}
	if (!result.result || Object.keys(result.result).length === 0) {
		return res.status(404).json({
			error: true,
			message: 'User not found'
		});
	}
	return res.status(200).json({
		error: false,
		friends: result.result.friends
	});
}

export async function addFriend(req: Request, res: Response): Promise<Response> {
	const result = await findOne('users', {
		_id: req.body.user.userId
	});
	if (result.error) {
		return res.status(500).json({
			error: true,
			message: result.message
		});
	}
	if (!result.result || Object.keys(result.result).length === 0) {
		return res.status(404).json({
			error: true,
			message: 'User not found'
		});
	}

	const friend = req.body.friend;
	if (!validateStrings([friend])) {
		return res.status(400).json({
			error: true,
			message: 'Invalid input type'
		});
	}

	const {
		error,
		message,
		result: user
	} = await findOne('users', {
		username: friend
	});
	if (error) {
		return res.status(500).json({
			error: true,
			message
		});
	}

	if (!user || Object.keys(user).length === 0) {
		return res.status(404).json({
			error: true,
			message: 'User not found'
		});
	}
	// check if already friends
	if (result.result.friends.includes(friend)) {
		return res.status(400).json({
			error: true,
			message: 'Already friends'
		});
	}

	await complexUpdateOne(
		'users',
		{
			_id: req.body.user.userId
		},
		{
			$push: {
				friends: friend
			}
		}
	);

	return res.status(200).json({
		error: false,
		message: 'Friend added successfully'
	});
}

export async function deleteFriend(req: Request, res: Response): Promise<Response> {
	const result = await findOne('users', {
		_id: req.body.user.userId
	});
	if (result.error) {
		return res.status(500).json({
			error: true,
			message: result.message
		});
	}
	if (!result.result || Object.keys(result.result).length === 0) {
		return res.status(404).json({
			error: true,
			message: 'User not found'
		});
	}

	const friend = req.body.friend;
	if (!validateStrings([friend])) {
		return res.status(400).json({
			error: true,
			message: 'Invalid input type'
		});
	}

	await complexUpdateOne(
		'users',
		{
			_id: req.body.user.userId
		},
		{
			$pull: {
				friends: friend
			}
		}
	);

	return res.status(200).json({
		error: false,
		message: 'Friend deleted successfully'
	});
}
