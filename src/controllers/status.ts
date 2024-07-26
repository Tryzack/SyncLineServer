import { Request, Response } from 'express';
import { aggregateFind, findOne, complexUpdateOne } from '../utils/dbComponent';
import { validateStrings } from '../utils/otherUtils';
import { v4 } from 'uuid';

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
		id: v4(),
		content,
		description,
		timestamp: new Date().toISOString()
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

	// create a timeout to delete the status after a certain time
	const timer: number = 1000 * 60 * 60 * 24; // 24 hours
	const devTimer: number = 1000 * 60 * 1; // 1 minute
	setTimeout(async () => {
		const deleteResult = await complexUpdateOne(
			'users',
			{
				_id: userId
			},
			{
				$pull: {
					status
				}
			}
		);

		if (deleteResult.error) {
			console.error(deleteResult.message);
		}
	}, timer);

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
				username: { $in: [result.result.username, ...friends] } // In case of the user and their friends
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
			$unwind: {
				path: '$status',
				preserveNullAndEmptyArrays: true
			}
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

	if (statuses.error) {
		return res.status(500).json({
			error: true,
			message: statuses.message
		});
	}

	return res.status(200).json({
		error: false,
		statuses: statuses.result
	});
}
