import { Request, Response } from 'express';
import { validateStrings } from '../../utils/otherUtils';
import { findOne, updateOne } from '../../utils/dbComponent';

export async function editProfile(req: Request, res: Response) {
	const userId = req.body.user.userId;
	if (!userId) {
		return res.status(401).json({ error: true, message: 'I have no idea how you got here' });
	}
	let { username, email, url } = req.body;

	if (!validateStrings([email, url, username])) {
		return res.status(400).json({ error: true, message: 'Invalid input type' });
	}

	const { error, message, result } = await findOne('users', { _id: userId });
	if (error) {
		return res.status(500).json({ error: true, message });
	}

	if (!result || Object.keys(result).length === 0) {
		return res.status(404).json({ error: true, message: 'User not found' });
	}

	const checkUser = await findOne('users', {
		_id: { $ne: userId },
		$or: [{ email }, { username }]
	});

	if (checkUser.result && Object.keys(checkUser.result).length > 0) {
		return res.status(400).json({ error: true, message: 'Email or username already in use' });
	}

	const { error: updateError, message: updateMessage } = await updateOne(
		'users',
		{ _id: userId },
		{
			$set: {
				username,
				email,
				url
			}
		}
	);
	if (updateError) {
		return res.status(500).json({ error: true, message: updateMessage });
	}
	return res.status(200).json({ error: false, message: 'Profile updated successfully' });
}
