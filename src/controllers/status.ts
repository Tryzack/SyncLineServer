import { Request, Response } from 'express';
import { aggregateFind, findOne, complexUpdateOne } from '../utils/dbComponent';
import { validateStrings } from '../utils/otherUtils';

export async function createStatus(req: Request, res: Response) {
	const { userId } = req.body.user;
	const { content, description } = req.body;

	if (!validateStrings([content, description])) {
		return res.status(400).json({
			error: true,
			message: 'Invalid request'
		});
	}

	const status = {
		content,
		description,
		timestamp: new Date()
	};

	const result = await complexUpdateOne(
		'users',
		{
			_id: userId
		},
		{
			$push: {
				status
			}
		}
	);

	if (result.error) {
		return res.status(500).json({
			error: true,
			message: result.message
		});
	}

	return res.status(200).json({
		error: false,
		message: 'Status created'
	});
}

export async function getStatus(req: Request, res: Response) {
	const { userId } = req.body.user;

	const result = await findOne('users', {
		_id: userId
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

	const friends = result.result.friends;

	const statuses = await aggregateFind('users', [
		{
			$match: {
				username: { $in: friends } // Assuming 'friends' contains the user IDs of friends
			}
		},
		{
			$project: {
				_id: 1,
				username: 1,
				url: 1,
				status: 1
			}
		},
		{
			$unwind: '$status'
		},
		{
			$replaceRoot: {
				newRoot: {
					$mergeObjects: [{ username: '$username', url: '$url' }, { status: '$status' }]
				}
			}
		},
		{
			$group: {
				_id: '$username',
				url: { $first: '$url' },
				statuses: { $push: '$status' }
			}
		},
		{
			$project: {
				_id: 0,
				username: '$_id',
				url: 1,
				statuses: 1
			}
		}
	]);
}
